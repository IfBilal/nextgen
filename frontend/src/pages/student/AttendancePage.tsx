import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft } from 'lucide-react'
import { getClassById, getAttendanceForClass } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { AttendanceRecord, LmsClass } from '../../types/lms'
import '../../styles/lms-student.css'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
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
      getClassById(classId),
      getAttendanceForClass(classId, user.id),
    ]).then(([clsData, recData]) => {
      setCls(clsData)
      setRecords(recData)
      setLoading(false)
    })
  }, [classId, user?.id])

  const attended = records.filter(r => r.status === 'attended').length
  const countable = records.filter(r => r.status !== 'cancelled').length
  const pct = countable > 0 ? Math.round((attended / countable) * 100) : 0

  if (loading) return <div style={{ padding: '2rem', color: '#6B7280' }}>Loading…</div>
  if (!cls) return <div style={{ padding: '2rem', color: '#6B7280' }}>Class not found.</div>

  return (
    <div className="lms-session-page">
      <div className="lms-session-header">
        <div>
          <Link to={`/student/classes/${classId}/session`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none', marginBottom: 6 }}>
            <ChevronLeft size={14} /> Back to Class
          </Link>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            My Attendance — {cls.name}
          </h1>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 160, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', lineHeight: 1 }}>
            {pct}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 6 }}>
            {attended} of {countable} sessions attended
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '16px 20px', flex: 2, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Attended', count: records.filter(r => r.status === 'attended').length, color: '#15803d', bg: '#dcfce7' },
              { label: 'Missed', count: records.filter(r => r.status === 'missed').length, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Cancelled', count: records.filter(r => r.status === 'cancelled').length, color: '#6B7280', bg: '#f1f5f9' },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.count}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session list */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, overflow: 'hidden' }}>
        {records.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
            No completed sessions yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.sessionId} style={{ borderBottom: '1px solid #EEF2FF' }}>
                  <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>{formatDate(record.scheduledAt)}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280' }}>{record.durationMinutes} min</td>
                  <td style={{ padding: '12px 16px' }}>
                    {record.status === 'attended' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: '#dcfce7', color: '#15803d', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Attended
                      </span>
                    )}
                    {record.status === 'missed' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: '#fee2e2', color: '#dc2626', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>
                        <XCircle size={12} /> Missed
                      </span>
                    )}
                    {record.status === 'cancelled' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: '#f1f5f9', color: '#6B7280', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>
                        <MinusCircle size={12} /> Cancelled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
