import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  studentGetClassById,
  studentGetSessionsForClass,
  studentJoinSession,
  getNoticesForClass,
} from '../../services/lmsApi'
import type { LmsClass, LmsSession, Notice } from '../../types/lms'
import '../../styles/lms-student.css'
import {
  Video,
  Calendar,
  FileText,
  Megaphone,
  ChevronLeft,
  MessageCircle,
  ClipboardList,
} from 'lucide-react'

function formatFullDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

interface CountdownState { days: number; hours: number; minutes: number; seconds: number }

function getCountdown(targetDate: string): CountdownState {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

function pad(n: number): string { return String(n).padStart(2, '0') }

export default function LiveSessionPage() {
  const { classId } = useParams<{ classId: string }>()
  const [cls, setCls] = useState<LmsClass | null>(null)
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<CountdownState | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!classId) return
    async function load() {
      const [clsData, sessionData, noticeData] = await Promise.all([
        studentGetClassById(classId!),
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

  const liveSession = sessions.find(s => s.status === 'live')
  const nextScheduled = sessions
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  useEffect(() => {
    if (!nextScheduled) return
    function tick() { setCountdown(getCountdown(nextScheduled!.scheduledAt)) }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [nextScheduled])

  if (loading) {
    return (
      <div className="lms-session-page">
        <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: '#6B7280' }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="lms-session-page">
        <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '2.5rem', textAlign: 'center', color: '#6B7280' }}>
          Class not found.
        </div>
      </div>
    )
  }

  // ── Class hub view ───────────────────────────────────────────────────────
  return (
    <div className="lms-session-page">

      {/* Header */}
      <div className="lms-session-header">
        <div>
          <Link
            to="/student/classes"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none', marginBottom: 6 }}
          >
            <ChevronLeft size={14} /> My Classes
          </Link>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>{cls.name}</h1>
        </div>
      </div>

      {/* Live session banner */}
      {liveSession && (
        <div className="lms-live-banner">
          <div className="lms-live-banner__pulse" />
          <span className="lms-live-banner__text">A session is live right now</span>
          <button
            className="lms-join-btn"
            style={{ flexShrink: 0, border: 'none', cursor: 'pointer' }}
            onClick={async () => {
              const url = await studentJoinSession(liveSession.id)
              if (url) window.open(url, '_blank', 'noopener,noreferrer')
            }}
          >
            <Video size={14} /> Join Session
          </button>
        </div>
      )}

      {/* Upcoming session countdown */}
      {!liveSession && nextScheduled && countdown && (
        <div className="lms-countdown-large" style={{ padding: '1.5rem 2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Next session in
          </div>
          <div className="lms-countdown-large__time">
            {countdown.days > 0 && `${countdown.days}d `}
            {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
          </div>
          <div className="lms-countdown-large__date" style={{ marginTop: '0.5rem' }}>
            <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {formatFullDateTime(nextScheduled.scheduledAt)}
          </div>
        </div>
      )}

      {/* Quick access cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Link
          to={`/student/classes/${classId}/recordings`}
          style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 12, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C7D2FE')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E0E7FF')}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Video size={17} color="#4F46E5" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1E1B4B' }}>Recordings</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Past sessions</div>
          </div>
        </Link>

        <Link
          to={`/student/classes/${classId}/attendance`}
          style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 12, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C7D2FE')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E0E7FF')}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={17} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1E1B4B' }}>Attendance</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Your record</div>
          </div>
        </Link>

        <Link
          to={`/student/classes/${classId}/chat`}
          style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 12, padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#C7D2FE')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E0E7FF')}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageCircle size={17} color="#9333ea" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1E1B4B' }}>Group Chat</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Class discussion</div>
          </div>
        </Link>
      </div>

      {/* Missed session notices */}
      {sessions.filter(s => s.status === 'cancelled' && s.missedReason).map(s => (
        <div key={s.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={15} color="#92400e" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: 3 }}>
              Session on {formatDate(s.scheduledAt)} was not conducted
            </div>
            <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.5 }}>
              {s.missedReason}
            </div>
          </div>
        </div>
      ))}

      {/* Notices */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <Megaphone size={15} color="#4F46E5" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E1B4B', margin: 0 }}>Notices</h2>
        </div>
        {notices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
            <Megaphone size={24} style={{ opacity: 0.25, margin: '0 auto 6px', display: 'block' }} />
            <p style={{ fontSize: '0.8rem', margin: 0 }}>No notices posted yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {notices.map(notice => (
              <div key={notice.id} className="lms-notice-item">
                <div className={`lms-notice-item__icon lms-notice-item__icon--${notice.type}`}>
                  {notice.type === 'pdf' ? <FileText size={13} /> : <Megaphone size={13} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="lms-notice-item__title">{notice.title}</div>
                  <div className="lms-notice-item__date">{formatDate(notice.createdAt)}</div>
                  {notice.type === 'pdf' && notice.content ? (
                    <a
                      href={notice.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lms-notice-item__filename"
                      style={{ color: '#3730A3', textDecoration: 'none' }}
                    >
                      📎 {notice.fileName || 'Download PDF'}
                    </a>
                  ) : notice.content ? (
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{notice.content}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
