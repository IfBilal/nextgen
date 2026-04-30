import { useState, useEffect } from 'react'
import {
  adminGetTeachers,
  adminApproveTeacher,
  adminRejectTeacher,
  adminReinstateTeacher,
  adminCreateEditor,
} from '../../services/lmsApi'
import type { Teacher } from '../../types/lms'
import '../../styles/admin/admin-teachers.css'
import {
  Users,
  CheckCircle2,
  X,
  UserPlus,
  Clock,
  XCircle,
} from 'lucide-react'

type TeacherFilter = 'all' | 'pending' | 'approved' | 'suspended'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: Teacher['status'] }) {
  const map: Record<string, string> = {
    approved: 'admin-teachers-badge--approved',
    pending: 'admin-teachers-badge--pending',
    suspended: 'admin-teachers-badge--suspended',
  }
  return (
    <span className={`admin-teachers-badge ${map[status] ?? ''}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TeacherFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  // Create editor modal
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [editorName, setEditorName] = useState('')
  const [editorEmail, setEditorEmail] = useState('')
  const [editorPassword, setEditorPassword] = useState('')
  const [editorError, setEditorError] = useState('')
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const [editorSuccess, setEditorSuccess] = useState<{ name: string; email: string; password: string } | null>(null)

  useEffect(() => {
    adminGetTeachers().then(t => {
      setTeachers(t)
      setLoading(false)
    })
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove(id: string) {
    const updated = await adminApproveTeacher(id)
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t))
    showToast(`${updated.name} approved ✓`)
  }

  async function handleReject(id: string) {
    const updated = await adminRejectTeacher(id)
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t))
    showToast(`${updated.name} rejected`)
  }

  async function handleReinstate(id: string) {
    const updated = await adminReinstateTeacher(id)
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t))
    showToast(`${updated.name} reinstated ✓`)
  }

  async function handleSuspend(id: string) {
    const updated = await adminRejectTeacher(id)
    setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t))
    showToast(`${updated.name} suspended`)
  }

  async function handleCreateEditor() {
    if (!editorName.trim()) { setEditorError('Name is required.'); return }
    if (!editorEmail.trim()) { setEditorError('Email is required.'); return }
    if (!editorPassword.trim() || editorPassword.length < 6) { setEditorError('Password must be at least 6 characters.'); return }
    setEditorError('')
    setEditorSubmitting(true)
    try {
      await adminCreateEditor({
        name: editorName.trim(),
        email: editorEmail.trim().toLowerCase(),
        password: editorPassword,
      })
      setEditorSuccess({ name: editorName.trim(), email: editorEmail.trim().toLowerCase(), password: editorPassword })
      setEditorName('')
      setEditorEmail('')
      setEditorPassword('')
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to create editor.')
    } finally {
      setEditorSubmitting(false)
    }
  }

  const totals = {
    all: teachers.length,
    pending: teachers.filter(t => t.status === 'pending').length,
    approved: teachers.filter(t => t.status === 'approved').length,
    suspended: teachers.filter(t => t.status === 'suspended').length,
  }

  const filtered = teachers.filter(t => filter === 'all' ? true : t.status === filter)

  return (
    <div className="admin-teachers-page">
      {/* Header */}
      <div className="admin-teachers-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Teacher Management
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Approve, manage, and create accounts for teachers and editors.
            </p>
          </div>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#3730A3',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.83rem',
              cursor: 'pointer',
            }}
            onClick={() => { setShowEditorModal(true); setEditorSuccess(null) }}
          >
            <UserPlus size={14} />
            Create Editor
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-teachers-kpi-grid">
        <div className="admin-teachers-kpi-card">
          <div className="admin-teachers-kpi-card__icon"><Users size={18} /></div>
          <div className="admin-teachers-kpi-card__label">Total Teachers</div>
          <div className="admin-teachers-kpi-card__value">{totals.all}</div>
          <div className="admin-teachers-kpi-card__sub">registered on platform</div>
        </div>
        <div className={`admin-teachers-kpi-card ${totals.pending > 0 ? 'admin-teachers-kpi-card--pending' : ''}`}>
          <div
            className="admin-teachers-kpi-card__icon"
            style={totals.pending > 0 ? { background: '#fef3c7', color: '#b45309' } : {}}
          >
            <Clock size={18} />
          </div>
          <div className="admin-teachers-kpi-card__label">Pending Approval</div>
          <div className="admin-teachers-kpi-card__value">{totals.pending}</div>
          <div className="admin-teachers-kpi-card__sub">
            {totals.pending > 0 ? 'awaiting review' : 'all clear'}
          </div>
        </div>
        <div className="admin-teachers-kpi-card">
          <div className="admin-teachers-kpi-card__icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="admin-teachers-kpi-card__label">Active</div>
          <div className="admin-teachers-kpi-card__value">{totals.approved}</div>
          <div className="admin-teachers-kpi-card__sub">approved and teaching</div>
        </div>
        <div className="admin-teachers-kpi-card">
          <div className="admin-teachers-kpi-card__icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <XCircle size={18} />
          </div>
          <div className="admin-teachers-kpi-card__label">Suspended</div>
          <div className="admin-teachers-kpi-card__value">{totals.suspended}</div>
          <div className="admin-teachers-kpi-card__sub">access revoked</div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="admin-teachers-section">
        <div className="admin-teachers-section__header">
          <h2 className="admin-teachers-section__title">Teachers</h2>
        </div>

        <div className="admin-teachers-tabs">
          {(['all', 'pending', 'approved', 'suspended'] as TeacherFilter[]).map(f => (
            <button
              key={f}
              className={`admin-teachers-tab ${filter === f ? 'admin-teachers-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${totals.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${totals[f]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="admin-teachers-empty">Loading teachers…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-teachers-empty">No teachers in this category.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-teachers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Classes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(teacher => (
                  <tr key={teacher.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1E1B4B' }}>{teacher.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 1 }}>
                        {teacher.bio.slice(0, 60)}{teacher.bio.length > 60 ? '…' : ''}
                      </div>
                    </td>
                    <td>{teacher.email}</td>
                    <td>{teacher.phone}</td>
                    <td>{formatDate(teacher.registeredAt)}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{teacher.assignedClassIds.length}</span>
                    </td>
                    <td><StatusBadge status={teacher.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {teacher.status === 'pending' && (
                          <>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                              onClick={() => handleApprove(teacher.id)}
                            >
                              <CheckCircle2 size={12} />
                              Approve
                            </button>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                              onClick={() => handleReject(teacher.id)}
                            >
                              <X size={12} />
                              Reject
                            </button>
                          </>
                        )}
                        {teacher.status === 'approved' && (
                          <button
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                            onClick={() => handleSuspend(teacher.id)}
                          >
                            Suspend
                          </button>
                        )}
                        {teacher.status === 'suspended' && (
                          <button
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#E0E7FF', color: '#4338CA', border: '1px solid #bfdbfe', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                            onClick={() => handleReinstate(teacher.id)}
                          >
                            Reinstate
                          </button>
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

      {/* Create Editor Modal */}
      {showEditorModal && (
        <div className="admin-teachers-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowEditorModal(false); setEditorSuccess(null) } }}>
          <div className="admin-teachers-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="admin-teachers-modal__title">Create Editor Account</h2>
              <button
                style={{ background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#6B7280' }}
                onClick={() => { setShowEditorModal(false); setEditorSuccess(null) }}
              >
                <X size={16} />
              </button>
            </div>

            {editorSuccess ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontWeight: 700, color: '#15803d', margin: '0 0 6px', fontSize: '0.9rem' }}>
                    Editor account created successfully ✓
                  </p>
                  <p style={{ fontSize: '0.83rem', color: '#166534', margin: 0 }}>
                    Share these credentials securely with the editor:
                  </p>
                </div>
                <div style={{ background: '#F9FAFB', border: '1px solid #E0E7FF', borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: '0.85rem', color: '#1E1B4B', display: 'grid', gap: 4 }}>
                  <div><strong>Name:</strong> {editorSuccess.name}</div>
                  <div><strong>Email:</strong> {editorSuccess.email}</div>
                  <div><strong>Password:</strong> {editorSuccess.password}</div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>
                  Make sure to share these credentials through a secure channel. The password cannot be retrieved after this dialog is closed.
                </p>
                <button
                  style={{ padding: '8px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setShowEditorModal(false); setEditorSuccess(null) }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <p style={{ fontSize: '0.83rem', color: '#6B7280', margin: 0 }}>
                  Create an editor account. The editor can sign in at /editor/login.
                </p>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Full Name *</label>
                  <input
                    style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                    placeholder="e.g. Ali Hassan"
                    value={editorName}
                    onChange={e => setEditorName(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Email *</label>
                  <input
                    style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                    type="email"
                    placeholder="editor@example.com"
                    value={editorEmail}
                    onChange={e => setEditorEmail(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#3730A3' }}>Password *</label>
                  <input
                    style={{ border: '1.5px solid #C7D2FE', borderRadius: 10, padding: '8px 12px', fontSize: '0.9rem', color: '#1E1B4B', background: '#F9FAFB', outline: 'none', fontFamily: 'inherit' }}
                    type="text"
                    placeholder="Minimum 6 characters"
                    value={editorPassword}
                    onChange={e => setEditorPassword(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    You'll be shown these credentials once after creation.
                  </span>
                </div>

                {editorError && (
                  <div style={{ fontSize: '0.82rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>
                    {editorError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #e8f0fb', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', color: '#6B7280' }}
                    onClick={() => setShowEditorModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer' }}
                    onClick={handleCreateEditor}
                    disabled={editorSubmitting}
                  >
                    <UserPlus size={14} />
                    {editorSubmitting ? 'Creating…' : 'Create Editor'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="admin-teachers-toast">{toast}</div>}
    </div>
  )
}
