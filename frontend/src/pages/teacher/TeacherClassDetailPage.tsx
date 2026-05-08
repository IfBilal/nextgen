import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import {
  getClassById,
  getTeacherSessions,
  getNoticesForClass,
  teacherGetClassStudents,
  startSession,
  endSession,
  cancelSession,
  markSessionMissed,
  createNotice,
  deleteNotice,
  updateSessionRecording,
} from '../../services/lmsApi'
import type { LmsSession, Notice, LmsClass, TeacherStudentSummary } from '../../types/lms'
import { API_BASE_URL } from '../../config/env'
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
  const [students, setStudents] = useState<TeacherStudentSummary[]>([])
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
  const [noticePdfFile, setNoticePdfFile] = useState<File | null>(null)
  const [noticeError, setNoticeError] = useState('')
  const [noticeSubmitting, setNoticeSubmitting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Reason modal — used for both cancellations and missed sessions
  const [reasonModalId, setReasonModalId] = useState<string | null>(null)
  const [reasonModalMode, setReasonModalMode] = useState<'cancel' | 'missed'>('missed')
  const [missedReason, setMissedReason] = useState('')
  const [missedSubmitting, setMissedSubmitting] = useState(false)

  // Recording management state
  const [recordingInputId, setRecordingInputId] = useState<string | null>(null)
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingSubmitting, setRecordingSubmitting] = useState(false)
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!classId || !teacher) return
    async function load() {
      if (!classId) return
      const [clsData, sessData, noticeData, studData] = await Promise.all([
        getClassById(classId),
        getTeacherSessions(classId),
        getNoticesForClass(classId),
        teacherGetClassStudents(classId),
      ])
      setCls(clsData)
      setSessions(sessData)
      setNotices(noticeData)
      setStudents(studData)
      setLoading(false)
    }
    load()
  }, [classId, teacher])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openZoomAsHost(startUrl: string) {
    window.open(startUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleStart(session: LmsSession) {
    if (startingSessionId) return
    setStartingSessionId(session.id)
    try {
      const updated = await startSession(session.id)
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
      if (updated.startUrl) {
        showToast('Opening Zoom — click "Open Zoom" if your browser asks, or install the Zoom desktop app.')
        openZoomAsHost(updated.startUrl)
      } else {
        showToast('Session started but Zoom link unavailable — check credentials.')
      }
    } catch {
      showToast('Failed to start session — Zoom may be unavailable. Try again.')
    } finally {
      setStartingSessionId(null)
    }
  }

  async function handleEnd(session: LmsSession) {
    try {
      const updated = await endSession(session.id)
      setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
      showToast('Session ended ✓')
    } catch {
      showToast('Failed to end session. Please try again.')
    }
  }

  async function handleReasonSubmit() {
    if (!reasonModalId || !missedReason.trim()) return
    setMissedSubmitting(true)
    try {
      if (reasonModalMode === 'cancel') {
        await cancelSession(reasonModalId, missedReason.trim())
        setSessions(prev => prev.map(s => s.id === reasonModalId ? { ...s, status: 'cancelled', missedReason: missedReason.trim() } : s))
        showToast('Session cancelled — reason visible to students')
      } else {
        const updated = await markSessionMissed(reasonModalId, missedReason)
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
        showToast('Reason submitted — students and admin will be notified')
      }
      setReasonModalId(null)
      setMissedReason('')
    } catch {
      showToast('Action failed. Please try again.')
    } finally {
      setMissedSubmitting(false)
    }
  }

  async function handleDeleteNotice(noticeId: string) {
    await deleteNotice(noticeId)
    setNotices(prev => prev.filter(n => n.id !== noticeId))
    showToast('Notice deleted')
  }

  async function handlePostNotice() {
    if (!teacher || !classId) return
    if (!noticeTitle.trim()) { setNoticeError('Title is required.'); return }
    if (noticeType === 'announcement' && !noticeContent.trim()) { setNoticeError('Content is required.'); return }
    if (noticeType === 'pdf' && !noticePdfFile) { setNoticeError('Please select a PDF file.'); return }
    setNoticeError('')
    setNoticeSubmitting(true)
    try {
      let pdfUrl = noticeContent.trim()
      let fileName = noticeFileName.trim()

      if (noticeType === 'pdf' && noticePdfFile) {
        const token = JSON.parse(localStorage.getItem('nextgen.teacher.auth') ?? '{}')?.session?.accessToken ?? ''
        const formData = new FormData()
        formData.append('file', noticePdfFile)
        formData.append('classId', classId)
        const uploadRes = await fetch(`${API_BASE_URL}/teacher/notices/upload-pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('PDF upload failed.')
        const uploadData = await uploadRes.json() as { url: string; fileName: string }
        pdfUrl = uploadData.url
        fileName = uploadData.fileName
      }

      const newNotice = await createNotice(teacher.id, {
        classId,
        title: noticeTitle.trim(),
        content: pdfUrl,
        type: noticeType,
        fileName: noticeType === 'pdf' ? fileName : undefined,
      })
      setNotices(prev => [newNotice, ...prev])
      closeNoticeModal()
      showToast('Notice posted ✓')
    } catch {
      setNoticeError('Failed to post notice. Please try again.')
    } finally {
      setNoticeSubmitting(false)
    }
  }

  function closeNoticeModal() {
    setShowNoticeModal(false)
    setNoticeTitle('')
    setNoticeContent('')
    setNoticeFileName('')
    setNoticePdfFile(null)
    setNoticeError('')
    if (pdfInputRef.current) pdfInputRef.current.value = ''
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
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
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
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '0 16px 16px' }}>
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
                            {session.status === 'scheduled' && (() => {
                              const graceMs = ((session.durationMinutes ?? 60) / 2) * 60 * 1000
                              const isPast = new Date(session.scheduledAt).getTime() + graceMs < Date.now()
                              return isPast ? (
                                <button
                                  className="teacher-btn teacher-btn--danger"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => { setReasonModalId(session.id); setReasonModalMode('missed'); setMissedReason('') }}
                                >
                                  Session Not Taken — Add Reason
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="teacher-btn teacher-btn--secondary"
                                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                    onClick={() => navigate(`/teacher/sessions/${session.id}/edit`)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="teacher-btn teacher-btn--ghost"
                                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                    onClick={() => { setReasonModalId(session.id); setReasonModalMode('cancel'); setMissedReason('') }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="teacher-btn teacher-btn--primary"
                                    style={{ padding: '5px 10px', fontSize: '0.78rem', opacity: startingSessionId === session.id ? 0.6 : 1 }}
                                    disabled={!!startingSessionId}
                                    onClick={() => handleStart(session)}
                                  >
                                    <Play size={11} />
                                    {startingSessionId === session.id ? 'Starting…' : 'Start'}
                                  </button>
                                </>
                              )
                            })()}
                            {session.status === 'live' && (
                              <>
                                <button
                                  className="teacher-btn teacher-btn--primary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => {
                                    if (!session.startUrl) {
                                      showToast('No Zoom link — end and restart the session to generate one.')
                                      return
                                    }
                                    if (session.startedAt) {
                                      const mins = (Date.now() - new Date(session.startedAt).getTime()) / 60000
                                      if (mins > 120) {
                                        showToast('Zoom host link expired (session running >2h). End and restart to get a fresh link.')
                                        return
                                      }
                                      if (mins > 100) {
                                        showToast('Zoom host link expires soon — if it fails, end and restart the session.')
                                      }
                                    }
                                    showToast('Opening Zoom — click "Open Zoom" if your browser asks.')
                                    openZoomAsHost(session.startUrl)
                                  }}
                                >
                                  <Video size={11} />
                                  Join Meeting
                                </button>
                                <button
                                  className="teacher-btn teacher-btn--danger"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleEnd(session)}
                                >
                                  <CheckCircle2 size={11} />
                                  End Session
                                </button>
                              </>
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
                            {session.status === 'cancelled' && session.missedReason && (
                              <span style={{ fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px' }}>
                                Reason: {session.missedReason}
                              </span>
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
              {students.length === 0 ? (
                <div className="teacher-empty-state">
                  <Users size={32} />
                  <p>No students enrolled yet.</p>
                </div>
              ) : (
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Enrolled</th>
                      <th>Access</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.studentId}>
                        <td style={{ fontWeight: 600, color: '#1E1B4B' }}>{student.studentName || '—'}</td>
                        <td style={{ color: '#6B7280', fontSize: '0.82rem' }}>{student.studentEmail}</td>
                        <td>{formatDate(student.enrolledAt)}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                            background: student.accessType === 'full' ? '#dcfce7' : student.accessType === 'demo_active' ? '#fef9c3' : '#fee2e2',
                            color: student.accessType === 'full' ? '#15803d' : student.accessType === 'demo_active' ? '#a16207' : '#dc2626',
                          }}>
                            {student.accessType === 'full' ? 'Full' : student.accessType === 'demo_active' ? 'Demo' : 'Expired'}
                          </span>
                        </td>
                        <td>
                          {student.totalSessions > 0 ? (
                            <>
                              <span style={{ fontWeight: 700 }}>{student.attendedCount}/{student.totalSessions}</span>
                              <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: 4 }}>
                                ({Math.round((student.attendedCount / student.totalSessions) * 100)}%)
                              </span>
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                        {notice.type === 'pdf' && notice.content ? (
                          <a
                            href={notice.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#3730A3', marginTop: 2, display: 'inline-block' }}
                          >
                            📎 {notice.fileName || 'Download PDF'}
                          </a>
                        ) : notice.content ? (
                          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {notice.content}
                          </p>
                        ) : null}
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
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 12px' }}>
                Add or remove recording URLs for completed sessions. URLs are visible to enrolled students.
              </p>
              {sessions.filter(s => s.status === 'completed').length === 0 ? (
                <div className="teacher-empty-state"><Video size={28} /><p>No completed sessions yet.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.filter(s => s.status === 'completed').map(session => (
                    <div key={session.id} style={{ background: '#F9FAFB', border: '1px solid #EEF2FF', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1E1B4B', fontSize: '0.87rem' }}>
                            {formatDateTime(session.scheduledAt)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
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
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#f1f5f9', color: '#6B7280', borderRadius: 99, fontWeight: 700 }}>Not uploaded</span>
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
                              try {
                                const updated = await updateSessionRecording(session.id, recordingUrl.trim())
                                setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
                                setRecordingInputId(null)
                                setRecordingUrl('')
                                showToast('Recording URL saved ✓')
                              } catch {
                                showToast('Failed to save recording URL. Please try again.')
                              } finally {
                                setRecordingSubmitting(false)
                              }
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
        <div className="teacher-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeNoticeModal() }}>
          <div className="teacher-modal">
            <div className="teacher-modal__header">
              <h2 className="teacher-modal__title">Post a Notice</h2>
              <button
                className="teacher-btn teacher-btn--ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => closeNoticeModal()}
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
                <label className="teacher-form-label">PDF File *</label>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    setNoticePdfFile(file)
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="teacher-btn teacher-btn--ghost"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    <FileText size={13} /> {noticePdfFile ? 'Change file' : 'Choose PDF'}
                  </button>
                  {noticePdfFile && (
                    <span style={{ fontSize: '0.78rem', color: '#374151' }}>
                      {noticePdfFile.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            {noticeError && (
              <div className="teacher-form-required-note">{noticeError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="teacher-btn teacher-btn--ghost"
                onClick={() => closeNoticeModal()}
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

      {/* Reason Modal — cancel or missed */}
      {reasonModalId && (
        <div className="teacher-modal-overlay">
          <div className="teacher-modal" style={{ maxWidth: 460 }}>
            <div className="teacher-modal__header">
              <h2 className="teacher-modal__title">
                {reasonModalMode === 'cancel' ? 'Cancel Session — Reason Required' : 'Session Not Taken — Reason Required'}
              </h2>
            </div>
            <p style={{ fontSize: '0.83rem', color: '#6B7280', margin: '0 0 14px' }}>
              A reason is <strong>required</strong>. It will be visible to all students in this class and to the admin.
            </p>
            <textarea
              value={missedReason}
              onChange={e => setMissedReason(e.target.value)}
              placeholder={reasonModalMode === 'cancel'
                ? 'e.g. This session is being cancelled due to a public holiday. A makeup session will be scheduled next week.'
                : 'e.g. Due to a personal emergency, I was unable to conduct today\'s session. I will reschedule it shortly.'}
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '0.87rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                className="teacher-btn teacher-btn--primary"
                disabled={missedReason.trim().length < 3 || missedSubmitting}
                onClick={handleReasonSubmit}
              >
                {missedSubmitting ? 'Submitting…' : 'Submit Reason'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="teacher-toast">{toast}</div>}
    </div>
  )
}
