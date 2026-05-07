import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { checkDemoAccess } from '../middleware/checkDemoAccess.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { stripe } from '../lib/stripe.js'
import { notifyStudent } from '../lib/notify.js'

export const lmsStudentRouter = Router()

// ─── GET /api/v1/student/classes ─────────────────────────────────────────────
lmsStudentRouter.get('/student/classes', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      // Expire access for cancelled orders whose access_until has passed
      const { data: expiredOrders } = await supabaseServiceClient
        .from('lms_orders')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('status', 'cancelled')
        .lt('access_until', new Date().toISOString())
        .not('class_id', 'is', null)

      if (expiredOrders?.length) {
        const expiredClassIds = expiredOrders.map(o => o.class_id).filter(Boolean)
        await supabaseServiceClient
          .from('lms_enrollments')
          .update({ demo_expires_at: new Date().toISOString() })
          .eq('student_id', studentId)
          .in('class_id', expiredClassIds)
          .is('demo_expires_at', null)
      }

      const { data: enrollments, error } = await supabaseServiceClient
        .from('lms_enrollments')
        .select(`
          class_id, enrolled_at, demo_expires_at,
          lms_classes!inner(
            id, name, description, default_duration_minutes,
            lms_products!inner(id, name),
            lms_teacher_profiles!inner(id)
          )
        `)
        .eq('student_id', studentId)
        .or(`demo_expires_at.is.null,demo_expires_at.gt.${new Date().toISOString()}`)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const classIds = (enrollments ?? []).map(e => e.class_id)

      const { data: sessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, zoom_meeting_id, zoom_join_url, recording_url, missed_reason, created_at')
        .in('class_id', classIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })

      type SessionRow = NonNullable<typeof sessions>[number]
      const nextSessionByClass: Record<string, SessionRow> = {}
      ;(sessions ?? []).forEach(s => {
        if (!nextSessionByClass[s.class_id]) nextSessionByClass[s.class_id] = s
      })

      const teacherIds = [...new Set((enrollments ?? []).map(e => (e.lms_classes as any).lms_teacher_profiles?.id).filter(Boolean))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles').select('id, full_name').in('id', teacherIds)
      const { data: teacherProfiles } = await supabaseServiceClient
        .from('lms_teacher_profiles').select('id, profile_picture_url').in('id', teacherIds)

      const nameMap: Record<string, string> = {}
      const photoMap: Record<string, string | null> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })
      ;(teacherProfiles ?? []).forEach(t => { photoMap[t.id] = t.profile_picture_url })

      const mapSession = (s: SessionRow | null) => s ? {
        id: s.id, classId: s.class_id, scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes, status: s.status,
        meetingLink: s.zoom_join_url ?? s.zoom_meeting_id, recordingUrl: s.recording_url,
        missedReason: s.missed_reason, createdAt: s.created_at,
      } : null

      const result = (enrollments ?? []).map(e => {
        const cls = e.lms_classes as any
        const teacherId = cls.lms_teacher_profiles?.id
        return {
          id: cls.id, name: cls.name, description: cls.description,
          productId: cls.lms_products?.id, productName: cls.lms_products?.name ?? '',
          teacherId, teacherName: nameMap[teacherId] ?? '', teacherPhoto: photoMap[teacherId] ?? null,
          defaultDurationMinutes: cls.default_duration_minutes,
          nextSession: mapSession(nextSessionByClass[e.class_id] ?? null),
          enrolledAt: e.enrolled_at, demoExpiresAt: e.demo_expires_at,
        }
      })

      return res.status(200).json({ classes: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId ────────────────────────────────────
lmsStudentRouter.get('/student/classes/:classId', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('student_id', studentId).eq('class_id', req.params.classId).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data: cls, error } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, name, description, default_duration_minutes, lms_products!inner(id, name), lms_teacher_profiles!inner(id)')
        .eq('id', req.params.classId)
        .single()

      if (error || !cls) throw new HttpError(404, 'NOT_FOUND', 'Class not found.')

      const teacherId = (cls.lms_teacher_profiles as any).id
      const [{ data: profile }, { data: tp }] = await Promise.all([
        supabaseServiceClient.from('profiles').select('full_name').eq('id', teacherId).single(),
        supabaseServiceClient.from('lms_teacher_profiles').select('profile_picture_url').eq('id', teacherId).single(),
      ])

      return res.status(200).json({
        class: {
          id: cls.id, productId: (cls.lms_products as any).id,
          name: cls.name, description: cls.description,
          productName: (cls.lms_products as any).name,
          teacherId, teacherName: profile?.full_name ?? '',
          teacherPhoto: tp?.profile_picture_url ?? null,
          defaultDurationMinutes: cls.default_duration_minutes,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/student/sessions/:sessionId/join ───────────────────────────
lmsStudentRouter.post('/student/sessions/:sessionId/join', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId
      const { sessionId } = req.params

      const { data: session, error: sErr } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, status, zoom_join_url, zoom_meeting_id, attendance_count')
        .eq('id', sessionId)
        .single()
      if (sErr || !session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (!['scheduled', 'live'].includes(session.status)) throw new HttpError(400, 'NOT_AVAILABLE', 'Session is not available to join.')

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('student_id', studentId).eq('class_id', session.class_id).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      // Check if already marked present to avoid double-counting
      const { data: existing } = await supabaseServiceClient
        .from('lms_attendance_records')
        .select('id, status')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .single()

      if (!existing) {
        const { error: insertErr } = await supabaseServiceClient.from('lms_attendance_records').insert({
          session_id: sessionId, student_id: studentId, status: 'attended',
          joined_at: new Date().toISOString(),
        })
        if (!insertErr) {
          await supabaseServiceClient.from('lms_sessions')
            .update({ attendance_count: (session.attendance_count ?? 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
        }
      } else if (existing.status !== 'attended') {
        await supabaseServiceClient.from('lms_attendance_records')
          .update({ status: 'attended' })
          .eq('id', existing.id)
        await supabaseServiceClient.from('lms_sessions')
          .update({ attendance_count: (session.attendance_count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      }

      return res.status(200).json({ joinUrl: session.zoom_join_url ?? session.zoom_meeting_id })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/sessions ───────────────────────────
lmsStudentRouter.get('/student/classes/:classId/sessions', authenticateRequest, requireRole('student'), checkDemoAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('student_id', studentId).eq('class_id', req.params.classId).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, zoom_meeting_id, zoom_join_url, recording_url, attendance_count, actual_duration_minutes, change_note, missed_reason, created_at')
        .eq('class_id', req.params.classId)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const sessions = (data ?? []).map(s => ({
        id: s.id, classId: s.class_id, scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes, status: s.status,
        meetingLink: s.zoom_join_url ?? s.zoom_meeting_id, recordingUrl: s.recording_url,
        attendanceCount: s.attendance_count, actualDurationMinutes: s.actual_duration_minutes,
        changeNote: s.change_note, missedReason: s.missed_reason, createdAt: s.created_at,
      }))

      return res.status(200).json({ sessions })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/notices ────────────────────────────
lmsStudentRouter.get('/student/classes/:classId/notices', authenticateRequest, requireRole('student'), checkDemoAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('student_id', studentId).eq('class_id', req.params.classId).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .select('id, class_id, teacher_id, title, content, type, file_name, created_at')
        .eq('class_id', req.params.classId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const notices = (data ?? []).map(n => ({
        id: n.id, classId: n.class_id, teacherId: n.teacher_id,
        title: n.title, content: n.content, type: n.type,
        fileName: n.file_name, createdAt: n.created_at,
      }))

      return res.status(200).json({ notices })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/attendance ─────────────────────────
lmsStudentRouter.get('/student/classes/:classId/attendance', authenticateRequest, requireRole('student'), checkDemoAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('student_id', studentId).eq('class_id', req.params.classId).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      // Get all past/completed sessions for this class
      const now = new Date().toISOString()
      const { data: classSessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, scheduled_at, duration_minutes, status')
        .eq('class_id', req.params.classId)
        .neq('status', 'cancelled')
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })

      const sessionIds = (classSessions ?? []).map(s => s.id)

      const { data: records, error } = sessionIds.length
        ? await supabaseServiceClient
            .from('lms_attendance_records')
            .select('session_id, status')
            .eq('student_id', studentId)
            .in('session_id', sessionIds)
        : { data: [], error: null }

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const recordBySession: Record<string, string> = {}
      ;(records ?? []).forEach(r => { recordBySession[r.session_id] = r.status })

      // All past sessions — absent if no record exists
      const result = (classSessions ?? []).map(s => ({
        sessionId: s.id,
        classId: req.params.classId,
        scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes,
        status: recordBySession[s.id] ?? 'absent',
      }))

      return res.status(200).json({ records: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/recordings ─────────────────────────
lmsStudentRouter.get('/student/classes/:classId/recordings', authenticateRequest, requireRole('student'), checkDemoAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments').select('demo_expires_at').eq('student_id', studentId).eq('class_id', req.params.classId).single()
      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const isExpiredDemo = enrollment.demo_expires_at && new Date(enrollment.demo_expires_at) < new Date()
      const isDemo = enrollment.demo_expires_at !== null

      if (isExpiredDemo) throw new HttpError(403, 'DEMO_EXPIRED', 'Your demo access has expired.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, recording_url')
        .eq('class_id', req.params.classId)
        .eq('status', 'completed')
        .not('recording_url', 'is', null)
        .order('scheduled_at', { ascending: true })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const recordings = (data ?? []).map((s, idx) => ({
        sessionId: s.id,
        classId: s.class_id,
        scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes,
        recordingUrl: s.recording_url,
        accessLevel: isDemo && idx > 0 ? 'demo_only' : 'full',
      }))

      return res.status(200).json({ recordings })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/notifications ───────────────────────────────────────
lmsStudentRouter.get('/student/notifications', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data, error } = await supabaseServiceClient
        .from('lms_notifications')
        .select('id, type, title, body, class_id, is_read, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const notifications = (data ?? []).map(n => ({
        id: n.id,
        type: n.type,
        message: n.title,
        body: n.body ?? '',
        classId: n.class_id,
        read: n.is_read,
        createdAt: n.created_at,
      }))

      return res.status(200).json({ notifications })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/student/notifications/:id/read ────────────────────────────
lmsStudentRouter.patch('/student/notifications/:id/read', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { error } = await supabaseServiceClient
        .from('lms_notifications')
        .update({ is_read: true })
        .eq('id', req.params.id)
        .eq('student_id', studentId)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Notification marked as read.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/notification-prefs ──────────────────────────────────
lmsStudentRouter.get('/student/notification-prefs', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data } = await supabaseServiceClient
        .from('lms_notification_prefs').select('*').eq('student_id', studentId).single()

      const defaults = {
        studentId, emailEnabled: true, pushEnabled: false,
        sessionReminder: true, sessionStarted: true, sessionRescheduled: true, noticePosted: true,
      }

      if (!data) return res.status(200).json({ prefs: defaults })

      return res.status(200).json({
        prefs: {
          studentId: data.student_id,
          emailEnabled: data.email_enabled,
          pushEnabled: data.push_enabled,
          sessionReminder: data.session_reminder,
          sessionStarted: data.session_started,
          sessionRescheduled: data.session_rescheduled,
          noticePosted: data.notice_posted,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/student/notification-prefs ────────────────────────────────
const notifPrefsSchema = z.object({
  emailEnabled:       z.boolean().optional(),
  pushEnabled:        z.boolean().optional(),
  sessionReminder:    z.boolean().optional(),
  sessionStarted:     z.boolean().optional(),
  sessionRescheduled: z.boolean().optional(),
  noticePosted:       z.boolean().optional(),
})

lmsStudentRouter.patch('/student/notification-prefs', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = notifPrefsSchema.parse(req.body)
      const studentId = req.auth!.userId

      const updates: Record<string, unknown> = { student_id: studentId, updated_at: new Date().toISOString() }
      if (parsed.emailEnabled !== undefined)       updates.email_enabled = parsed.emailEnabled
      if (parsed.pushEnabled !== undefined)        updates.push_enabled = parsed.pushEnabled
      if (parsed.sessionReminder !== undefined)    updates.session_reminder = parsed.sessionReminder
      if (parsed.sessionStarted !== undefined)     updates.session_started = parsed.sessionStarted
      if (parsed.sessionRescheduled !== undefined) updates.session_rescheduled = parsed.sessionRescheduled
      if (parsed.noticePosted !== undefined)       updates.notice_posted = parsed.noticePosted

      const { error } = await supabaseServiceClient
        .from('lms_notification_prefs')
        .upsert(updates, { onConflict: 'student_id' })

      if (error) throw new HttpError(500, 'UPSERT_FAILED', error.message)
      return res.status(200).json({ message: 'Preferences saved.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/student/profile ───────────────────────────────────────────
const studentProfileSchema = z.object({
  name:  z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
})

lmsStudentRouter.patch('/student/profile', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, phone } = studentProfileSchema.parse(req.body)
      const studentId = req.auth!.userId
      const updates: Record<string, string> = {}
      if (name)  updates.full_name = name
      if (phone) updates.phone = phone

      if (!Object.keys(updates).length) return res.status(200).json({ message: 'Nothing to update.' })

      const { error } = await supabaseServiceClient
        .from('profiles').update(updates).eq('id', studentId)
      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Profile updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/orders ──────────────────────────────────────────────
lmsStudentRouter.get('/student/orders', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data, error } = await supabaseServiceClient
        .from('lms_orders')
        .select('id, plan, amount_paid, total_collected, status, created_at, paid_at, cancelled_at, access_until, stripe_subscription_id, lms_products!inner(name), lms_coupons(code)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const orders = (data ?? []).map(o => ({
        id: o.id,
        productName: (o.lms_products as any).name,
        plan: o.plan,
        amountPaid: o.plan === 'installment' ? Number(o.total_collected ?? 0) : Number(o.amount_paid),
        installmentAmount: o.plan === 'installment' ? Number(o.amount_paid) : null,
        status: o.status,
        couponCode: (o.lms_coupons as any)?.code ?? null,
        createdAt: o.created_at,
        paidAt: o.paid_at,
        cancelledAt: o.cancelled_at,
        accessUntil: o.access_until,
        stripeSubscriptionId: o.stripe_subscription_id,
      }))

      return res.status(200).json({ orders })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/enrollment-overview ─────────────────────────────────
// Returns ALL enrollments (including expired demo) so the programs page
// can show the correct state per product without a separate payment check.
lmsStudentRouter.get('/student/enrollment-overview', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data, error } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id, enrolled_at, demo_expires_at, lms_classes!inner(product_id)')
        .eq('student_id', studentId)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const now = new Date()
      const result = (data ?? []).map(e => {
        const expires = e.demo_expires_at ? new Date(e.demo_expires_at) : null
        const accessType = expires === null ? 'full' : expires > now ? 'demo_active' : 'demo_expired'
        return {
          classId: e.class_id,
          productId: (e.lms_classes as any).product_id,
          accessType,
          demoExpiresAt: e.demo_expires_at ?? null,
          enrolledAt: e.enrolled_at,
        }
      })

      return res.status(200).json({ enrollments: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/student/programs/:productId/demo ───────────────────────────
lmsStudentRouter.post('/student/programs/:productId/demo', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId
      const { productId } = req.params as { productId: string }

      // Verify product exists and is active
      const { data: product } = await supabaseServiceClient
        .from('lms_products').select('id, name').eq('id', productId).eq('is_active', true).single()
      if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Program not found or inactive.')

      // Find first available class for this product
      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('product_id', productId).limit(1).single()
      if (!cls) throw new HttpError(404, 'NO_CLASS', 'No class available for this program yet.')

      // Block if student already has any enrollment for this class (demo or paid)
      const { data: existing } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id, demo_expires_at')
        .eq('student_id', studentId)
        .eq('class_id', cls.id)
        .single()

      if (existing) {
        const expires = existing.demo_expires_at ? new Date(existing.demo_expires_at) : null
        if (expires === null) throw new HttpError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this program.')
        if (expires > new Date()) throw new HttpError(409, 'DEMO_ACTIVE', 'You already have an active demo for this program.')
        throw new HttpError(409, 'DEMO_EXPIRED', 'Your demo for this program has expired. Please enroll to continue.')
      }

      const demoExpiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabaseServiceClient
        .from('lms_enrollments')
        .insert({ student_id: studentId, class_id: cls.id, demo_expires_at: demoExpiresAt })

      if (error) throw new HttpError(500, 'DEMO_FAILED', error.message)

      return res.status(201).json({
        classId: cls.id,
        demoExpiresAt,
        message: `Demo access granted for ${product.name}. Expires in 2 days.`,
      })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/student/orders/:orderId/cancel ──────────────────────────────
lmsStudentRouter.post('/student/orders/:orderId/cancel', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: order, error: orderError } = await supabaseServiceClient
        .from('lms_orders')
        .select('id, student_id, plan, status, stripe_subscription_id, paid_at, class_id')
        .eq('id', req.params.orderId)
        .single()

      if (orderError || !order) throw new HttpError(404, 'NOT_FOUND', 'Order not found.')
      if (order.student_id !== studentId) throw new HttpError(403, 'FORBIDDEN', 'This order does not belong to you.')
      if (order.plan !== 'installment') throw new HttpError(400, 'NOT_INSTALLMENT', 'Only installment plans can be cancelled this way.')
      if (order.status === 'cancelled') throw new HttpError(409, 'ALREADY_CANCELLED', 'This plan is already cancelled.')
      if (order.status !== 'paid') throw new HttpError(400, 'NOT_ACTIVE', 'Only active paid plans can be cancelled.')

      // Compute access_until = last day of the month of the most recent payment, in UTC.
      // Must use UTC methods — local getMonth()/getFullYear() depend on server timezone
      // and would compute the wrong month end if the server is not UTC.
      const lastPaidDate = new Date(order.paid_at)
      const accessUntil = new Date(Date.UTC(
        lastPaidDate.getUTCFullYear(),
        lastPaidDate.getUTCMonth() + 1, // first day of next month in UTC
        0,                               // day 0 = last day of current month
        23, 59, 59, 999
      ))

      // Cancel Stripe subscription immediately (no proration — access managed by access_until)
      if (order.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(order.stripe_subscription_id)
        } catch (err: any) {
          if (err?.code !== 'resource_missing') throw err
        }
      }

      // Mark order as cancelled
      await supabaseServiceClient
        .from('lms_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          access_until: accessUntil.toISOString(),
        })
        .eq('id', order.id)

      // Set demo_expires_at = access_until on the enrollment so every access check
      // (sessions, recordings, notices, chat) correctly blocks after access_until
      // without relying on the student hitting GET /student/classes first.
      if (order.class_id) {
        await supabaseServiceClient
          .from('lms_enrollments')
          .update({ demo_expires_at: accessUntil.toISOString() })
          .eq('student_id', studentId)
          .eq('class_id', order.class_id)
          .is('demo_expires_at', null)
      }

      // Notify student
      const accessUntilReadable = accessUntil.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
      })
      await notifyStudent({
        studentId,
        type: 'access_revoked',
        title: 'Cancellation confirmed',
        body: `Your installment plan has been cancelled. You keep full access until ${accessUntilReadable}.`,
      })

      return res.status(200).json({
        message: 'Plan cancelled.',
        accessUntil: accessUntil.toISOString(),
      })
    } catch (err) { return next(err) }
  }
)
