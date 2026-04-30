import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import {
  getTeacherClasses,
  getTeacherSessions,
  startSession,
  endSession,
} from '../../services/lmsApi'
import type { ClassWithProduct, LmsSession } from '../../types/lms'
import '../../styles/teacher.css'
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  Video,
} from 'lucide-react'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isWithin30Min(dateStr: string): boolean {
  const d = new Date(dateStr)
  const diff = d.getTime() - Date.now()
  return diff >= -5 * 60 * 1000 && diff <= 30 * 60 * 1000
}

function isFuture(dateStr: string): boolean {
  return new Date(dateStr).getTime() > Date.now()
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return d > now && d <= cutoff
}

function formatCountdownLabel(dateStr: string): string {
  if (!dateStr) return 'None today'
  const d = new Date(dateStr)
  const now = new Date()
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const target = new Date(d)
  target.setHours(0, 0, 0, 0)

  if (target.getTime() === today.getTime()) return `Today ${timeStr}`
  if (target.getTime() === tomorrow.getTime()) return `Tomorrow ${timeStr}`
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${timeStr}`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

function StatusBadge({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, string> = {
    live: 'teacher-status-badge--live',
    scheduled: 'teacher-status-badge--scheduled',
    completed: 'teacher-status-badge--completed',
    cancelled: 'teacher-status-badge--cancelled',
  }
  return (
    <span className={`teacher-status-badge ${map[status]}`}>
      {status === 'live' && <span className="teacher-live-pulse">●</span>}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function TeacherDashboardPage() {
  const { teacher } = useTeacherAuth()
  const navigate = useNavigate()

  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [allSessions, setAllSessions] = useState<LmsSession[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacher) return
    async function load() {
      if (!teacher) return
      const cls = await getTeacherClasses(teacher.id)
      setClasses(cls)
      const sessionsArrays = await Promise.all(cls.map(c => getTeacherSessions(c.id)))
      const flat = sessionsArrays.flat()
      setAllSessions(flat)
      setLoading(false)
    }
    load()
  }, [teacher])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCheckIn(session: LmsSession) {
    const updated = await startSession(session.id)
    setAllSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    showToast('Session started — students notified ✓')
  }

  async function handleEndSession(session: LmsSession) {
    const updated = await endSession(session.id)
    setAllSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    showToast('Session ended successfully ✓')
  }

  const totalStudents = classes.reduce((sum, c) => sum + c.enrolledStudentIds.length, 0)

  const todaysSessions = allSessions.filter(
    s => (s.status === 'scheduled' || s.status === 'live') && isToday(s.scheduledAt)
  )

  const upcomingSessionsRaw = allSessions.filter(
    s => s.status === 'scheduled' && !isToday(s.scheduledAt) && isWithinDays(s.scheduledAt, 7)
  ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const nextSession = allSessions
    .filter(s => (s.status === 'scheduled' || s.status === 'live') && isFuture(s.scheduledAt))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  function getClassName(classId: string) {
    return classes.find(c => c.id === classId)?.name ?? 'Unknown Class'
  }

  if (!teacher) return null

  return (
    <div className="teacher-page">
      {/* Header */}
      <div className="teacher-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Welcome back, {teacher.name}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Here's what's happening with your classes today.
            </p>
          </div>
          <div className="teacher-quick-actions">
            <button
              className="teacher-btn teacher-btn--primary"
              onClick={() => navigate('/teacher/sessions/new')}
            >
              <Calendar size={14} />
              Schedule Session
            </button>
            <button
              className="teacher-btn teacher-btn--secondary"
              onClick={() => navigate('/teacher/classes')}
            >
              <BookOpen size={14} />
              My Classes
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="teacher-kpi-grid">
        <div className="teacher-kpi-card">
          <div className="teacher-kpi-card__icon"><BookOpen size={18} /></div>
          <div className="teacher-kpi-card__label">Active Classes</div>
          <div className="teacher-kpi-card__value">{classes.length}</div>
          <div className="teacher-kpi-card__sub">assigned to you</div>
        </div>
        <div className="teacher-kpi-card">
          <div className="teacher-kpi-card__icon"><Users size={18} /></div>
          <div className="teacher-kpi-card__label">Total Students</div>
          <div className="teacher-kpi-card__value">{totalStudents}</div>
          <div className="teacher-kpi-card__sub">enrolled across all classes</div>
        </div>
        <div className="teacher-kpi-card">
          <div className="teacher-kpi-card__icon"><Video size={18} /></div>
          <div className="teacher-kpi-card__label">Today's Sessions</div>
          <div className="teacher-kpi-card__value">{todaysSessions.length}</div>
          <div className="teacher-kpi-card__sub">
            {todaysSessions.filter(s => s.status === 'live').length} live now
          </div>
        </div>
        <div className="teacher-kpi-card">
          <div className="teacher-kpi-card__icon"><Clock size={18} /></div>
          <div className="teacher-kpi-card__label">Next Session</div>
          <div
            className="teacher-kpi-card__value"
            style={{ fontSize: nextSession ? '0.95rem' : '1.6rem' }}
          >
            {nextSession ? formatCountdownLabel(nextSession.scheduledAt) : '—'}
          </div>
          <div className="teacher-kpi-card__sub">
            {nextSession ? getClassName(nextSession.classId) : 'None scheduled'}
          </div>
        </div>
      </div>

      {/* Today's Sessions */}
      <div className="teacher-section">
        <div className="teacher-section__header">
          <h2 className="teacher-section__title">Today's Sessions</h2>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {loading ? (
          <div className="teacher-empty-state">Loading sessions…</div>
        ) : todaysSessions.length === 0 ? (
          <div className="teacher-empty-state">
            <Video size={32} />
            <p>No sessions scheduled for today.</p>
          </div>
        ) : (
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todaysSessions.map(session => (
                <tr key={session.id}>
                  <td style={{ fontWeight: 600, color: '#1E1B4B' }}>
                    {getClassName(session.classId)}
                  </td>
                  <td>{formatTime(session.scheduledAt)}</td>
                  <td>{session.durationMinutes} min</td>
                  <td><StatusBadge status={session.status} /></td>
                  <td>
                    {session.status === 'live' ? (
                      <button
                        className="teacher-btn teacher-btn--danger"
                        onClick={() => handleEndSession(session)}
                      >
                        <CheckCircle2 size={13} />
                        End Session
                      </button>
                    ) : isWithin30Min(session.scheduledAt) ? (
                      <button
                        className="teacher-btn teacher-btn--primary"
                        onClick={() => handleCheckIn(session)}
                      >
                        <Play size={13} />
                        Check In
                      </button>
                    ) : (
                      <button
                        className="teacher-btn teacher-btn--secondary"
                        onClick={() => navigate(`/teacher/classes/${session.classId}`)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upcoming Sessions */}
      <div className="teacher-section">
        <div className="teacher-section__header">
          <h2 className="teacher-section__title">Upcoming Sessions (Next 7 Days)</h2>
        </div>

        {upcomingSessionsRaw.length === 0 ? (
          <div className="teacher-empty-state">
            <Calendar size={32} />
            <p>No upcoming sessions in the next 7 days.</p>
          </div>
        ) : (
          <table className="teacher-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Class</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessionsRaw.map(session => (
                <tr key={session.id}>
                  <td>{formatDate(session.scheduledAt)}</td>
                  <td>{formatTime(session.scheduledAt)}</td>
                  <td style={{ fontWeight: 600, color: '#1E1B4B' }}>
                    {getClassName(session.classId)}
                  </td>
                  <td>{session.durationMinutes} min</td>
                  <td><StatusBadge status={session.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className="teacher-toast">{toast}</div>}
    </div>
  )
}
