import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ADMIN_ACTIVITY_FEED,
  ADMIN_KPIS,
  AT_RISK_STUDENTS,
  DAILY_ACTIVE_USERS,
  SCORE_DISTRIBUTION,
} from '../../data/adminOverview'
import '../../styles/admin-overview.css'

export default function AdminDashboardPage() {
  return (
    <div className="admin-overview-page">
      <header className="admin-overview-header">
        <h1>Admin Overview</h1>
        <p>Live operational telemetry and platform performance summary.</p>
      </header>

      <section className="admin-kpi-grid">
        {ADMIN_KPIS.map(kpi => (
          <article className="admin-kpi-card" key={kpi.id}>
            <h4>{kpi.label}</h4>
            <p className="admin-kpi-value">{kpi.value}</p>
            <p className={`admin-kpi-delta ${kpi.trend}`}>{kpi.delta}</p>
          </article>
        ))}
      </section>

      <section className="admin-overview-grid">
        <article className="admin-panel">
          <h3>Daily Active Users (7-Day)</h3>
          <p>Tracks usage momentum and engagement volatility.</p>
          <div className="admin-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY_ACTIVE_USERS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eef7" />
                <XAxis dataKey="day" tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#1a6fad" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-panel admin-panel--events">
          <h3>Recent Platform Events</h3>
          <p>Most recent product, usage, and risk-related events.</p>

          <div className="admin-activity-list">
            {ADMIN_ACTIVITY_FEED.map(item => (
              <div className={`admin-activity-item ${item.severity === 'alert' ? 'alert' : ''}`} key={item.id}>
                <p className="admin-activity-message">{item.message}</p>
                <p className="admin-activity-time">{item.timeAgo}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <h3>Score Distribution</h3>
          <p>Current spread of student performance buckets.</p>
          <div className="admin-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SCORE_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eef7" />
                <XAxis dataKey="bucket" tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1a6fad" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-panel">
          <h3>At-Risk Students</h3>
          <p>Students under threshold (&lt; 50% average) needing intervention.</p>

          <div className="admin-risk-table-wrap">
            <table className="admin-risk-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Avg Score</th>
                  <th>Weak Area</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {AT_RISK_STUDENTS.map(student => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td className="admin-risk-score">{student.avgScore}%</td>
                    <td>{student.weakArea}</td>
                    <td>
                      <span className="admin-risk-chip">At Risk</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
