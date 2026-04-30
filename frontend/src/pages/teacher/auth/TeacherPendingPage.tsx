import { Link, useNavigate } from 'react-router-dom'
import { Clock, LogOut, Mail } from 'lucide-react'
import { useTeacherAuth } from '../../../context/TeacherAuthContext'

export default function TeacherPendingPage() {
  const { teacher, logout } = useTeacherAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/teacher/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f8fc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', border: '1px solid #d6e9fa', borderRadius: 20, padding: '2.5rem 2rem', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(13,45,94,0.08)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #fde68a' }}>
          <Clock size={32} color="#b45309" />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 0.5rem' }}>
          Application Under Review
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 1.5rem' }}>
          Your teacher application has been submitted successfully. An admin or editor will review
          your profile and approve your account. This usually takes <strong>1–2 business days</strong>.
        </p>

        {teacher && (
          <div style={{ background: '#F9FAFB', border: '1px solid #d6e9fa', borderRadius: 12, padding: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your submitted details</p>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 700, color: '#1E1B4B' }}>{teacher.name}</p>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.87rem', color: '#6B7280' }}>{teacher.email}</p>
            <p style={{ margin: 0, fontSize: '0.87rem', color: '#6B7280' }}>{teacher.phone}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <a
            href="mailto:support@nextgenmedical.com"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: '#3730A3', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
          >
            <Mail size={15} />
            Contact Support
          </a>
          <button
            onClick={handleLogout}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: 'transparent', color: '#6B7280', border: '1.5px solid #d6e9fa', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            <LogOut size={15} />
            Logout
          </button>
          <Link to="/" style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '0.25rem' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
