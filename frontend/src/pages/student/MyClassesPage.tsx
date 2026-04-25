import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { studentGetEnrolledClasses } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import '../../styles/lms-student.css'
import { Video, GraduationCap, CheckCircle2, Calendar, Clock } from 'lucide-react'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  )
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return d > now && d <= cutoff
}

function formatTimeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatTimeDiff(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

interface CountdownChipProps {
  cls: ClassWithProduct
}

function CountdownChip({ cls }: CountdownChipProps) {
  const session = cls.nextSession
  if (!session) {
    return (
      <span className="lms-countdown-chip lms-countdown-chip--none">
        <Clock size={12} />
        No upcoming sessions
      </span>
    )
  }

  if (session.status === 'live') {
    return (
      <span className="lms-countdown-chip lms-countdown-chip--live">
        <span style={{ animation: 'lms-student-pulse 1.5s infinite', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#15803d' }} />
        Live now
      </span>
    )
  }

  const timeStr = formatTimeStr(session.scheduledAt)

  if (isToday(session.scheduledAt)) {
    return (
      <span className="lms-countdown-chip lms-countdown-chip--today">
        <Calendar size={12} />
        Today at {timeStr} — {formatTimeDiff(session.scheduledAt)}
      </span>
    )
  }

  if (isTomorrow(session.scheduledAt)) {
    return (
      <span className="lms-countdown-chip lms-countdown-chip--upcoming">
        <Calendar size={12} />
        Tomorrow at {timeStr}
      </span>
    )
  }

  if (isWithinDays(session.scheduledAt, 7)) {
    const dayName = new Date(session.scheduledAt).toLocaleDateString([], { weekday: 'short' })
    return (
      <span className="lms-countdown-chip lms-countdown-chip--upcoming">
        <Calendar size={12} />
        {dayName} at {timeStr}
      </span>
    )
  }

  const dateStr = new Date(session.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
  return (
    <span className="lms-countdown-chip lms-countdown-chip--upcoming">
      <Calendar size={12} />
      {dateStr} at {timeStr}
    </span>
  )
}

// Mock attendance data since backend isn't connected
const MOCK_ATTENDANCE: Record<string, { attended: number; total: number }> = {}

function getAttendance(classId: string): { attended: number; total: number } {
  if (!MOCK_ATTENDANCE[classId]) {
    MOCK_ATTENDANCE[classId] = {
      attended: Math.floor(Math.random() * 5) + 5,
      total: 10,
    }
  }
  return MOCK_ATTENDANCE[classId]
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName
}

export default function MyClassesPage() {
  const { user } = useStudentAuth()
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    studentGetEnrolledClasses(user.id).then(cls => {
      setClasses(cls)
      setLoading(false)
    })
  }, [user])

  if (!user) return null

  const hasLive = classes.some(c => c.nextSession?.status === 'live')
  const liveClass = classes.find(c => c.nextSession?.status === 'live')

  return (
    <div className="lms-classes-page">
      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '18px 20px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
          My Classes
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#55789c', margin: '4px 0 0' }}>
          {loading ? 'Loading…' : `${classes.length} class${classes.length !== 1 ? 'es' : ''} enrolled`}
        </p>
      </div>

      {/* Live session banner */}
      {!loading && hasLive && liveClass && (
        <div className="lms-live-banner">
          <div className="lms-live-banner__pulse" />
          <span className="lms-live-banner__text">
            A session is live right now — {liveClass.name}
          </span>
          <Link
            to={`/student/classes/${liveClass.id}/session`}
            className="lms-join-btn"
            style={{ flexShrink: 0 }}
          >
            <Video size={14} />
            Join Now
          </Link>
        </div>
      )}

      {/* Classes or empty state */}
      {loading ? (
        <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: '#6a86a7' }}>
          Loading your classes…
        </div>
      ) : classes.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '3rem 2rem', textAlign: 'center', color: '#6a86a7' }}>
          <GraduationCap size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 6, color: '#355a7f' }}>
            You are not enrolled in any classes yet.
          </p>
          <p style={{ fontSize: '0.83rem', marginBottom: 16 }}>
            Browse our programs to get started.
          </p>
          <Link
            to="/student/programs"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a6fad', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.87rem', textDecoration: 'none' }}
          >
            Browse Programs
          </Link>
        </div>
      ) : (
        <div className="lms-classes-grid">
          {classes.map(cls => {
            const isLive = cls.nextSession?.status === 'live'
            const attendance = getAttendance(cls.id)
            const teacherFirstName = `Dr. ${getFirstName(cls.teacherName)}`

            return (
              <div
                key={cls.id}
                className={`lms-class-card ${isLive ? 'lms-class-card--live' : ''}`}
              >
                <div className="lms-class-card__header">
                  <h3 className="lms-class-card__name">{cls.name}</h3>
                  <span className="lms-class-card__product-badge">{cls.productName}</span>
                </div>

                <div className="lms-class-card__teacher">
                  <GraduationCap size={13} />
                  {teacherFirstName}
                </div>

                <CountdownChip cls={cls} />

                <div className="lms-class-card__attendance">
                  <CheckCircle2 size={12} />
                  {attendance.attended}/{attendance.total} sessions attended
                </div>

                <div className="lms-class-card__actions">
                  {isLive ? (
                    <Link
                      to={`/student/classes/${cls.id}/session`}
                      className="lms-join-btn"
                    >
                      <Video size={14} />
                      Join Session
                    </Link>
                  ) : (
                    <Link
                      to={`/student/classes/${cls.id}/session`}
                      className="lms-view-btn"
                    >
                      View Class
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
