import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import { getTeacherClasses } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import '../../styles/teacher.css'
import { BookOpen, Users, Calendar, Clock } from 'lucide-react'

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TeacherClassesPage() {
  const { teacher } = useTeacherAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacher) return
    getTeacherClasses(teacher.id).then(cls => {
      setClasses(cls)
      setLoading(false)
    })
  }, [teacher])

  if (!teacher) return null

  return (
    <div className="teacher-page">
      {/* Header */}
      <div className="teacher-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              My Classes
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${classes.length} class${classes.length !== 1 ? 'es' : ''} assigned to you`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="teacher-section">
          <div className="teacher-empty-state">Loading your classes…</div>
        </div>
      ) : classes.length === 0 ? (
        <div className="teacher-section">
          <div className="teacher-empty-state">
            <BookOpen size={40} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
              No classes assigned yet
            </p>
            <p style={{ fontSize: '0.83rem' }}>
              Contact your administrator to get classes assigned to your account.
            </p>
          </div>
        </div>
      ) : (
        <div className="teacher-class-grid">
          {classes.map(cls => (
            <div key={cls.id} className="teacher-class-card">
              <div>
                <h3 className="teacher-class-card__name">{cls.name}</h3>
              </div>
              <div className="teacher-class-card__meta">
                <span className="teacher-class-card__badge">
                  <BookOpen size={10} />
                  {cls.productName}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} />
                  {cls.enrolledStudentIds.length} student{cls.enrolledStudentIds.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="teacher-class-card__desc">
                {cls.description || 'No description provided.'}
              </p>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#F9FAFB',
                  border: '1px solid #e8f0fb',
                  borderRadius: 8,
                  padding: '6px 10px',
                }}
              >
                {cls.nextSession ? (
                  <>
                    <Calendar size={12} />
                    <span>Next: {formatDateTime(cls.nextSession.scheduledAt)}</span>
                    <span
                      className={`teacher-status-badge teacher-status-badge--${cls.nextSession.status}`}
                      style={{ marginLeft: 'auto' }}
                    >
                      {cls.nextSession.status}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock size={12} />
                    <span>No upcoming session</span>
                  </>
                )}
              </div>
              <div className="teacher-class-card__footer">
                <button
                  className="teacher-btn teacher-btn--primary"
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                >
                  Manage Sessions
                </button>
                <button
                  className="teacher-btn teacher-btn--secondary"
                  onClick={() => navigate(`/teacher/classes/${cls.id}?tab=notices`)}
                >
                  Notice Board
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
