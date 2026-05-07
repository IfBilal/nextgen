import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft, TrendingUp } from 'lucide-react'
import { studentGetClassById, getAttendanceForClass } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { AttendanceRecord, LmsClass } from '../../types/lms'
import '../../styles/lms-student.css'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AttendancePage() {
  const { classId } = useParams<{ classId: string }>()
  const { user } = useStudentAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId || !user?.id) return
    Promise.all([
      studentGetClassById(classId),
      getAttendanceForClass(classId, user.id),
    ]).then(([clsData, recData]) => {
      setCls(clsData)
      setRecords(recData)
      setLoading(false)
    })
  }, [classId, user?.id])

  const attended = records.filter(r => r.status === 'attended').length
  const missed = records.filter(r => r.status === 'missed').length
  const cancelled = records.filter(r => r.status === 'cancelled').length
  const countable = records.filter(r => r.status !== 'cancelled').length
  const pct = countable > 0 ? Math.round((attended / countable) * 100) : 0
  const pctColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626'
  const pctBg = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef3c7' : '#fee2e2'

  if (loading) return <div style={{ padding: '2rem', color: '#6B7280' }}>Loading…</div>
  if (!cls) return <div style={{ padding: '2rem', color: '#6B7280' }}>Class not found.</div>

  return (
    <div className="lms-session-page">

      {/* Header */}
      <div className="lms-session-header">
        <div>
          <Link to={`/student/classes/${classId}/session`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none', marginBottom: 6 }}>
            <ChevronLeft size={14} /> Back to Class
          </Link>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            Attendance — {cls.name}
          </h1>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'stretch' }}>
        {/* Big % */}
        <div style={{ background: pctBg, border: `1px solid ${pctColor}33`, borderRadius: 14, padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: '0.75rem', color: pctColor, fontWeight: 600, marginTop: 4 }}>Attendance Rate</div>
        </div>
        {[
          { label: 'Attended', value: attended, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Missed', value: missed, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: 'Cancelled', value: cancelled, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
        ].map(item => (
          <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '0.78rem', color: item.color, fontWeight: 600, marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance timeline bar chart */}
      {records.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <TrendingUp size={15} color="#4F46E5" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E1B4B' }}>Attendance Over Time</span>
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 10 }}>
            {records.map((r, i) => {
              const color = r.status === 'attended' ? '#16a34a' : r.status === 'missed' ? '#ef4444' : '#D1D5DB'
              return (
                <div
                  key={r.sessionId}
                  title={`${formatDateLong(r.scheduledAt)} — ${r.status}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}
                >
                  <div style={{
                    width: '100%', borderRadius: 5,
                    height: r.status === 'attended' ? 64 : r.status === 'missed' ? 48 : 24,
                    background: color,
                    transition: 'opacity 0.15s',
                    minWidth: 14,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#6B7280' }}>
                    {records.length <= 16 ? formatDate(r.scheduledAt) : i % 2 === 0 ? formatDate(r.scheduledAt) : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {[
              { label: 'Attended', color: '#16a34a' },
              { label: 'Missed', color: '#ef4444' },
              { label: 'Cancelled', color: '#D1D5DB' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session list */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEF2FF' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E1B4B' }}>Session Log</span>
        </div>
        {records.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.87rem' }}>
            No sessions recorded yet.
          </div>
        ) : (
          <div>
            {records.map((record, idx) => (
              <div
                key={record.sessionId}
                style={{
                  display: 'flex', alignItems: 'center', padding: '12px 20px',
                  borderBottom: idx < records.length - 1 ? '1px solid #F3F4F6' : 'none',
                  gap: 14,
                }}
              >
                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {record.status === 'attended' && <CheckCircle2 size={18} color="#16a34a" />}
                  {record.status === 'missed' && <XCircle size={18} color="#dc2626" />}
                  {record.status === 'cancelled' && <MinusCircle size={18} color="#9CA3AF" />}
                </div>

                {/* Date + duration */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem', color: '#1E1B4B' }}>{formatDateLong(record.scheduledAt)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 1 }}>{record.durationMinutes} min</div>
                </div>

                {/* Badge */}
                <div>
                  {record.status === 'attended' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#dcfce7', color: '#15803d', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                      Attended
                    </span>
                  )}
                  {record.status === 'missed' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                      Missed
                    </span>
                  )}
                  {record.status === 'cancelled' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#F1F5F9', color: '#6B7280', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
