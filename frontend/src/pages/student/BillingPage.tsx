import { useState, useEffect } from 'react'
import { CreditCard, Download, X, CheckCircle2, Loader2 } from 'lucide-react'
import { getStudentOrders, cancelStudentOrder } from '../../services/lmsApi'
import type { StudentOrder } from '../../types/lms'
import '../../styles/payment.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAccessUntil(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number) {
  return `$${n.toFixed(2)}`
}

function downloadReceipt(order: StudentOrder) {
  const lines = [
    'NEXTGEN MEDICAL MASTERY',
    'Payment Receipt',
    '─────────────────────────────────',
    `Order ID:    ${order.id}`,
    `Product:     ${order.productName}`,
    `Plan:        ${order.plan === 'installment' ? 'Installment' : 'Upfront'}`,
    `Amount:      ${fmtAmount(order.plan === 'installment' ? (order.installmentAmount ?? 0) : order.amountPaid)}${order.plan === 'installment' ? '/mo' : ''}`,
    `Total paid:  ${fmtAmount(order.amountPaid)}`,
    `Status:      ${order.status}`,
    `Paid at:     ${fmtDate(order.paidAt)}`,
    '─────────────────────────────────',
    `Generated:   ${new Date().toLocaleString()}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${order.id.slice(0, 8)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  paid:      { background: '#dcfce7', color: '#15803d' },
  cancelled: { background: '#fef9c3', color: '#a16207' },
  refunded:  { background: '#fee2e2', color: '#991b1b' },
  pending:   { background: '#f1f5f9', color: '#6B7280' },
}

export default function BillingPage() {
  const [orders, setOrders] = useState<StudentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getStudentOrders()
      .then(data => setOrders(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 6000)
  }

  async function handleCancel(orderId: string) {
    setCancellingId(orderId)
    try {
      const { accessUntil } = await cancelStudentOrder(orderId)
      setOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, status: 'cancelled', cancelledAt: new Date().toISOString(), accessUntil }
          : o
      ))
      setConfirmId(null)
      showToast(`Cancellation confirmed. Access continues through ${fmtAccessUntil(accessUntil)}.`)
    } catch {
      showToast('Failed to cancel — please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  // Only show banner for cancelled orders where access is still active (access_until in the future)
  const now = new Date().toISOString()
  const activelyCancelled = orders.filter(o =>
    o.plan === 'installment' && o.status === 'cancelled' && o.accessUntil && o.accessUntil > now
  )

  if (loading) {
    return (
      <div className="billing-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#3730A3' }} />
      </div>
    )
  }

  return (
    <div className="billing-page">
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 4px' }}>
          Billing & Payments
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
          Your payment history and plan management.
        </p>
      </div>

      {/* Cancellation confirmation banners — one per cancelled plan still within access period */}
      {activelyCancelled.map(order => (
        <div key={order.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10 }}>
          <CheckCircle2 size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
              {order.productName} — Cancellation confirmed
            </div>
            <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: 2 }}>
              No further payments will be charged. Your class access remains fully active until{' '}
              <strong>{fmtAccessUntil(order.accessUntil!)}</strong>, after which your enrollment will expire.
            </div>
          </div>
        </div>
      ))}

      {/* Payment history */}
      <div className="billing-plan-card">
        <h2>Payment History</h2>
        {orders.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', padding: '12px 0' }}>No payments yet.</p>
        ) : (
          <div className="billing-history-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="billing-history-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontSize: '0.83rem', color: '#374151' }}>{order.productName}</td>
                    <td style={{ fontSize: '0.82rem', color: '#6B7280', textTransform: 'capitalize' }}>{order.plan}</td>
                    <td style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1E1B4B' }}>
                      {fmtAmount(order.amountPaid)}
                      {order.plan === 'installment' && order.installmentAmount && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280', marginLeft: 3 }}>
                          ({fmtAmount(order.installmentAmount)}/mo)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                        ...(STATUS_STYLE[order.status] ?? STATUS_STYLE.pending),
                      }}>
                        {order.status === 'cancelled'
                          ? `Cancelled — access until ${fmtDate(order.accessUntil)}`
                          : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#6B7280' }}>{fmtDate(order.paidAt)}</td>
                    <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {order.status === 'paid' && (
                        <button
                          onClick={() => downloadReceipt(order)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3730A3', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
                        >
                          <Download size={12} /> Receipt
                        </button>
                      )}
                      {order.plan === 'installment' && order.status === 'paid' && (
                        <button
                          onClick={() => setConfirmId(order.id)}
                          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px' }}
                        >
                          <X size={11} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: '0.78rem', color: '#9ca3af' }}>
          <CreditCard size={13} /> Payments processed securely via Stripe.
        </div>
      </div>

      {/* Cancel confirmation modal — shown per order */}
      {confirmId && (() => {
        const order = orders.find(o => o.id === confirmId)
        if (!order) return null
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '24px 24px 20px', maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#1E1B4B' }}>Cancel Installment Plan?</h3>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 12px' }}>{order.productName}</p>
              <ul style={{ fontSize: '0.83rem', color: '#374151', paddingLeft: 18, margin: '0 0 20px', lineHeight: 1.8 }}>
                <li>No more monthly charges</li>
                <li>You keep <strong>full access to all sessions, recordings, and chat</strong> until the end of your current paid month</li>
                <li>After that, your enrollment expires and class access is removed</li>
                <li>This cannot be undone</li>
              </ul>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmId(null)}
                  disabled={cancellingId === order.id}
                  style={{ padding: '9px 16px', border: '1px solid #E0E7FF', background: '#fff', borderRadius: 8, color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Keep Plan
                </button>
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancellingId === order.id}
                  style={{ padding: '9px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: cancellingId === order.id ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {cancellingId === order.id && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  {cancellingId === order.id ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
