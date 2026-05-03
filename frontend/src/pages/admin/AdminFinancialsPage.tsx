import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { adminGetOrders, adminRefundOrder } from '../../services/lmsApi'
import type { LmsOrder } from '../../types/lms'
import '../../styles/admin-metrics-financials.css'

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  paid:     { background: '#dcfce7', color: '#15803d' },
  pending:  { background: '#fef9c3', color: '#a16207' },
  refunded: { background: '#fee2e2', color: '#dc2626' },
}

export default function AdminFinancialsPage() {
  const [orders, setOrders] = useState<LmsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    adminGetOrders().then(data => { setOrders(data); setLoading(false) })
  }, [])

  const kpis = useMemo(() => {
    const paid = orders.filter(o => o.status === 'paid')
    const refunded = orders.filter(o => o.status === 'refunded')
    const totalRevenue = paid.reduce((sum, o) => sum + o.amountPaid, 0)
    const totalRefunded = refunded.reduce((sum, o) => sum + o.amountPaid, 0)
    return {
      totalRevenue,
      paidCount: paid.length,
      refundedAmount: totalRefunded,
      pendingCount: orders.filter(o => o.status === 'pending').length,
    }
  }, [orders])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleRefund(orderId: string) {
    const order = orders.find(o => o.id === orderId)
    const isInstallment = order?.plan === 'installment'
    const msg = isInstallment
      ? 'Revoke access for this installment order? The subscription will be cancelled. No refund will be issued.'
      : 'Issue a refund for this order? The full amount will be returned and class access will be revoked.'
    if (!confirm(msg)) return
    setRefunding(orderId)
    try {
      await adminRefundOrder(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o))
      showToast(isInstallment ? 'Access revoked ✓' : 'Refund issued ✓')
    } catch {
      showToast(isInstallment ? 'Failed to revoke access' : 'Refund failed — check Stripe dashboard')
    } finally {
      setRefunding(null)
    }
  }

  return (
    <div className="admin-financials-page">
      <header className="admin-metrics-header">
        <h1>Financials</h1>
        <p>Revenue, orders, and payment status from Stripe.</p>
      </header>

      <section className="admin-financials-kpis">
        <article className="admin-financials-kpi">
          <h4>Total Revenue</h4>
          <p className="value">{fmt(kpis.totalRevenue)}</p>
          <p className="delta up">{kpis.paidCount} paid orders</p>
        </article>
        <article className="admin-financials-kpi">
          <h4>Refunded</h4>
          <p className="value">{fmt(kpis.refundedAmount)}</p>
          <p className="delta down">{orders.filter(o => o.status === 'refunded').length} refunds</p>
        </article>
        <article className="admin-financials-kpi">
          <h4>Net Revenue</h4>
          <p className="value">{fmt(kpis.totalRevenue - kpis.refundedAmount)}</p>
          <p className="delta neutral">after refunds</p>
        </article>
        <article className="admin-financials-kpi">
          <h4>Pending</h4>
          <p className="value">{kpis.pendingCount}</p>
          <p className="delta neutral">awaiting payment</p>
        </article>
      </section>

      <section className="admin-metrics-grid" style={{ gridTemplateColumns: '1fr' }}>
        <article className="card admin-metrics-panel admin-financials-invoices">
          <h3>Order History</h3>
          <p>All orders from newest to oldest. Paid orders can be refunded here.</p>

          {loading ? (
            <div style={{ padding: '24px 0', color: '#6B7280', fontSize: '0.9rem' }}>Loading orders…</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '24px 0', color: '#9CA3AF', fontSize: '0.9rem' }}>No orders yet.</div>
          ) : (
            <div className="admin-metrics-table-wrap">
              <table className="admin-metrics-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Product</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1E1B4B', fontSize: '0.85rem' }}>{order.studentName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{order.studentEmail}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#374151' }}>{order.productName || '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: '#6B7280', textTransform: 'capitalize' }}>{order.plan}</td>
                      <td style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.87rem' }}>
                        {fmt(order.amountPaid)}
                        {order.plan === 'installment' && (order as any).monthlyAmount && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6B7280', marginLeft: 3 }}>
                            ({fmt((order as any).monthlyAmount)}/mo)
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                          ...STATUS_STYLES[order.status],
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#6B7280' }}>{fmtDate(order.paidAt)}</td>
                      <td>
                        {order.status === 'paid' && (
                          <button
                            disabled={refunding === order.id}
                            onClick={() => handleRefund(order.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600,
                              background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                              borderRadius: 6, cursor: 'pointer', opacity: refunding === order.id ? 0.6 : 1,
                            }}
                          >
                            <RotateCcw size={11} />
                            {refunding === order.id
                              ? (order.plan === 'installment' ? 'Revoking…' : 'Refunding…')
                              : (order.plan === 'installment' ? 'Revoke Access' : 'Refund')
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
