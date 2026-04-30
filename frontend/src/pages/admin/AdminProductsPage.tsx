import { useState, useEffect } from 'react'
import {
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  getAllClassesWithProducts,
} from '../../services/lmsApi'
import type { Product, ClassWithProduct } from '../../types/lms'
import '../../styles/admin/admin-products.css'
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Users,
  BookOpen,
} from 'lucide-react'

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
}

interface ProductFormState {
  name: string
  description: string
  upfrontPrice: string
  installmentAmount: string
  installmentMonths: string
  isActive: boolean
}

const emptyForm: ProductFormState = {
  name: '',
  description: '',
  upfrontPrice: '',
  installmentAmount: '',
  installmentMonths: '12',
  isActive: true,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([adminGetProducts(), getAllClassesWithProducts()]).then(([p, c]) => {
      setProducts(p)
      setClasses(c)
      setLoading(false)
    })
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description,
      upfrontPrice: String(product.upfrontPrice),
      installmentAmount: String(product.installmentAmount),
      installmentMonths: String(product.installmentMonths),
      isActive: product.isActive,
    })
    setFormError('')
    setShowModal(true)
  }

  function updateForm(field: keyof ProductFormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    setFormError('')
    if (!form.name.trim()) { setFormError('Product name is required.'); return }
    const upfront = Number(form.upfrontPrice)
    const installment = Number(form.installmentAmount)
    const months = Number(form.installmentMonths)
    if (isNaN(upfront) || upfront < 0) { setFormError('Invalid upfront price.'); return }
    if (isNaN(installment) || installment < 0) { setFormError('Invalid installment amount.'); return }
    if (isNaN(months) || months < 1) { setFormError('Invalid installment months.'); return }

    setFormSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        upfrontPrice: upfront,
        installmentAmount: installment,
        installmentMonths: months,
        isActive: form.isActive,
      }

      if (editingId) {
        const updated = await adminUpdateProduct(editingId, payload)
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
        showToast(`${updated.name} updated ✓`)
      } else {
        const created = await adminCreateProduct(payload)
        setProducts(prev => [created, ...prev])
        showToast(`${created.name} created ✓`)
      }
      setShowModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminDeleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      setDeleteConfirmId(null)
      showToast('Product deleted')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot delete product.')
      setDeleteConfirmId(null)
    }
  }

  async function handleToggleActive(product: Product) {
    const updated = await adminUpdateProduct(product.id, { isActive: !product.isActive })
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
    showToast(`${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}`)
  }

  const totalEnrolled = products.reduce((sum, p) => {
    return sum + p.classIds.reduce((cs, cid) => {
      const cls = classes.find(c => c.id === cid)
      return cs + (cls?.enrolledStudentIds.length ?? 0)
    }, 0)
  }, 0)

  const activeCount = products.filter(p => p.isActive).length

  return (
    <div className="admin-products-page">
      {/* Header */}
      <div className="admin-products-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Products
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Manage LMS product packages, pricing, and class assignments.
            </p>
          </div>
          <button
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}
            onClick={openCreate}
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-products-kpi-grid">
        <div className="admin-products-kpi-card">
          <div className="admin-products-kpi-card__icon"><Package size={18} /></div>
          <div className="admin-products-kpi-card__label">Total Products</div>
          <div className="admin-products-kpi-card__value">{products.length}</div>
          <div className="admin-products-kpi-card__sub">in the catalog</div>
        </div>
        <div className="admin-products-kpi-card">
          <div className="admin-products-kpi-card__icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="admin-products-kpi-card__label">Active Products</div>
          <div className="admin-products-kpi-card__value">{activeCount}</div>
          <div className="admin-products-kpi-card__sub">available for enrollment</div>
        </div>
        <div className="admin-products-kpi-card">
          <div className="admin-products-kpi-card__icon"><Users size={18} /></div>
          <div className="admin-products-kpi-card__label">Total Enrolled</div>
          <div className="admin-products-kpi-card__value">{totalEnrolled}</div>
          <div className="admin-products-kpi-card__sub">students across all products</div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="admin-products-section">
        <div className="admin-products-section__header">
          <h2 className="admin-products-section__title">All Products</h2>
        </div>

        {loading ? (
          <div className="admin-products-empty">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="admin-products-empty">
            <Package size={36} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
            <p>No products yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="admin-products-grid">
            {products.map(product => {
              const productClasses = classes.filter(c => product.classIds.includes(c.id))
              const enrolled = productClasses.reduce((sum, c) => sum + c.enrolledStudentIds.length, 0)

              return (
                <div
                  key={product.id}
                  className={`admin-products-card ${!product.isActive ? 'admin-products-card--inactive' : ''}`}
                >
                  <div className="admin-products-card__header">
                    <h3 className="admin-products-card__name">{product.name}</h3>
                    <span className={`admin-products-card__active-badge admin-products-card__active-badge--${product.isActive ? 'active' : 'inactive'}`}>
                      {product.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </div>

                  <p className="admin-products-card__desc">
                    {product.description || 'No description provided.'}
                  </p>

                  <div className="admin-products-card__prices">
                    <div className="admin-products-card__price">
                      <div className="admin-products-card__price-label">Upfront</div>
                      <div className="admin-products-card__price-value">{formatCurrency(product.upfrontPrice)}</div>
                    </div>
                    <div className="admin-products-card__price">
                      <div className="admin-products-card__price-label">Installment</div>
                      <div className="admin-products-card__price-value">
                        {formatCurrency(product.installmentAmount)}/mo × {product.installmentMonths}
                      </div>
                    </div>
                  </div>

                  <div className="admin-products-card__meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={12} />
                      {productClasses.length} class{productClasses.length !== 1 ? 'es' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} />
                      {enrolled} enrolled
                    </span>
                  </div>

                  <div className="admin-products-card__footer">
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                      onClick={() => openEdit(product)}
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                        background: product.isActive ? '#fef3c7' : '#dcfce7',
                        color: product.isActive ? '#b45309' : '#15803d',
                        border: `1px solid ${product.isActive ? '#fde68a' : '#bbf7d0'}`,
                        borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer'
                      }}
                      onClick={() => handleToggleActive(product)}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {deleteConfirmId === product.id ? (
                      <>
                        <button
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                          onClick={() => handleDelete(product.id)}
                        >
                          Confirm Delete
                        </button>
                        <button
                          style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280' }}
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280' }}
                        onClick={() => setDeleteConfirmId(product.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="admin-products-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="admin-products-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="admin-products-modal__title">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                style={{ background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#6B7280' }}
                onClick={() => setShowModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Product Name *</label>
                <input
                  style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                  placeholder="e.g. USMLE Step 1 Complete"
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Description</label>
                <textarea
                  style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 72 }}
                  placeholder="Describe what this product includes…"
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Upfront Price ($)</label>
                  <input
                    type="number"
                    min={0}
                    style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                    placeholder="e.g. 2500"
                    value={form.upfrontPrice}
                    onChange={e => updateForm('upfrontPrice', e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Monthly Installment ($)</label>
                  <input
                    type="number"
                    min={0}
                    style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                    placeholder="e.g. 250"
                    value={form.installmentAmount}
                    onChange={e => updateForm('installmentAmount', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Installment Months</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', maxWidth: 120 }}
                  value={form.installmentMonths}
                  onChange={e => updateForm('installmentMonths', e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.87rem', fontWeight: 600, color: '#3730A3' }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => updateForm('isActive', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Active (visible for enrollment)
              </label>

              {formError && (
                <div style={{ fontSize: '0.82rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', color: '#6B7280' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}
                  onClick={handleSubmit}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving…' : editingId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="admin-products-toast">{toast}</div>}
    </div>
  )
}
