import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, CreditCard, Tag } from 'lucide-react'
import { adminGetProducts, validateCoupon, submitCheckout } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { Product } from '../../types/lms'
import '../../styles/payment.css'

export default function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { user } = useStudentAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [plan, setPlan] = useState<'upfront' | 'installment'>('upfront')
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState<{ value: number; type: 'percentage' | 'fixed' } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cardNum, setCardNum] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  useEffect(() => {
    adminGetProducts().then(products => {
      const p = products.find(p => p.id === (productId ?? 'product-001'))
      setProduct(p ?? products[0] ?? null)
    })
  }, [productId])

  if (!product) return <div style={{ padding: '2rem', color: '#6a86a7' }}>Loading…</div>

  const basePrice = plan === 'upfront' ? product.upfrontPrice : product.installmentAmount
  let discount = 0
  if (couponDiscount) {
    discount = couponDiscount.type === 'percentage'
      ? Math.round(basePrice * couponDiscount.value / 100)
      : Math.min(couponDiscount.value, basePrice)
  }
  const total = basePrice - discount

  async function handleApplyCoupon() {
    setCouponError('')
    setCouponDiscount(null)
    const result = await validateCoupon(couponCode, product!.id)
    if (result.valid) {
      setCouponDiscount({ value: result.discount, type: result.type })
    } else {
      setCouponError(result.message ?? 'Invalid coupon.')
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    await submitCheckout(product!.id, plan, couponDiscount ? couponCode : undefined, user?.id)
    navigate('/student/payment-success')
  }

  const FEATURES = ['Live group sessions', 'All recorded sessions', 'Teacher chat', 'Notice board', 'Attendance tracking']

  return (
    <div style={{ padding: '24px 0' }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0d2d5e', margin: '0 0 20px' }}>
        Complete Your Enrollment
      </h1>
      <div className="checkout-page" style={{ margin: 0 }}>
        {/* Order summary */}
        <div className="checkout-summary">
          <h2>Order Summary</h2>
          <div className="checkout-line">
            <span>{product.name}</span>
          </div>
          <div className="checkout-line">
            <span>Plan</span>
            <span>{plan === 'upfront' ? 'Upfront payment' : `Installment ($${product.installmentAmount}/mo × ${product.installmentMonths}mo)`}</span>
          </div>
          <div className="checkout-line">
            <span>Subtotal</span>
            <span>${basePrice}</span>
          </div>
          {couponDiscount && (
            <div className="checkout-line checkout-line--discount">
              <span>Discount ({couponCode})</span>
              <span>−${discount}</span>
            </div>
          )}
          <div className="checkout-line">
            <span>Total {plan === 'installment' ? '/ month' : ''}</span>
            <span>${total}</span>
          </div>
          <div className="checkout-features">
            {FEATURES.map(f => (
              <div key={f} className="checkout-feature">
                <Check size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Payment form */}
        <div className="checkout-form-card">
          <h2>Payment Details</h2>

          {/* Plan toggle */}
          <div style={{ display: 'flex', background: '#f0f4f8', borderRadius: 10, padding: 4, gap: 4, marginBottom: 16 }}>
            {(['upfront', 'installment'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPlan(p); setCouponDiscount(null); setCouponCode('') }}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', background: plan === p ? '#fff' : 'none', color: plan === p ? '#0d2d5e' : '#55789c', boxShadow: plan === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}
              >
                {p === 'upfront' ? `Upfront ($${product.upfrontPrice})` : `Installment ($${product.installmentAmount}/mo)`}
              </button>
            ))}
          </div>

          {plan === 'installment' && (
            <div style={{ fontSize: '0.78rem', color: '#55789c', marginBottom: 14, padding: '8px 12px', background: '#f5f8fc', borderRadius: 8 }}>
              ${product.installmentAmount}/month for {product.installmentMonths} months — total ${product.installmentAmount * product.installmentMonths}
            </div>
          )}

          {/* Coupon */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#355a7f', marginBottom: 6 }}>
              <Tag size={12} /> Coupon Code
            </label>
            <div className="coupon-input-row">
              <input
                className="coupon-input"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                placeholder="e.g. STEP1SAVE20"
              />
              <button className="coupon-apply-btn" onClick={handleApplyCoupon}>Apply</button>
            </div>
            {couponDiscount && (
              <div className="coupon-discount">
                <Check size={12} /> Coupon applied! Save ${discount}
              </div>
            )}
            {couponError && <div className="coupon-error">{couponError}</div>}
          </div>

          {/* Card fields */}
          <div className="checkout-form-field">
            <label><CreditCard size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Card Number</label>
            <input className="checkout-form-input" placeholder="4242 4242 4242 4242" value={cardNum} onChange={e => setCardNum(e.target.value)} maxLength={19} />
          </div>
          <div className="checkout-form-row">
            <div className="checkout-form-field">
              <label>Expiry</label>
              <input className="checkout-form-input" placeholder="MM/YY" value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} />
            </div>
            <div className="checkout-form-field">
              <label>CVC</label>
              <input className="checkout-form-input" placeholder="123" value={cvc} onChange={e => setCvc(e.target.value)} maxLength={4} />
            </div>
          </div>

          <button
            className="checkout-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Processing…' : `Pay $${total}${plan === 'installment' ? '/mo' : ''}`}
          </button>
          <Link to="/student/classes" className="checkout-cancel">Cancel — Go Back</Link>
        </div>
      </div>
    </div>
  )
}
