import { useState, useEffect } from 'react'
import { Tag, Plus, X } from 'lucide-react'
import { getAllCoupons, adminCreateCoupon, adminToggleCoupon, adminDeleteCoupon } from '../../services/lmsApi'
import { adminGetProducts } from '../../services/lmsApi'
import type { Coupon, Product, CreateCouponPayload } from '../../types/lms'
import '../../styles/admin/admin-coupons.css'

function formatDate(d: string | null) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function isExpired(c: Coupon) {
  return c.expiresAt !== null && new Date(c.expiresAt) < new Date()
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(10)
  const [maxUses, setMaxUses] = useState(0)
  const [expiresAt, setExpiresAt] = useState('')
  const [productId, setProductId] = useState<string>('all')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    getAllCoupons().then(setCoupons)
    adminGetProducts().then(setProducts)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate() {
    if (!code.trim()) { setFormError('Code is required.'); return }
    if (discountValue <= 0) { setFormError('Discount value must be greater than 0.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const payload: CreateCouponPayload = {
        code,
        discountType,
        discountValue,
        maxUses,
        productId: productId === 'all' ? null : productId,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      const newCoupon = await adminCreateCoupon(payload)
      setCoupons(prev => [newCoupon, ...prev])
      setShowModal(false)
      resetForm()
      showToast('Coupon created ✓')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    const updated = await adminToggleCoupon(id, !isActive)
    setCoupons(prev => prev.map(c => c.id === id ? updated : c))
    showToast(updated.isActive ? 'Coupon activated' : 'Coupon deactivated')
  }

  async function handleDelete(id: string) {
    await adminDeleteCoupon(id)
    setCoupons(prev => prev.filter(c => c.id !== id))
    showToast('Coupon deleted')
  }

  function resetForm() {
    setCode(''); setDiscountType('percentage'); setDiscountValue(10)
    setMaxUses(0); setExpiresAt(''); setProductId('all'); setFormError('')
  }

  const active = coupons.filter(c => c.isActive && !isExpired(c)).length
  const totalUses = coupons.reduce((acc, c) => acc + c.usedCount, 0)

  return (
    <div className="admin-coupons-page">
      <div className="admin-coupons-header">
        <div>
          <h1>Coupon Management</h1>
          <p>Create and manage discount codes for products.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a6fad', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.87rem', cursor: 'pointer' }}
        >
          <Plus size={14} /> Create Coupon
        </button>
      </div>

      <div className="admin-coupons-kpis">
        <article className="admin-coupons-kpi"><h4>Total Coupons</h4><p>{coupons.length}</p></article>
        <article className="admin-coupons-kpi"><h4>Active Coupons</h4><p>{active}</p></article>
        <article className="admin-coupons-kpi"><h4>Total Uses</h4><p>{totalUses}</p></article>
      </div>

      <div className="admin-coupons-table-card">
        <h3>All Coupons</h3>
        <div className="admin-coupons-table-wrap">
          <table className="admin-coupons-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Expiry</th>
                <th>Product</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => {
                const expired = isExpired(coupon)
                return (
                  <tr key={coupon.id}>
                    <td><span className="coupon-code-badge">{coupon.code}</span></td>
                    <td>
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                    </td>
                    <td>{coupon.usedCount}{coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ''}</td>
                    <td>{formatDate(coupon.expiresAt)}</td>
                    <td style={{ fontSize: '0.78rem' }}>{coupon.productId ? products.find(p => p.id === coupon.productId)?.name ?? coupon.productId : 'All Products'}</td>
                    <td>
                      <span className={`coupon-status-chip ${expired ? 'coupon-status-chip--expired' : coupon.isActive ? 'coupon-status-chip--active' : 'coupon-status-chip--inactive'}`}>
                        {expired ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="coupon-actions">
                        <button className="coupon-action-btn" onClick={() => handleToggle(coupon.id, coupon.isActive)}>
                          {coupon.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {!coupon.isActive || expired ? (
                          <button className="coupon-action-btn coupon-action-btn--danger" onClick={() => handleDelete(coupon.id)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {coupons.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No coupons created yet.</div>}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="admin-modal">
            <div className="admin-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Tag size={16} style={{ color: '#1a6fad' }} />
                <h3 className="admin-modal__title">Create Coupon</h3>
              </div>
              <button className="admin-modal__close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <div className="admin-modal-field">
              <label>Code *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" />
            </div>

            <div className="admin-modal-field">
              <label>Discount Type</label>
              <div className="coupon-type-toggle">
                {(['percentage', 'fixed'] as const).map(t => (
                  <button key={t} className={`coupon-type-toggle__btn ${discountType === t ? 'coupon-type-toggle__btn--active' : ''}`} onClick={() => setDiscountType(t)}>
                    {t === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-modal-field">
              <label>Discount Value * {discountType === 'percentage' ? '(%)' : '($)'}</label>
              <input type="number" min={1} value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
            </div>

            <div className="admin-modal-field">
              <label>Max Uses (0 = unlimited)</label>
              <input type="number" min={0} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} />
            </div>

            <div className="admin-modal-field">
              <label>Expiry Date (optional)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>

            <div className="admin-modal-field">
              <label>Product</label>
              <select value={productId} onChange={e => setProductId(e.target.value)}>
                <option value="all">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {formError && <div style={{ fontSize: '0.82rem', color: '#dc2626', marginBottom: 10 }}>{formError}</div>}

            <div className="admin-modal__actions">
              <button className="admin-modal__cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-modal__submit" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0d2d5e', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
