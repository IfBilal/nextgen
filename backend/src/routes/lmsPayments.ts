import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import type Stripe from 'stripe'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { stripe, createPaymentIntent, getOrCreateStripeCustomer, createMonthlySubscription } from '../lib/stripe.js'
import { notifyStudent } from '../lib/notify.js'
import { env } from '../config/env.js'

export const lmsPaymentsRouter = Router()

// ─── POST /api/v1/payments/checkout ─────────────────────────────────────────
const checkoutSchema = z.object({
  productId:   z.string().uuid(),
  classId:     z.string().uuid().optional(),
  plan:        z.enum(['upfront', 'installment']),
  couponCode:  z.string().optional(),
})

lmsPaymentsRouter.post('/payments/checkout', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = checkoutSchema.parse(req.body)
      const studentId = req.auth!.userId

      const { data: product } = await supabaseServiceClient
        .from('lms_products').select('*').eq('id', parsed.productId).eq('is_active', true).single()
      if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found or inactive.')

      const basePrice = parsed.plan === 'upfront'
        ? Number(product.upfront_price)
        : Number(product.installment_amount)

      let amountPaid = basePrice
      let couponId: string | null = null

      if (parsed.couponCode) {
        const { data: coupon } = await supabaseServiceClient
          .from('lms_coupons')
          .select('*')
          .ilike('code', parsed.couponCode)
          .eq('is_active', true)
          .single()

        if (coupon) {
          const valid =
            (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
            (coupon.max_uses === null || coupon.uses_count < coupon.max_uses) &&
            (coupon.product_id === null || coupon.product_id === parsed.productId)

          if (valid) {
            couponId = coupon.id
            if (coupon.discount_type === 'percentage') {
              amountPaid = amountPaid * (1 - Number(coupon.discount_value) / 100)
            } else {
              amountPaid = Math.max(0, amountPaid - Number(coupon.discount_value))
            }
          }
        }
      }

      amountPaid = Math.round(amountPaid * 100) / 100

      // Check lms_enrollments (not orders) — orders are payment records; enrollment is the access source of truth
      const { data: existingEnrollment } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('lms_classes!inner(product_id)')
        .eq('student_id', studentId)
        .eq('lms_classes.product_id', parsed.productId)
        .is('demo_expires_at', null)
        .maybeSingle()

      if (existingEnrollment) throw new HttpError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this program.')

      const { data: order, error: orderError } = await supabaseServiceClient
        .from('lms_orders')
        .insert({
          student_id: studentId,
          product_id: parsed.productId,
          plan: parsed.plan,
          amount_paid: amountPaid,
          coupon_id: couponId,
          status: 'pending',
        })
        .select().single()

      if (orderError || !order) throw new HttpError(500, 'ORDER_FAILED', orderError?.message ?? 'Failed to create order.')

      let clientSecret: string
      let subscriptionId: string | null = null

      if (parsed.plan === 'installment') {
        // Installment: Stripe Subscription for recurring monthly billing
        const { data: profile } = await supabaseServiceClient
          .from('profiles').select('email').eq('id', studentId).single()
        if (!profile?.email) throw new HttpError(400, 'NO_EMAIL', 'Student email not found.')

        const customerId = await getOrCreateStripeCustomer(studentId, profile.email)
        const result = await createMonthlySubscription(
          customerId,
          Math.round(amountPaid * 100),
          { studentId, productId: parsed.productId, orderId: order.id, installmentMonths: product.installment_months ?? 1 }
        )
        subscriptionId = result.subscriptionId
        clientSecret = result.clientSecret

        await supabaseServiceClient
          .from('lms_orders')
          .update({ stripe_subscription_id: subscriptionId })
          .eq('id', order.id)
      } else {
        // Upfront: single payment intent
        clientSecret = await createPaymentIntent(Math.round(amountPaid * 100), {
          studentId,
          productId: parsed.productId,
          orderId: order.id,
        })
      }

      // Dev mode: auto-enroll immediately when no real webhook is configured
      if (env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder') {
        await supabaseServiceClient
          .from('lms_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString(), total_collected: amountPaid })
          .eq('id', order.id)

        let targetClassId: string | null = null
        if (parsed.classId) {
          const { data: cls } = await supabaseServiceClient
            .from('lms_classes').select('id').eq('id', parsed.classId).eq('product_id', parsed.productId).single()
          if (cls) targetClassId = cls.id
        }
        if (!targetClassId) {
          const { data: cls } = await supabaseServiceClient
            .from('lms_classes').select('id').eq('product_id', parsed.productId).limit(1).single()
          if (cls) targetClassId = cls.id
        }
        if (targetClassId) {
          await supabaseServiceClient
            .from('lms_enrollments')
            .upsert({ student_id: studentId, class_id: targetClassId, demo_expires_at: null }, { onConflict: 'student_id,class_id' })
          await supabaseServiceClient
            .from('lms_orders').update({ class_id: targetClassId }).eq('id', order.id)
        }
        if (couponId) {
          const { data: couponRow } = await supabaseServiceClient
            .from('lms_coupons').select('uses_count').eq('id', couponId).single()
          if (couponRow) {
            await supabaseServiceClient
              .from('lms_coupons').update({ uses_count: couponRow.uses_count + 1 }).eq('id', couponId)
          }
        }
        await notifyStudent({
          studentId,
          type: 'enrollment_confirmed',
          title: 'Enrollment Confirmed',
          body: 'Your payment was successful. You are now enrolled in your class.',
          classId: targetClassId ?? undefined,
        })
        return res.status(200).json({ clientSecret, orderId: order.id, enrolled: true })
      }

      return res.status(200).json({ clientSecret, orderId: order.id, enrolled: false })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/payments/webhook ──────────────────────────────────────────
// Registered before express.json() in app.ts with raw body middleware
export async function webhookHandler(req: Request, res: Response) {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      req.headers['stripe-signature'] as string,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return res.status(400).send('Webhook signature verification failed')
  }

  // ── Upfront: one-time payment confirmed ─────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent & { invoice?: string | null }
    // Skip if this intent belongs to a subscription invoice (handled by invoice.paid)
    if (intent.invoice) return res.json({ received: true })

    const orderId   = intent.metadata['orderId']
    const studentId = intent.metadata['studentId']
    const productId = intent.metadata['productId']
    if (!orderId || !studentId || !productId) return res.json({ received: true })

    const { data: upfrontOrder } = await supabaseServiceClient
      .from('lms_orders').select('amount_paid').eq('id', orderId).single()

    await supabaseServiceClient
      .from('lms_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: intent.id,
        total_collected: Number(upfrontOrder?.amount_paid ?? 0),
      })
      .eq('id', orderId)

    const { data: cls } = await supabaseServiceClient
      .from('lms_classes').select('id').eq('product_id', productId).limit(1).single()

    if (cls) {
      await supabaseServiceClient
        .from('lms_enrollments')
        .upsert({ student_id: studentId, class_id: cls.id, demo_expires_at: null }, { onConflict: 'student_id,class_id' })
      await supabaseServiceClient
        .from('lms_orders').update({ class_id: cls.id }).eq('id', orderId)
    }

    const { data: orderRow } = await supabaseServiceClient
      .from('lms_orders').select('coupon_id').eq('id', orderId).single()
    if (orderRow?.coupon_id) {
      const { data: couponRow } = await supabaseServiceClient
        .from('lms_coupons').select('uses_count').eq('id', orderRow.coupon_id).single()
      if (couponRow) {
        await supabaseServiceClient
          .from('lms_coupons').update({ uses_count: couponRow.uses_count + 1 }).eq('id', orderRow.coupon_id)
      }
    }

    await notifyStudent({
      studentId,
      type: 'enrollment_confirmed',
      title: 'Enrollment Confirmed',
      body: 'Your payment was successful. You are now enrolled in your class.',
      classId: cls?.id,
    })
  }

  // ── Installment: monthly invoice paid ────────────────────────────────────────
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null; next_payment_attempt?: number | null }
    const rawSub = invoice.subscription
    const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub as { id: string } | null)?.id ?? null
    if (!subscriptionId) return res.json({ received: true })

    const { data: order } = await supabaseServiceClient
      .from('lms_orders')
      .select('id, student_id, product_id, coupon_id, status, amount_paid, total_collected')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    if (!order) return res.json({ received: true })

    const isFirstPayment = order.status !== 'paid'
    const newTotal = Number(order.total_collected ?? 0) + Number(order.amount_paid)

    await supabaseServiceClient
      .from('lms_orders')
      .update({
        status: 'paid',
        total_collected: newTotal,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    const { data: cls } = await supabaseServiceClient
      .from('lms_classes').select('id').eq('product_id', order.product_id).limit(1).single()

    if (cls) {
      // Restore access if it was revoked (re-enroll on successful payment)
      await supabaseServiceClient
        .from('lms_enrollments')
        .upsert({ student_id: order.student_id, class_id: cls.id, demo_expires_at: null }, { onConflict: 'student_id,class_id' })
      if (isFirstPayment) {
        await supabaseServiceClient
          .from('lms_orders').update({ class_id: cls.id }).eq('id', order.id)
      }
    }

    if (isFirstPayment && order.coupon_id) {
      const { data: couponRow } = await supabaseServiceClient
        .from('lms_coupons').select('uses_count').eq('id', order.coupon_id).single()
      if (couponRow) {
        await supabaseServiceClient
          .from('lms_coupons').update({ uses_count: couponRow.uses_count + 1 }).eq('id', order.coupon_id)
      }
    }

    if (isFirstPayment) {
      await notifyStudent({
        studentId: order.student_id,
        type: 'enrollment_confirmed',
        title: 'Enrollment Confirmed',
        body: 'Your first installment was successful. You are now enrolled in your class.',
        classId: cls?.id,
      })
    }
  }

  // ── Installment: payment failed — revoke access ──────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null; next_payment_attempt?: number | null }
    // Only revoke when Stripe has exhausted all retries (no more retry scheduled)
    if (invoice.next_payment_attempt != null) return res.json({ received: true })

    const rawSub2 = invoice.subscription
    const subscriptionId = typeof rawSub2 === 'string' ? rawSub2 : (rawSub2 as { id: string } | null)?.id ?? null
    if (!subscriptionId) return res.json({ received: true })

    const { data: order } = await supabaseServiceClient
      .from('lms_orders')
      .select('id, student_id, product_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()
    if (!order) return res.json({ received: true })

    // Cancel the Stripe subscription
    await stripe.subscriptions.cancel(subscriptionId)

    // Update order status
    await supabaseServiceClient
      .from('lms_orders')
      .update({ status: 'refunded' })
      .eq('id', order.id)

    // Remove enrollment — student loses class access
    const { data: cls } = await supabaseServiceClient
      .from('lms_classes').select('id').eq('product_id', order.product_id).limit(1).single()
    if (cls) {
      await supabaseServiceClient
        .from('lms_enrollments')
        .delete()
        .eq('student_id', order.student_id)
        .eq('class_id', cls.id)
    }

    await notifyStudent({
      studentId: order.student_id,
      type: 'enrollment_confirmed',
      title: 'Access Revoked — Payment Failed',
      body: 'Your installment payment could not be collected after multiple attempts. Your class access has been removed. Please re-enroll to regain access.',
      classId: cls?.id,
    })
  }

  // ── Subscription cancelled externally (e.g. admin in Stripe dashboard) ───────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const { data: order } = await supabaseServiceClient
      .from('lms_orders')
      .select('id, student_id, product_id, status')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    if (!order || order.status !== 'paid') return res.json({ received: true })

    await supabaseServiceClient
      .from('lms_orders')
      .update({ status: 'refunded' })
      .eq('id', order.id)

    const { data: cls } = await supabaseServiceClient
      .from('lms_classes').select('id').eq('product_id', order.product_id).limit(1).single()
    if (cls) {
      await supabaseServiceClient
        .from('lms_enrollments')
        .delete()
        .eq('student_id', order.student_id)
        .eq('class_id', cls.id)
    }

    await notifyStudent({
      studentId: order.student_id,
      type: 'enrollment_confirmed',
      title: 'Subscription Cancelled',
      body: 'Your installment subscription has been cancelled and your class access has been removed.',
      classId: cls?.id,
    })
  }

  return res.json({ received: true })
}
