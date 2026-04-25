import { useState } from 'react'
import { CreditCard, Download, X, CheckCircle2 } from 'lucide-react'
import '../../styles/payment.css'

// BACKEND SWAP: GET /api/v1/student/orders
// Replace MOCK_PLAN and MOCK_HISTORY with real API data.
// MOCK_PLAN.plan = 'installment' | 'upfront' drives what's shown.
const MOCK_PLAN = {
  plan: 'installment' as 'upfront' | 'installment',
  productName: 'USMLE Step 1 Sessions',
  installmentsTotal: 3,
  installmentsPaid: 2,
  installmentAmount: 99,
  nextPaymentDate: 'May 1, 2026',
  accessUntil: 'May 31, 2026',   // end of the last paid installment month
  cardLast4: '4242',
}

const MOCK_HISTORY = [
  { date: 'Apr 1, 2026', amount: 99, status: 'Paid' },
  { date: 'Mar 1, 2026', amount: 99, status: 'Paid' },
  { date: 'May 1, 2026', amount: 99, status: 'Upcoming' },
]

export default function BillingPage() {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const isInstallment = MOCK_PLAN.plan === 'installment'
  const canCancel = isInstallment && !cancelled

  function handleCancel() {
    setCancelled(true)
    setShowCancelModal(false)
    setToast(`Cancellation confirmed. Access continues through ${MOCK_PLAN.accessUntil}.`)
    setTimeout(() => setToast(null), 6000)
  }

  return (
    <div className="billing-page">
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d2d5e', margin: '0 0 4px' }}>
          Billing & Payments
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#55789c', margin: 0 }}>
          {isInstallment ? 'Manage your installment plan and payment history.' : 'View your payment history.'}
        </p>
      </div>

      {/* Current plan */}
      <div className="billing-plan-card">
        <h2>Current Plan</h2>
        <div className="billing-plan-meta">
          <div className="billing-meta-item">
            <label>Product</label>
            <p>{MOCK_PLAN.productName}</p>
          </div>
          <div className="billing-meta-item">
            <label>Payment Type</label>
            <p>{isInstallment ? `Installment — ${MOCK_PLAN.installmentsPaid}/${MOCK_PLAN.installmentsTotal} paid` : 'Upfront (paid in full)'}</p>
          </div>
          {isInstallment && !cancelled && (
            <div className="billing-meta-item">
              <label>Next Payment</label>
              <p>{MOCK_PLAN.nextPaymentDate} · ${MOCK_PLAN.installmentAmount}</p>
            </div>
          )}
          {isInstallment && cancelled && (
            <div className="billing-meta-item">
              <label>Access Until</label>
              <p style={{ color: '#b45309', fontWeight: 600 }}>{MOCK_PLAN.accessUntil}</p>
            </div>
          )}
          <div className="billing-meta-item">
            <label>Payment Method</label>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CreditCard size={14} style={{ color: '#1a6fad' }} /> •••• {MOCK_PLAN.cardLast4}
            </p>
          </div>
        </div>
        <span className={`billing-status-chip ${cancelled ? 'billing-status-chip--cancelled' : 'billing-status-chip--active'}`}>
          {cancelled ? `Cancellation Scheduled — access until ${MOCK_PLAN.accessUntil}` : 'Active'}
        </span>
      </div>

      {/* Payment history */}
      <div className="billing-plan-card">
        <h2>Payment History</h2>
        <div className="billing-history-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="billing-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.date}</td>
                  <td>${row.amount}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                      background: row.status === 'Paid' ? '#dcfce7' : row.status === 'Failed' ? '#fee2e2' : '#f1f5f9',
                      color: row.status === 'Paid' ? '#15803d' : row.status === 'Failed' ? '#991b1b' : '#6a86a7',
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.status === 'Paid' && (
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6fad', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
                        onClick={() => alert('Receipt download coming soon.')}
                      >
                        <Download size={12} /> Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cancel section — only for installment, only if not already cancelled */}
        {canCancel && (
          <div className="billing-cancel-section">
            <button className="billing-cancel-btn" onClick={() => setShowCancelModal(true)}>
              <X size={14} /> Cancel Installment Plan
            </button>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 6 }}>
              No more charges after cancellation. You keep full access until the end of your current month ({MOCK_PLAN.accessUntil}).
            </div>
          </div>
        )}

        {/* Post-cancel confirmation note */}
        {cancelled && isInstallment && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, marginTop: 16 }}>
            <CheckCircle2 size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>Cancellation confirmed</div>
              <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: 2 }}>
                No further payments will be charged. Your class access remains fully active until <strong>{MOCK_PLAN.accessUntil}</strong>, after which your enrollment will expire.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 24px 20px', maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#0d2d5e' }}>Cancel Installment Plan?</h3>
            <p style={{ fontSize: '0.85rem', color: '#55789c', margin: '0 0 12px' }}>
              Here's what happens when you cancel:
            </p>
            <ul style={{ fontSize: '0.83rem', color: '#374151', paddingLeft: 18, margin: '0 0 20px', lineHeight: 1.8 }}>
              <li>No more monthly charges</li>
              <li>You keep <strong>full access to all sessions, recordings, and chat</strong> until <strong>{MOCK_PLAN.accessUntil}</strong></li>
              <li>After {MOCK_PLAN.accessUntil}, your enrollment expires and class access is removed</li>
              <li>This cannot be undone</li>
            </ul>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ padding: '9px 16px', border: '1px solid #d8e9f8', background: '#fff', borderRadius: 8, color: '#55789c', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Keep Plan
              </button>
              <button onClick={handleCancel} style={{ padding: '9px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Yes, Cancel
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
