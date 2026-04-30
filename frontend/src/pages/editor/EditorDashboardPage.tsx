import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditorAuth } from '../../context/EditorAuthContext'
import {
  adminGetTeachers,
  adminGetProducts,
  adminGetAllSessions,
  adminApproveTeacher,
} from '../../services/lmsApi'
import type { Teacher, Product, SessionWithClass } from '../../types/lms'
import '../../styles/editor.css'
import {
  BookOpen,
  Users,
  Video,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  return d >= weekStart && d <= weekEnd
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

export default function EditorDashboardPage() {
  const { editor } = useEditorAuth()
  const navigate = useNavigate()

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sessions, setSessions] = useState<SessionWithClass[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [t, p, s] = await Promise.all([
        adminGetTeachers(),
        adminGetProducts(),
        adminGetAllSessions(),
      ])
      setTeachers(t)
      setProducts(p)
      setSessions(s)
      setLoading(false)
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const pendingTeachers = teachers.filter(t => t.status === 'pending')
  const activeProducts = products.filter(p => p.isActive)
  const allClassIds = new Set(products.flatMap(p => p.classIds))
  const sessionsThisWeek = sessions.filter(s => isThisWeek(s.scheduledAt))
  const upcomingSessions = sessions
    .filter(s => s.status === 'scheduled' || s.status === 'live')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5)

  async function handleQuickApprove() {
    if (pendingTeachers.length === 0) return
    setApproving(true)
    try {
      const first = pendingTeachers[0]
      const updated = await adminApproveTeacher(first.id)
      setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t))
      showToast(`${updated.name} approved ✓`)
    } catch {
      showToast('Failed to approve teacher.')
    } finally {
      setApproving(false)
    }
  }

  if (!editor) return null

  return (
    <div className="editor-page">
      {/* Header */}
      <div className="editor-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Editor Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Welcome, {editor.name}. Here's the platform overview.
            </p>
          </div>
          <button
            className="editor-btn editor-btn--secondary"
            onClick={() => navigate('/editor/sessions')}
          >
            <Video size={14} />
            All Sessions
          </button>
        </div>
      </div>

      {/* Pending Teachers Alert */}
      {!loading && pendingTeachers.length > 0 && (
        <div className="editor-alert">
          <AlertTriangle size={18} className="editor-alert__icon" />
          <div style={{ flex: 1 }}>
            <p className="editor-alert__title">
              {pendingTeachers.length} teacher{pendingTeachers.length !== 1 ? 's' : ''} awaiting approval
            </p>
            <p className="editor-alert__body">
              {pendingTeachers.map(t => t.name).join(', ')} — review and approve to grant portal access.
            </p>
          </div>
          <button
            className="editor-btn editor-btn--primary"
            style={{ flexShrink: 0 }}
            onClick={handleQuickApprove}
            disabled={approving}
          >
            <CheckCircle2 size={14} />
            {approving ? 'Approving…' : `Approve ${pendingTeachers[0].name.split(' ')[0]}`}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="editor-kpi-grid">
        <div className="editor-kpi-card">
          <div className="editor-kpi-card__icon"><BookOpen size={18} /></div>
          <div className="editor-kpi-card__label">Active Products</div>
          <div className="editor-kpi-card__value">{activeProducts.length}</div>
          <div className="editor-kpi-card__sub">of {products.length} total</div>
        </div>
        <div className="editor-kpi-card">
          <div className="editor-kpi-card__icon"><Users size={18} /></div>
          <div className="editor-kpi-card__label">Total Classes</div>
          <div className="editor-kpi-card__value">{allClassIds.size}</div>
          <div className="editor-kpi-card__sub">across all products</div>
        </div>
        <div className={`editor-kpi-card ${pendingTeachers.length > 0 ? 'editor-kpi-card--amber' : ''}`}>
          <div
            className="editor-kpi-card__icon"
            style={pendingTeachers.length > 0 ? { background: '#fef3c7', color: '#b45309' } : {}}
          >
            <Users size={18} />
          </div>
          <div className="editor-kpi-card__label">Pending Teachers</div>
          <div className="editor-kpi-card__value">{pendingTeachers.length}</div>
          <div className="editor-kpi-card__sub">
            {pendingTeachers.length > 0 ? 'require approval' : 'all approved'}
          </div>
        </div>
        <div className="editor-kpi-card">
          <div className="editor-kpi-card__icon"><Clock size={18} /></div>
          <div className="editor-kpi-card__label">Sessions This Week</div>
          <div className="editor-kpi-card__value">{sessionsThisWeek.length}</div>
          <div className="editor-kpi-card__sub">
            {sessionsThisWeek.filter(s => s.status === 'live').length} live now
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="editor-section">
        <div className="editor-section__header">
          <h2 className="editor-section__title">Upcoming Sessions</h2>
          <button
            className="editor-btn editor-btn--ghost"
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
            onClick={() => navigate('/editor/sessions')}
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="editor-empty-state">Loading sessions…</div>
        ) : upcomingSessions.length === 0 ? (
          <div className="editor-empty-state">
            <Video size={32} />
            <p>No upcoming sessions.</p>
          </div>
        ) : (
          <table className="editor-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Class</th>
                <th>Teacher</th>
                <th>Product</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map(session => (
                <tr key={session.id}>
                  <td style={{ fontWeight: 600 }}>{formatDateTime(session.scheduledAt)}</td>
                  <td style={{ color: '#1E1B4B', fontWeight: 600 }}>{session.className}</td>
                  <td>{session.teacherName}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#EEF2FF',
                        color: '#3730A3',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {session.productName}
                    </span>
                  </td>
                  <td><StatusBadge status={session.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className="editor-toast">{toast}</div>}
    </div>
  )
}
