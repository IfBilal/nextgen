import { useState, useEffect } from 'react'
import {
  editorGetSessions,
  editorGetClassesWithProducts,
  editorUpdateSession,
  editorCancelSession,
  editorGetProducts,
  generateMeetingLink,
} from '../../services/lmsApi'
import type { SessionWithClass, ClassWithProduct, Product } from '../../types/lms'
import '../../styles/editor.css'
import {
  Video,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react'

type StatusFilter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function StatusBadge({ status }: { status: SessionWithClass['status'] }) {
  const map: Record<string, string> = {
    live: 'editor-status-badge--live',
    scheduled: 'editor-status-badge--scheduled',
    completed: 'editor-status-badge--completed',
    cancelled: 'editor-status-badge--cancelled',
  }
  return (
    <span className={`editor-status-badge ${map[status] ?? ''}`}>
      {status === 'live' && <span className="editor-live-pulse">●</span>}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function EditorSessionsPage() {
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
  const [editLink, setEditLink] = useState('')
  const [editChangeNote, setEditChangeNote] = useState('')
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Cancel confirm
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [s, c, p] = await Promise.all([
        editorGetSessions(),
        editorGetClassesWithProducts(),
        editorGetProducts(),
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
    setEditLink(session.meetingLink ?? '')
    setEditChangeNote('')
    setEditError('')
  }

  async function handleEditSubmit() {
    if (!editSession) return
    if (!editChangeNote.trim()) {
      setEditError('Reason for change is required.')
      return
    }
    if (!editDate || !editTime) {
      setEditError('Date and time are required.')
      return
    }
    setEditError('')
    setEditSubmitting(true)
    try {
      const scheduledAt = new Date(`${editDate}T${editTime}:00`).toISOString()
      const updated = await editorUpdateSession(editSession.id, {
        classId: editSession.classId,
        scheduledAt,
        durationMinutes: editDuration,
        meetingLink: editLink.trim(),
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
      setEditError(err instanceof Error ? err.message : 'Failed to update session.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleCancel(sessionId: string) {
    await editorCancelSession(sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
    setCancelConfirmId(null)
    showToast('Session cancelled')
  }

  const filteredSessions = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (productFilter && s.productName !== productFilter) return false
    if (classFilter && s.classId !== classFilter) return false
    if (dateFrom && new Date(s.scheduledAt) < new Date(dateFrom)) return false
    if (dateTo && new Date(s.scheduledAt) > new Date(`${dateTo}T23:59:59`)) return false
    return true
  })

  const filteredClasses = productFilter
    ? classes.filter(c => c.productName === productFilter)
    : classes

  return (
    <div className="editor-page">
      {/* Header */}
      <div className="editor-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Session Management
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              View, edit, and manage all sessions across the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="editor-section">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Product</label>
            <select
              className="editor-form-select"
              style={{ fontSize: '0.83rem', padding: '6px 10px' }}
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
              className="editor-form-select"
              style={{ fontSize: '0.83rem', padding: '6px 10px' }}
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
              className="editor-form-input"
              style={{ fontSize: '0.83rem', padding: '6px 10px', width: 140 }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>To</label>
            <input
              type="date"
              className="editor-form-input"
              style={{ fontSize: '0.83rem', padding: '6px 10px', width: 140 }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          {(productFilter || classFilter || dateFrom || dateTo) && (
            <button
              className="editor-btn editor-btn--ghost"
              style={{ padding: '6px 10px', fontSize: '0.78rem', alignSelf: 'flex-end' }}
              onClick={() => { setProductFilter(''); setClassFilter(''); setDateFrom(''); setDateTo('') }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="editor-filter-bar">
          {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <button
              key={f}
              className={`editor-filter-btn ${statusFilter === f ? 'editor-filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? `All (${sessions.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${sessions.filter(s => s.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="editor-section">
        {loading ? (
          <div className="editor-empty-state">Loading sessions…</div>
        ) : filteredSessions.length === 0 ? (
          <div className="editor-empty-state">
            <Video size={32} />
            <p>No sessions match your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th>Product</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Change Note</th>
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
                      {session.changeNote ? (
                        <span
                          title={session.changeNote}
                          style={{ fontSize: '0.75rem', color: '#b45309', cursor: 'help', textDecoration: 'underline dotted' }}
                        >
                          View note
                        </span>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {session.status === 'scheduled' && (
                          <>
                            <button
                              className="editor-btn editor-btn--secondary"
                              style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                              onClick={() => openEdit(session)}
                            >
                              Edit
                            </button>
                            {cancelConfirmId === session.id ? (
                              <>
                                <button
                                  className="editor-btn editor-btn--danger"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleCancel(session.id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="editor-btn editor-btn--ghost"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => setCancelConfirmId(null)}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button
                                className="editor-btn editor-btn--ghost"
                                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                onClick={() => setCancelConfirmId(session.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                        {session.status === 'live' && (
                          <button
                            className="editor-btn editor-btn--danger"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                            onClick={() => handleCancel(session.id)}
                          >
                            <CheckCircle2 size={11} />
                            End
                          </button>
                        )}
                        {session.status === 'completed' && (
                          <a
                            href="#"
                            className="editor-btn editor-btn--ghost"
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
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editSession && (
        <div className="editor-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditSession(null) }}>
          <div className="editor-modal">
            <div className="editor-modal__header">
              <h2 className="editor-modal__title">Edit Session</h2>
              <button
                className="editor-btn editor-btn--ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => setEditSession(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="editor-change-note-section">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ color: '#b45309' }} />
                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>
                  Audit Notice
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#78350f', margin: 0 }}>
                A reason for change is required and will be logged for audit purposes.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="editor-form-field">
                <label className="editor-form-label">Date *</label>
                <input
                  type="date"
                  className="editor-form-input"
                  min={todayStr()}
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />
              </div>
              <div className="editor-form-field">
                <label className="editor-form-label">Start Time *</label>
                <input
                  type="time"
                  className="editor-form-input"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                />
              </div>
            </div>

            <div className="editor-form-field">
              <label className="editor-form-label">Duration (minutes)</label>
              <input
                type="number"
                className="editor-form-input"
                min={15}
                max={300}
                value={editDuration}
                onChange={e => setEditDuration(Number(e.target.value))}
                style={{ maxWidth: 160 }}
              />
            </div>

            <div className="editor-form-field">
              <label className="editor-form-label">Meeting Link</label>
              <input
                className="editor-form-input"
                value={editLink}
                onChange={e => setEditLink(e.target.value)}
              />
              <button
                className="editor-btn editor-btn--ghost"
                style={{ padding: '4px 10px', fontSize: '0.78rem', width: 'fit-content', marginTop: 4 }}
                onClick={() => setEditLink(generateMeetingLink(editSession.classId))}
              >
                Regenerate Link
              </button>
            </div>

            <div className="editor-form-field">
              <label className="editor-form-label">Reason for Change *</label>
              <textarea
                className="editor-form-textarea"
                placeholder="Explain why this session is being changed…"
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
              <button className="editor-btn editor-btn--ghost" onClick={() => setEditSession(null)}>
                Cancel
              </button>
              <button
                className="editor-btn editor-btn--primary"
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

      {toast && <div className="editor-toast">{toast}</div>}
    </div>
  )
}
