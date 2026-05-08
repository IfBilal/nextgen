import { useState, useEffect } from 'react'
import {
  adminGetAllSessions,
  adminUpdateSession,
  adminCancelSession,
  adminRemoveSessionRecording,
  getAllClassesWithProducts,
  adminGetProducts,
} from '../../services/lmsApi'
import type { SessionWithClass, ClassWithProduct, Product } from '../../types/lms'
import '../../styles/admin/admin-lms-sessions.css'
import {
  Video,
  Calendar,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react'

type StatusFilter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function StatusBadge({ status }: { status: SessionWithClass['status'] }) {
  const map: Record<string, string> = {
    live: 'admin-lms-badge--live',
    scheduled: 'admin-lms-badge--scheduled',
    completed: 'admin-lms-badge--completed',
    cancelled: 'admin-lms-badge--cancelled',
  }
  return (
    <span className={`admin-lms-badge ${map[status] ?? ''}`}>
      {status === 'live' && <span style={{ animation: 'lms-pulse 2s infinite', display: 'inline-block' }}>●</span>}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function AdminLmsSessionsPage() {
  const [sessions, setSessions] = useState<SessionWithClass[]>([])
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [productFilter, setProductFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Edit modal
  const [editSession, setEditSession] = useState<SessionWithClass | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDuration, setEditDuration] = useState(90)
  const [editChangeNote, setEditChangeNote] = useState('')
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Cancel confirm
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [removingRecordingId, setRemovingRecordingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [s, c, p] = await Promise.all([
        adminGetAllSessions(),
        getAllClassesWithProducts(),
        adminGetProducts(),
      ])
      setSessions(s)
      setClasses(c)
      setProducts(p)
      setLoading(false)
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openEdit(session: SessionWithClass) {
    const d = new Date(session.scheduledAt)
    setEditSession(session)
    setEditDate(d.toISOString().slice(0, 10))
    setEditTime(d.toTimeString().slice(0, 5))
    setEditDuration(session.durationMinutes)
    setEditChangeNote('')
    setEditError('')
  }

  async function handleEditSubmit() {
    if (!editSession) return
    if (!editChangeNote.trim()) { setEditError('Reason for change is required.'); return }
    if (!editDate || !editTime) { setEditError('Date and time are required.'); return }
    setEditError('')
    setEditSubmitting(true)
    try {
      const scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString()
      const updated = await adminUpdateSession(editSession.id, {
        classId: editSession.classId,
        scheduledAt,
        durationMinutes: editDuration,
        changeNote: editChangeNote.trim(),
      })
      setSessions(prev =>
        prev.map(s =>
          s.id === updated.id
            ? { ...updated, className: editSession.className, teacherName: editSession.teacherName, productName: editSession.productName }
            : s
        )
      )
      setEditSession(null)
      showToast('Session updated ✓')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleCancel(sessionId: string) {
    await adminCancelSession(sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
    setCancelConfirmId(null)
    showToast('Session cancelled')
  }

  async function handleRemoveRecording(sessionId: string) {
    setRemovingRecordingId(sessionId)
    try {
      const updated = await adminRemoveSessionRecording(sessionId)
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, recordingUrl: updated.recordingUrl } : s))
      showToast('Recording removed ✓')
    } catch {
      showToast('Failed to remove recording.')
    } finally {
      setRemovingRecordingId(null)
    }
  }

  // Computed stats
  const liveSessions = sessions.filter(s => s.status === 'live')
  const scheduledCount = sessions.filter(s => s.status === 'scheduled').length
  const completedThisMonth = sessions.filter(s => s.status === 'completed' && isThisMonth(s.scheduledAt)).length
  const cancelledThisMonth = sessions.filter(s => s.status === 'cancelled' && isThisMonth(s.scheduledAt)).length

  const filteredClasses = productFilter
    ? classes.filter(c => c.productName === productFilter)
    : classes

  const filteredSessions = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (productFilter && s.productName !== productFilter) return false
    if (classFilter && s.classId !== classFilter) return false
    if (dateFrom && new Date(s.scheduledAt) < new Date(dateFrom)) return false
    if (dateTo && new Date(s.scheduledAt) > new Date(`${dateTo}T23:59:59`)) return false
    return true
  })

  return (
    <div className="admin-lms-sessions-page">
      {/* Header */}
      <div className="admin-lms-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              LMS Sessions
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Platform-wide session management and oversight.
            </p>
          </div>
        </div>
      </div>

      {/* Live sessions banner */}
      {!loading && liveSessions.length > 0 && (
        <div className="admin-lms-live-banner">
          <div className="admin-lms-live-banner__pulse" />
          <span className="admin-lms-live-banner__label">
            {liveSessions.length} session{liveSessions.length !== 1 ? 's' : ''} LIVE right now
          </span>
          <div className="admin-lms-live-banner__sessions">
            {liveSessions.map(s => (
              <span key={s.id} className="admin-lms-live-session-chip">
                {s.className} — {s.teacherName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="admin-lms-kpi-grid">
        <div className="admin-lms-kpi-card">
          <div className="admin-lms-kpi-card__icon"><Calendar size={18} /></div>
          <div className="admin-lms-kpi-card__label">Scheduled</div>
          <div className="admin-lms-kpi-card__value">{scheduledCount}</div>
          <div className="admin-lms-kpi-card__sub">upcoming sessions</div>
        </div>
        <div className={`admin-lms-kpi-card ${liveSessions.length > 0 ? 'admin-lms-kpi-card--live' : ''}`}>
          <div className="admin-lms-kpi-card__icon"><Video size={18} /></div>
          <div className="admin-lms-kpi-card__label">Live Right Now</div>
          <div className="admin-lms-kpi-card__value">{liveSessions.length}</div>
          <div className="admin-lms-kpi-card__sub">
            {liveSessions.length > 0 ? 'sessions in progress' : 'no live sessions'}
          </div>
        </div>
        <div className="admin-lms-kpi-card">
          <div className="admin-lms-kpi-card__icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="admin-lms-kpi-card__label">Completed (Month)</div>
          <div className="admin-lms-kpi-card__value">{completedThisMonth}</div>
          <div className="admin-lms-kpi-card__sub">sessions this month</div>
        </div>
        <div className="admin-lms-kpi-card">
          <div className="admin-lms-kpi-card__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <X size={18} />
          </div>
          <div className="admin-lms-kpi-card__label">Cancelled (Month)</div>
          <div className="admin-lms-kpi-card__value">{cancelledThisMonth}</div>
          <div className="admin-lms-kpi-card__sub">cancelled this month</div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-lms-section">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Product</label>
            <select
              style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '6px 10px', fontSize: '0.83rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer' }}
              value={productFilter}
              onChange={e => { setProductFilter(e.target.value); setClassFilter('') }}
            >
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Class</label>
            <select
              style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '6px 10px', fontSize: '0.83rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer' }}
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>From</label>
            <input
              type="date"
              style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '6px 10px', fontSize: '0.83rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', width: 140 }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>To</label>
            <input
              type="date"
              style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '6px 10px', fontSize: '0.83rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', width: 140 }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          {(productFilter || classFilter || dateFrom || dateTo) && (
            <button
              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280', alignSelf: 'flex-end' }}
              onClick={() => { setProductFilter(''); setClassFilter(''); setDateFrom(''); setDateTo('') }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="admin-lms-filter-bar">
          {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`admin-lms-filter-btn ${statusFilter === f ? 'admin-lms-filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all'
                ? `All (${sessions.length})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${sessions.filter(s => s.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="admin-lms-section">
        {loading ? (
          <div className="admin-lms-empty">Loading sessions…</div>
        ) : filteredSessions.length === 0 ? (
          <div className="admin-lms-empty">
            <Video size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
            <p>No sessions match your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-lms-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th>Product</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Attended</th>
                  <th>Cancellation Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => (
                  <tr key={session.id}>
                    <td>{formatDate(session.scheduledAt)}</td>
                    <td>{formatTime(session.scheduledAt)}</td>
                    <td style={{ fontWeight: 600, color: '#1E1B4B' }}>{session.className}</td>
                    <td>{session.teacherName}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', padding: '2px 8px', borderRadius: 999 }}>
                        {session.productName}
                      </span>
                    </td>
                    <td>{session.durationMinutes} min</td>
                    <td><StatusBadge status={session.status} /></td>
                    <td>
                      {session.status === 'completed' ? (session.attendanceCount ?? '—') : '—'}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      {session.missedReason ? (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', lineHeight: 1.4 }}>
                          {session.missedReason}
                        </span>
                      ) : session.changeNote ? (
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{session.changeNote}</span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {session.status === 'scheduled' && (
                          <>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                              onClick={() => openEdit(session)}
                            >
                              Edit
                            </button>
                            {cancelConfirmId === session.id ? (
                              <>
                                <button
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                  onClick={() => handleCancel(session.id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280' }}
                                  onClick={() => setCancelConfirmId(null)}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button
                                style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280' }}
                                onClick={() => setCancelConfirmId(session.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                        {session.status === 'live' && (
                          <>
                            {session.startUrl && (
                              <button
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                                onClick={() => window.open(session.startUrl!, '_blank', 'noopener,noreferrer')}
                              >
                                <Video size={11} />
                                Join as Host
                              </button>
                            )}
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                              onClick={() => handleCancel(session.id)}
                            >
                              <CheckCircle2 size={11} />
                              End
                            </button>
                          </>
                        )}
                        {session.status === 'completed' && session.recordingUrl && (
                          <>
                            <a
                              href={session.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#6B7280', textDecoration: 'none' }}
                            >
                              <Video size={11} />
                              Recording
                            </a>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: '1px solid #fecaca', borderRadius: 7, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', color: '#dc2626', opacity: removingRecordingId === session.id ? 0.6 : 1 }}
                              disabled={removingRecordingId === session.id}
                              onClick={() => handleRemoveRecording(session.id)}
                            >
                              {removingRecordingId === session.id ? 'Removing…' : '✕ Remove'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editSession && (
        <div className="admin-lms-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditSession(null) }}>
          <div className="admin-lms-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="admin-lms-modal__title">Edit Session (Admin Override)</h2>
              <button
                style={{ background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#6B7280' }}
                onClick={() => setEditSession(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#fff8e1', border: '1px solid #fde68a', borderRadius: 10, padding: 10, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ color: '#b45309' }} />
                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>Admin Override</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#78350f', margin: 0 }}>
                Admin session edits require a change note for audit. Teacher will be notified.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Date *</label>
                <input
                  type="date"
                  style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                  min={todayStr()}
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Start Time *</label>
                <input
                  type="time"
                  style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Duration (minutes)</label>
              <input
                type="number"
                min={15}
                max={300}
                style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', maxWidth: 160 }}
                value={editDuration}
                onChange={e => setEditDuration(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Reason for Change *</label>
              <textarea
                style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
                placeholder="Explain the reason for this change…"
                value={editChangeNote}
                onChange={e => setEditChangeNote(e.target.value)}
              />
            </div>

            {editError && (
              <div style={{ fontSize: '0.82rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', color: '#6B7280' }}
                onClick={() => setEditSession(null)}
              >
                Cancel
              </button>
              <button
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}
                onClick={handleEditSubmit}
                disabled={editSubmitting}
              >
                <Calendar size={14} />
                {editSubmitting ? 'Saving…' : 'Update Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="admin-lms-toast">{toast}</div>}
    </div>
  )
}
