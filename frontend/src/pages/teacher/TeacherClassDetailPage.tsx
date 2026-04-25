import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import {
  getClassById,
  getTeacherSessions,
  getNoticesForClass,
  startSession,
  endSession,
  cancelSession,
  createNotice,
  deleteNotice,
  updateSessionRecording,
  removeSessionRecording,
} from '../../services/lmsApi'
import type { LmsSession, Notice, LmsClass } from '../../types/lms'
import '../../styles/teacher.css'
import {
  Clock,
  Video,
  Users,
  Megaphone,
  FileText,
  Plus,
  Trash2,
  X,
  Play,
  CheckCircle2,
  ChevronLeft,
  Link2,
} from 'lucide-react'

type SessionFilter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'
type Tab = 'sessions' | 'students' | 'notices' | 'recordings'

const MOCK_STUDENTS = [
  { id: 's1', name: 'Student A', joined: '2026-01-15', attended: 8, total: 10 },
  { id: 's2', name: 'Student B', joined: '2026-01-17', attended: 7, total: 10 },
  { id: 's3', name: 'Student C', joined: '2026-01-20', attended: 9, total: 10 },
]

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: LmsSession['status'] }) {
  const map: Record<string, string> = {
    live: 'teacher-status-badge--live',
    scheduled: 'teacher-status-badge--scheduled',
    completed: 'teacher-status-badge--completed',
    cancelled: 'teacher-status-badge--cancelled',
  }
  return (
    <span className={`teacher-status-badge ${map[status] ?? ''}`}>
      {status === 'live' && <span className="teacher-live-pulse">●</span>}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function TeacherClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { teacher } = useTeacherAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [sessions, setSessions] = useState<LmsSession[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  const initialTab = (searchParams.get('tab') as Tab) || 'sessions'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  // Notice modal state
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [noticeType, setNoticeType] = useState<'announcement' | 'pdf'>('announcement')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticeFileName, setNoticeFileName] = useState('')
  const [noticeError, setNoticeError] = useState('')
  const [noticeSubmitting, setNoticeSubmitting] = useState(false)

  // Cancel confirm
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  // Recording management state
  const [recordingInputId, setRecordingInputId] = useState<string | null>(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingSubmitting, setRecordingSubmitting] = useState(false)

  useEffect(() => {
    if (!classId || !teacher) return
    async function load() {
      if (!classId) return
      const [clsData, sessData, noticeData] = await Promise.all([
        getClassById(classId),
        getTeacherSessions(classId),
        getNoticesForClass(classId),
      ])
      setCls(clsData)
      setSessions(sessData)
      setNotices(noticeData)
      setLoading(false)
    }
    load()
  }, [classId, teacher])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleStart(session: LmsSession) {
    const updated = await startSession(session.id)
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    showToast('Session started ✓')
  }

  async function handleEnd(session: LmsSession) {
    const updated = await endSession(session.id)
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
    showToast('Session ended ✓')
  }

  async function handleCancel(sessionId: string) {
    await cancelSession(sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
    setCancelConfirmId(null)
    showToast('Session cancelled')
  }

  async function handleDeleteNotice(noticeId: string) {
    await deleteNotice(noticeId)
    setNotices(prev => prev.filter(n => n.id !== noticeId))
    showToast('Notice deleted')
  }

  async function handlePostNotice() {
    if (!teacher || !classId) return
    if (!noticeTitle.trim()) { setNoticeError('Title is required.'); return }
    if (!noticeContent.trim()) { setNoticeError('Content is required.'); return }
    setNoticeError('')
    setNoticeSubmitting(true)
    try {
      const newNotice = await createNotice(teacher.id, {
        classId,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        type: noticeType,
        fileName: noticeType === 'pdf' ? noticeFileName.trim() : undefined,
      })
      setNotices(prev => [newNotice, ...prev])
      setShowNoticeModal(false)
      setNoticeTitle('')
      setNoticeContent('')
      setNoticeFileName('')
      showToast('Notice posted ✓')
    } catch {
      setNoticeError('Failed to post notice. Please try again.')
    } finally {
      setNoticeSubmitting(false)
    }
  }

  const filteredSessions = sessions.filter(s =>
    sessionFilter === 'all' ? true : s.status === sessionFilter
  ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  if (loading) {
    return (
      <div className="teacher-page">
        <div className="teacher-section">
          <div className="teacher-empty-state">Loading class details…</div>
        </div>
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="teacher-page">
        <div className="teacher-section">
          <div className="teacher-empty-state">Class not found.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="teacher-page">
      {/* Header */}
      <div className="teacher-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <button
              className="teacher-btn teacher-btn--ghost"
              style={{ marginBottom: 8 }}
              onClick={() => navigate('/teacher/classes')}
            >
              <ChevronLeft size={14} />
              All Classes
            </button>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
              {cls.name}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="teacher-class-card__badge">
                <Users size={10} />
                {cls.enrolledStudentIds.length} students
              </span>
              <span className="teacher-class-card__badge">
                <Clock size={10} />
                {cls.defaultDurationMinutes} min default
              </span>
            </div>
          </div>
          <button
            className="teacher-btn teacher-btn--primary"
            onClick={() => navigate(`/teacher/sessions/new?classId=${cls.id}`)}
          >
            <Plus size={14} />
            Schedule Session
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '0 16px 16px' }}>
        <div className="teacher-tabs" style={{ marginBottom: 0, paddingTop: 12 }}>
          {(['sessions', 'students', 'notices', 'recordings'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`teacher-tab ${activeTab === tab ? 'teacher-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'sessions' ? 'Sessions' : tab === 'students' ? 'Students' : tab === 'notices' ? 'Notice Board' : 'Recordings'}
            </button>
          ))}
        </div>

        <div style={{ paddingTop: 16 }}>
          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <>
              <div className="teacher-filter-bar" style={{ marginBottom: 12 }}>
                {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as SessionFilter[]).map(f => (
                  <button
                    key={f}
                    className={`teacher-filter-btn ${sessionFilter === f ? 'teacher-filter-btn--active' : ''}`}
                    onClick={() => setSessionFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="teacher-empty-state">
                  <Video size={32} />
                  <p>No sessions found.</p>
                </div>
              ) : (
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Attended</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(session => (
                      <tr key={session.id}>
                        <td>{formatDate(session.scheduledAt)}</td>
                        <td>{formatTime(session.scheduledAt)}</td>
                        <td>{session.durationMinutes} min</td>
                        <td><StatusBadge status={session.status} /></td>
                        <td>
                          {session.status === 'completed'
                            ? (session.attendanceCount ?? '—')
                            : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {session.status === 'scheduled' && (
                              <>
                                <button
                                  className="teacher-btn teacher-btn--secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => navigate(`/teacher/sessions/${session.id}/edit`)}
                                >
                                  Edit
                                </button>
                                {cancelConfirmId === session.id ? (
                                  <>
                                    <button
                                      className="teacher-btn teacher-btn--danger"
                                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                      onClick={() => handleCancel(session.id)}
                                    >
                                      Confirm Cancel
                                    </button>
                                    <button
                                      className="teacher-btn teacher-btn--ghost"
                                      style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                      onClick={() => setCancelConfirmId(null)}
                                    >
                                      No
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="teacher-btn teacher-btn--ghost"
                                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                    onClick={() => setCancelConfirmId(session.id)}
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  className="teacher-btn teacher-btn--primary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleStart(session)}
                                >
                                  <Play size={11} />
                                  Start
                                </button>
                              </>
                            )}
                            {session.status === 'live' && (
                              <button
                                className="teacher-btn teacher-btn--danger"
                                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                onClick={() => handleEnd(session)}
                              >
                                <CheckCircle2 size={11} />
                                End Session
                              </button>
                            )}
                            {session.status === 'completed' && session.recordingUrl && (
                              <a
                                href={session.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="teacher-btn teacher-btn--secondary"
                                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                              >
                                <Video size={11} />
                                Recording
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <>
              {MOCK_STUDENTS.length === 0 ? (
                <div className="teacher-empty-state">
                  <Users size={32} />
                  <p>No students enrolled yet.</p>
                </div>
              ) : (
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Joined</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_STUDENTS.map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 600, color: '#0d2d5e' }}>{student.name}</td>
                        <td>{formatDate(student.joined)}</td>
                        <td>
                          <span style={{ fontWeight: 700 }}>
                            {student.attended}/{student.total}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#55789c', marginLeft: 4 }}>
                            ({Math.round((student.attended / student.total) * 100)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p style={{ fontSize: '0.75rem', color: '#6a86a7', marginTop: 8 }}>
                Student names are anonymized for privacy. Full details available after backend integration.
              </p>
            </>
          )}

          {/* Notice Board Tab */}
          {activeTab === 'notices' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button
                  className="teacher-btn teacher-btn--primary"
                  onClick={() => setShowNoticeModal(true)}
                >
                  <Plus size={14} />
                  Post Notice
                </button>
              </div>

              {notices.length === 0 ? (
                <div className="teacher-empty-state">
                  <Megaphone size={32} />
                  <p>No notices posted yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {notices.map(notice => (
                    <div key={notice.id} className="teacher-notice-item">
                      <div
                        className={`teacher-notice-item__icon teacher-notice-item__icon--${notice.type}`}
                      >
                        {notice.type === 'pdf' ? <FileText size={15} /> : <Megaphone size={15} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="teacher-notice-item__title">{notice.title}</div>
                        <div className="teacher-notice-item__date">
                          {formatDateTime(notice.createdAt)}
                        </div>
                        {notice.fileName && (
                          <div style={{ fontSize: '0.75rem', color: '#1a6fad', marginTop: 2 }}>
                            📎 {notice.fileName}
                          </div>
                        )}
                        {notice.content && (
                          <p style={{ fontSize: '0.82rem', color: '#55789c', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {notice.content}
                          </p>
                        )}
                      </div>
                      <button
                        className="teacher-btn teacher-btn--ghost"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleDeleteNotice(notice.id)}
                        title="Delete notice"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

          {/* Recordings Tab */}
          {activeTab === 'recordings' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: '#55789c', margin: '0 0 12px' }}>
                Add or remove recording URLs for completed sessions. URLs are visible to enrolled students.
              </p>
              {sessions.filter(s => s.status === 'completed').length === 0 ? (
                <div className="teacher-empty-state"><Video size={28} /><p>No completed sessions yet.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.filter(s => s.status === 'completed').map(session => (
                    <div key={session.id} style={{ background: '#f5f8fc', border: '1px solid #e8f1f8', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0d2d5e', fontSize: '0.87rem' }}>
                            {formatDateTime(session.scheduledAt)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#55789c', marginTop: 2 }}>
                            {session.durationMinutes} min
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {session.recordingUrl ? (
                            <>
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: 99, fontWeight: 700 }}>Available</span>
                              <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer" className="teacher-btn teacher-btn--secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                <Video size={11} /> View
                              </a>
                              <button
                                className="teacher-btn teacher-btn--ghost"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={async () => {
                                  const updated = await removeSessionRecording(session.id)
                                  setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                                  showToast('Recording removed')
                                }}
                              >
                                <Trash2 size={11} /> Remove
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#f1f5f9', color: '#6a86a7', borderRadius: 99, fontWeight: 700 }}>Not uploaded</span>
                              <button
                                className="teacher-btn teacher-btn--primary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => { setRecordingInputId(session.id); setRecordingUrl('') }}
                              >
                                <Link2 size={11} /> Add URL
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {recordingInputId === session.id && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <input
                            className="teacher-form-input"
                            placeholder="Paste recording URL (Zoom, Drive, etc.)"
                            value={recordingUrl}
                            onChange={e => setRecordingUrl(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <button
                            className="teacher-btn teacher-btn--primary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            disabled={!recordingUrl.trim() || recordingSubmitting}
                            onClick={async () => {
                              setRecordingSubmitting(true)
                              const updated = await updateSessionRecording(session.id, recordingUrl.trim())
                              setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                              setRecordingInputId(null)
                              setRecordingUrl('')
                              setRecordingSubmitting(false)
                              showToast('Recording URL saved ✓')
                            }}
                          >
                            {recordingSubmitting ? 'Saving…' : 'Save'}
                          </button>
                          <button className="teacher-btn teacher-btn--ghost" style={{ padding: '6px 10px' }} onClick={() => setRecordingInputId(null)}>
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

      {/* Notice Modal */}
      {showNoticeModal && (
        <div className="teacher-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNoticeModal(false) }}>
          <div className="teacher-modal">
            <div className="teacher-modal__header">
              <h2 className="teacher-modal__title">Post a Notice</h2>
              <button
                className="teacher-btn teacher-btn--ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setShowNoticeModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="teacher-form-field">
              <label className="teacher-form-label">Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['announcement', 'pdf'] as const).map(t => (
                  <button
                    key={t}
                    className={`teacher-btn ${noticeType === t ? 'teacher-btn--primary' : 'teacher-btn--ghost'}`}
                    style={{ padding: '5px 14px' }}
                    onClick={() => setNoticeType(t)}
                  >
                    {t === 'announcement' ? <Megaphone size={13} /> : <FileText size={13} />}
                    {t === 'announcement' ? 'Announcement' : 'PDF'}
                  </button>
                ))}
              </div>
            </div>

            <div className="teacher-form-field">
              <label className="teacher-form-label">Title *</label>
              <input
                className="teacher-form-input"
                placeholder="e.g. Exam schedule update"
                value={noticeTitle}
                onChange={e => setNoticeTitle(e.target.value)}
              />
            </div>

            <div className="teacher-form-field">
              <label className="teacher-form-label">Content *</label>
              <textarea
                className="teacher-form-textarea"
                placeholder="Write your notice here…"
                value={noticeContent}
                onChange={e => setNoticeContent(e.target.value)}
              />
            </div>

            {noticeType === 'pdf' && (
              <div className="teacher-form-field">
                <label className="teacher-form-label">File Name</label>
                <input
                  className="teacher-form-input"
                  placeholder="e.g. lecture-notes-week3.pdf"
                  value={noticeFileName}
                  onChange={e => setNoticeFileName(e.target.value)}
                />
                <span className="teacher-form-hint">
                  Actual file upload will be enabled when backend is connected.
                </span>
              </div>
            )}

            {noticeError && (
              <div className="teacher-form-required-note">{noticeError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="teacher-btn teacher-btn--ghost"
                onClick={() => setShowNoticeModal(false)}
              >
                Cancel
              </button>
              <button
                className="teacher-btn teacher-btn--primary"
                onClick={handlePostNotice}
                disabled={noticeSubmitting}
              >
                {noticeSubmitting ? 'Posting…' : 'Post Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="teacher-toast">{toast}</div>}
    </div>
  )
}
