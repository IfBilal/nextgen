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
      : analytics.perSession.filter(_s => {
          // match sessions that belong to the selected class
          return true
        })

  return (
    <div className="teacher-page">
      {/* Privacy notice */}
      <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#EEF2FF', border: '1px solid #bae6fd', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#3730A3', fontWeight: 600 }}>
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
          <div key={kpi.label} style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <kpi.icon size={16} style={{ color: '#3730A3' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E1B4B' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Class selector */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            Attendance Over Time
          </h2>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '0.82rem', color: '#374151' }}
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
            {/* Y-axis labels + chart */}
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Y-axis */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 36, height: 180 }}>
                {[100, 75, 50, 25, 0].map(v => (
                  <span key={v} style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', lineHeight: 1 }}>{v}%</span>
                ))}
              </div>

              {/* Bars + grid */}
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Grid lines */}
                <div style={{ position: 'absolute', inset: 0, bottom: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} style={{ borderTop: '1px dashed #E5E7EB', width: '100%' }} />
                  ))}
                </div>

                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 144, marginBottom: 0, position: 'relative' }}>
                  {filteredSessions.slice(0, 12).map(s => {
                    const pct = s.attendancePercent ?? 0
                    const barColor = pct >= 80 ? '#4F46E5' : pct >= 60 ? '#d97706' : '#dc2626'
                    return (
                      <div key={s.sessionId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#374151' }}>{pct}%</span>
                        <div
                          title={`${formatDate(s.scheduledAt)} — ${pct}%`}
                          style={{
                            width: '100%',
                            background: barColor,
                            borderRadius: '5px 5px 0 0',
                            height: `${Math.max(4, (pct / 100) * 100)}px`,
                            transition: 'opacity 0.15s',
                            cursor: 'default',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* X-axis date labels */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, height: 30 }}>
                  {filteredSessions.slice(0, 12).map(s => (
                    <div key={s.sessionId} style={{ flex: 1, textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                        {formatDate(s.scheduledAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[
                { label: '≥ 80% — Good', color: '#4F46E5' },
                { label: '60–79% — Average', color: '#d97706' },
                { label: '< 60% — Low', color: '#dc2626' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                  <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{l.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sessions table */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '18px 20px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 14px' }}>
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
