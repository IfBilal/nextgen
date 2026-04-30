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
        <p>Simple snapshot of students and performance.</p>
      </header>

      <section className="admin-kpi-grid">
        {ADMIN_KPIS.map(kpi => (
          <article className="admin-kpi-card" key={kpi.id}>
            <h4>{kpi.label}</h4>
            <p className="admin-kpi-value">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="admin-overview-grid">
        <article className="admin-panel">
          <h3>Daily Active Users (7-Day)</h3>
          <div className="admin-chart-wrap">
            <div className="admin-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DAILY_ACTIVE_USERS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3730A3" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <h3>Score Distribution</h3>
          <div className="admin-chart-wrap">
            <div className="admin-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SCORE_DISTRIBUTION}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="bucket" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3730A3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <h3>Students Needing Help</h3>

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
                      <span className="admin-risk-chip">Needs Review</span>
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
