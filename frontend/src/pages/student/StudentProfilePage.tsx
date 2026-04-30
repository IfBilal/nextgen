import { useState, useEffect } from 'react'
import { UserCircle, Edit2, Check, X } from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { useSubscription } from '../../context/SubscriptionContext'
import { studentGetEnrolledClasses } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import { Link } from 'react-router-dom'

export default function StudentProfilePage() {
  const { user } = useStudentAuth()
  const { planLabel } = useSubscription()
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name ?? '')
  const [editPhone, setEditPhone] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) studentGetEnrolledClasses(user.id).then(setClasses)
  }, [user?.id])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST'

  function handleSave() {
    setEditing(false)
    setToast('Profile updated ✓')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      {/* Profile Card */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary, #3730A3)', color: '#fff', fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '1rem', fontWeight: 700, color: '#1E1B4B' }}
                  placeholder="Full name"
                />
                <input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '0.87rem', color: '#1E1B4B' }}
                  placeholder="Phone number"
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <Check size={13} /> Save
                  </button>
                  <button onClick={() => setEditing(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#fff', color: '#6B7280', border: '1px solid #E0E7FF', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 4px' }}>
                  {user?.name || 'Student'}
                </h1>
                <p style={{ fontSize: '0.87rem', color: '#6B7280', margin: '0 0 10px' }}>
                  {user?.email}
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#EEF2FF', color: '#3730A3', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, border: '1px solid #C7D2FE' }}>
                    <UserCircle size={12} /> {planLabel}
                  </span>
                  <button
                    onClick={() => setEditing(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#F9FAFB', color: '#374151', border: '1px solid #E0E7FF', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Edit2 size={12} /> Edit Profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enrolled Classes */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 16, padding: '20px 24px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 14px' }}>
          My Classes
        </h2>
        {classes.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
            You are not enrolled in any classes yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {classes.map(cls => (
              <div key={cls.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F9FAFB', border: '1px solid #EEF2FF', borderRadius: 10, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.9rem' }}>{cls.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                    {cls.productName} · Dr. {cls.teacherName.split(' ').slice(-1)[0]}
                  </div>
                </div>
                <Link
                  to={`/student/classes/${cls.id}/session`}
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3730A3', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #C7D2FE', borderRadius: 7, background: '#EEF2FF' }}
                >
                  View Class →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Settings Link */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.9rem' }}>Notification Settings</div>
          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>Manage email and push preferences</div>
        </div>
        <Link to="/student/notifications" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730A3', textDecoration: 'none' }}>
          Manage →
        </Link>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
