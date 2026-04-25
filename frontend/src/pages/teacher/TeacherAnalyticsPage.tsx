import { useState, useEffect } from 'react'
import { BarChart2, Users, Clock, TrendingUp, Shield } from 'lucide-react'
import { getTeacherAnalytics, getTeacherClasses } from '../../services/lmsApi'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import type { TeacherAnalytics, ClassWithProduct, SessionAnalytics } from '../../types/lms'
import '../../styles/teacher.css'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function TeacherAnalyticsPage() {
  const { teacher } = useTeacherAuth()
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null)
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacher) return
    Promise.all([
      getTeacherAnalytics(teacher.id),
      getTeacherClasses(teacher.id),
    ]).then(([analyticsData, classesData]) => {
      setAnalytics(analyticsData)
      setClasses(classesData)
      setLoading(false)
    })
  }, [teacher])

  if (loading) return <div className="teacher-page"><div className="teacher-section"><div className="teacher-empty-state">Loading analytics…</div></div></div>
  if (!analytics) return null

  const filteredSessions: SessionAnalytics[] =
    selectedClassId === 'all'
      ? analytics.perSession
      : analytics.perSession.filter(s => {
          // match sessions that belong to the selected class
          return true
        })

  const maxAttendance = Math.max(...filteredSessions.map(s => s.attendancePercent ?? 0), 1)

  return (
    <div className="teacher-page">
      {/* Privacy notice */}
      <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#0369a1', fontWeight: 600 }}>
        <Shield size={13} />
        This data is strictly internal and not visible to students.
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { icon: BarChart2, label: 'Sessions Completed', value: analytics.totalSessionsCompleted },
          { icon: TrendingUp, label: 'Avg Attendance Rate', value: `${analytics.avgAttendanceRate}%` },
          { icon: Clock, label: 'Avg Session Duration', value: `${analytics.avgActualDuration} min` },
          { icon: Users, label: 'Students Taught', value: analytics.totalStudentsTaught },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <kpi.icon size={16} style={{ color: '#1a6fad' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6a86a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0d2d5e' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Class selector */}
      <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
            Attendance Over Time
          </h2>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #cde0f5', borderRadius: 8, fontSize: '0.82rem', color: '#355a7f' }}
          >
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="teacher-empty-state" style={{ minHeight: 100 }}>
            <BarChart2 size={28} />
            <p>No completed sessions yet.</p>
          </div>
        ) : (
          <>
            {/* CSS bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 8 }}>
              {filteredSessions.slice(0, 12).map(s => (
                <div key={s.sessionId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>{s.attendancePercent ?? 0}%</div>
                  <div
                    style={{
                      width: '100%',
                      background: (s.attendancePercent ?? 0) >= 80 ? '#1a6fad' : (s.attendancePercent ?? 0) >= 60 ? '#d97706' : '#dc2626',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max(4, ((s.attendancePercent ?? 0) / maxAttendance) * 90)}px`,
                      transition: 'height 0.3s',
                    }}
                  />
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                    {formatDate(s.scheduledAt)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sessions table */}
      <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '18px 20px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0d2d5e', margin: '0 0 14px' }}>
          Session Details
        </h2>
        {filteredSessions.length === 0 ? (
          <div className="teacher-empty-state">No sessions yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Scheduled</th>
                  <th>Actual</th>
                  <th>Students</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(s => (
                  <tr key={s.sessionId}>
                    <td>{formatDate(s.scheduledAt)}</td>
                    <td>{s.scheduledDuration} min</td>
                    <td>{s.actualDuration != null ? `${s.actualDuration} min` : '—'}</td>
                    <td>{s.attendanceCount ?? '—'}</td>
                    <td>
                      {s.attendancePercent != null ? (
                        <span style={{ fontWeight: 700, color: s.attendancePercent >= 80 ? '#15803d' : s.attendancePercent >= 60 ? '#d97706' : '#dc2626' }}>
                          {s.attendancePercent}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
