import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getClassById,
  studentGetSessionsForClass,
  getNoticesForClass,
} from '../../services/lmsApi'
import type { LmsClass, LmsSession, Notice } from '../../types/lms'
import '../../styles/lms-student.css'
import {
  Video,
  ExternalLink,
  Calendar,
  FileText,
  Megaphone,
  ChevronLeft,
  MessageCircle,
} from 'lucide-react'
import AskQuestionModal from '../../components/lms/AskQuestionModal'
import { useStudentAuth } from '../../context/StudentAuthContext'

function formatFullDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

interface CountdownState {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getCountdown(targetDate: string): CountdownState {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

type SidebarTab = 'notices' | 'recordings' | 'attendance' | 'chat'

export default function LiveSessionPage() {
  const { classId } = useParams<{ classId: string }>()
  const { user } = useStudentAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<CountdownState | null>(null)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('notices')
  const [showAskModal, setShowAskModal] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!classId) return
    async function load() {
      const [clsData, sessionData, noticeData] = await Promise.all([
        getClassById(classId!),
        studentGetSessionsForClass(classId!),
        getNoticesForClass(classId!),
      ])
      setCls(clsData)
      setSessions(sessionData)
      setNotices(noticeData)
      setLoading(false)
    }
    load()
  }, [classId])

  // Countdown timer for scheduled sessions
  const nextScheduled = sessions
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  const liveSession = sessions.find(s => s.status === 'live')

  useEffect(() => {
    if (!nextScheduled) return

    function tick() {
      setCountdown(getCountdown(nextScheduled!.scheduledAt))
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [nextScheduled])

  if (loading) {
    return (
      <div className="lms-session-page">
        <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: '#6a86a7' }}>
          Loading session…
        </div>
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="lms-session-page">
        <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: '#6a86a7' }}>
          Class not found.
        </div>
      </div>
    )
  }

  return (
    <div className="lms-session-page">
      {/* Header */}
      <div className="lms-session-header">
        <div>
          <Link
            to="/student/classes"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6a86a7', textDecoration: 'none', marginBottom: 6 }}
          >
            <ChevronLeft size={14} />
            My Classes
          </Link>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
            {cls.name}
          </h1>
          <p style={{ fontSize: '0.83rem', color: '#55789c', margin: '3px 0 0' }}>
            {liveSession ? 'Session in progress' : nextScheduled ? `Next: ${formatFullDateTime(nextScheduled.scheduledAt)}` : 'No upcoming sessions'}
          </p>
        </div>
        {liveSession && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Live
          </span>
        )}
      </div>

      {/* Main Layout */}
      <div className="lms-session-layout">
        {/* Main content */}
        <div>
          {liveSession ? (
            /* LIVE STATE */
            <div className="lms-zoom-frame">
              <span className="lms-zoom-frame__label">Live Session</span>
              <Video size={48} style={{ opacity: 0.6 }} />
              <span className="lms-zoom-frame__title">
                {cls.name} — Live Session in Progress
              </span>
              <span className="lms-zoom-frame__subtitle">
                Click below to join in Zoom
              </span>
              <a
                href={liveSession.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: '#16a34a',
                  color: '#fff',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <ExternalLink size={16} />
                Join via Zoom
              </a>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', position: 'relative' }}>
                Click to open Zoom in a new window
              </span>
            </div>
          ) : nextScheduled && countdown ? (
            /* SCHEDULED STATE */
            <div className="lms-countdown-large">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6a86a7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Session starts in
              </div>
              <div className="lms-countdown-large__time">
                {countdown.days > 0 && `${countdown.days}d `}
                {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
              </div>
              <div className="lms-countdown-large__label">
                {countdown.days > 0 ? 'days · hours · minutes · seconds' : 'hours · minutes · seconds'}
              </div>
              <div className="lms-countdown-large__date">
                <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {formatFullDateTime(nextScheduled.scheduledAt)}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: '#9ca3af', fontSize: '0.83rem' }}>
                <Video size={18} style={{ opacity: 0.4 }} />
                <span>Meeting link will be available when session starts</span>
              </div>
            </div>
          ) : (
            /* NO SESSION STATE */
            <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', color: '#6a86a7' }}>
              <Calendar size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#355a7f', margin: '0 0 6px' }}>
                No upcoming session scheduled
              </p>
              <p style={{ fontSize: '0.83rem', margin: 0 }}>
                Check back later — your teacher will schedule the next session soon.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Tabbed */}
        <aside className="lms-sidebar">
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e8f1f8', marginBottom: 12 }}>
            {([
              { key: 'notices', icon: Megaphone, label: 'Notices' },
              { key: 'recordings', icon: Video, label: 'Recordings' },
              { key: 'attendance', icon: Calendar, label: 'Attendance' },
              { key: 'chat', icon: MessageCircle, label: 'Chat' },
            ] as { key: SidebarTab; icon: React.ElementType; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                style={{
                  flex: 1, padding: '8px 2px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: '0.68rem', fontWeight: 600, color: sidebarTab === tab.key ? '#1a6fad' : '#6a86a7',
                  borderBottom: `2px solid ${sidebarTab === tab.key ? '#1a6fad' : 'transparent'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'color 0.15s',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notices tab */}
          {sidebarTab === 'notices' && (
            notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: '#9ca3af' }}>
                <Megaphone size={24} style={{ opacity: 0.3, margin: '0 auto 6px', display: 'block' }} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>No notices posted yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {notices.map(notice => (
                  <div key={notice.id} className="lms-notice-item">
                    <div className={`lms-notice-item__icon lms-notice-item__icon--${notice.type}`}>
                      {notice.type === 'pdf' ? <FileText size={13} /> : <Megaphone size={13} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="lms-notice-item__title">{notice.title}</div>
                      <div className="lms-notice-item__date">{formatDate(notice.createdAt)}</div>
                      {notice.fileName && (
                        <div className="lms-notice-item__filename">📎 {notice.fileName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Recordings tab */}
          {sidebarTab === 'recordings' && (
            <div style={{ padding: '4px 0' }}>
              <p style={{ fontSize: '0.8rem', color: '#55789c', margin: '0 0 10px' }}>
                Access recorded sessions for this class.
              </p>
              <Link
                to={`/student/classes/${classId}/recordings`}
                style={{ display: 'block', padding: '9px 12px', background: '#e8f3ff', border: '1px solid #cde0f5', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, color: '#1a6fad', textDecoration: 'none', textAlign: 'center' }}
              >
                View Recordings →
              </Link>
            </div>
          )}

          {/* Attendance tab */}
          {sidebarTab === 'attendance' && (
            <div style={{ padding: '4px 0' }}>
              <p style={{ fontSize: '0.8rem', color: '#55789c', margin: '0 0 10px' }}>
                Track your personal attendance for this class.
              </p>
              <Link
                to={`/student/classes/${classId}/attendance`}
                style={{ display: 'block', padding: '9px 12px', background: '#e8f3ff', border: '1px solid #cde0f5', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, color: '#1a6fad', textDecoration: 'none', textAlign: 'center' }}
              >
                View Attendance →
              </Link>
            </div>
          )}

          {/* Chat tab */}
          {sidebarTab === 'chat' && (
            <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: '0.8rem', color: '#55789c', margin: 0 }}>
                Message your teacher privately.
              </p>
              <button
                onClick={() => setShowAskModal(true)}
                style={{ padding: '8px 12px', background: '#1a6fad', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <MessageCircle size={13} /> Ask a Question
              </button>
              <Link
                to={`/student/classes/${classId}/chat`}
                style={{ display: 'block', padding: '8px 12px', background: '#f0f7ff', border: '1px solid #cde0f5', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, color: '#1a6fad', textDecoration: 'none', textAlign: 'center' }}
              >
                Open Full Chat →
              </Link>
            </div>
          )}
        </aside>

        {/* Ask Question Modal */}
        {showAskModal && cls && user && (
          <AskQuestionModal
            classId={cls.id}
            studentId={user.id}
            teacherFirstName="Dr. Carter"
            onClose={() => setShowAskModal(false)}
          />
        )}
      </div>
    </div>
  )
}
