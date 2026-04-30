import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../../styles/payment.css'

export default function PaymentSuccessPage() {
  return (
    <div className="payment-success-page">
      <div className="payment-success-card">
        <div className="payment-success-check">
          <CheckCircle2 size={36} />
        </div>
        <h1>You're enrolled!</h1>
        <p style={{ fontWeight: 600, color: '#374151' }}>USMLE Step 1 Online Sessions</p>
        <p>Step 1 Intensive Cohort</p>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 8 }}>
          Check your inbox for a confirmation email.
        </p>
        <div className="payment-success-card__actions">
          <Link
            to="/student/classes"
            style={{ padding: '11px 24px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            Go to My Classes
          </Link>
          <button
            style={{ padding: '11px 24px', background: '#fff', color: '#6B7280', border: '1px solid #C7D2FE', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => alert('Receipt download will be available when backend is connected.')}
          >
            View Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
