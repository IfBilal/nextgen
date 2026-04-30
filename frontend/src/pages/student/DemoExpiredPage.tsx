import { Lock, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../../styles/demo.css'

const HAD_ACCESS = ['Today\'s recording', 'Session countdown', 'Notice board', 'Live session join']
const WILL_GET = ['All recordings', 'Teacher chat', 'Full attendance history', 'Session notifications']

export default function DemoExpiredPage() {
  return (
    <div className="demo-expired-page">
      <div className="demo-expired-card">
        <Lock size={52} className="demo-expired-card__icon" />
        <h1>Your demo access has ended</h1>
        <p className="demo-expired-card__sub">
          Your free trial period is over. Enroll to unlock everything.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              You had access to
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {HAD_ACCESS.map(item => (
                <div key={item} className="demo-expired-feature" style={{ background: '#F9FAFB', color: '#6B7280' }}>
                  <CheckCircle2 size={12} style={{ color: '#6B7280', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Enroll to get
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {WILL_GET.map(item => (
                <div key={item} className="demo-expired-feature demo-expired-feature--locked">
                  <CheckCircle2 size={12} style={{ color: '#3730A3', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="demo-expired-card__actions">
          <Link to="/student/checkout" className="demo-btn-primary">
            Enroll Now
          </Link>
          <Link to="/student/dashboard" className="demo-btn-ghost">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
