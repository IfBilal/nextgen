import { useMemo, useState } from 'react'
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
  ADMIN_ENGAGEMENT_TREND,
  ADMIN_METRICS_KPIS,
  ADMIN_SCORE_BANDS,
  ADMIN_WEEKLY_ACTIVITY,
  METRICS_RANGE_OPTIONS,
} from '../../data/adminMetricsFinancials'
import '../../styles/admin-metrics-financials.css'

export default function AdminMetricsPage() {
  const [range, setRange] = useState<(typeof METRICS_RANGE_OPTIONS)[number]>('30d')

  const kpis = useMemo(() => ADMIN_METRICS_KPIS, [range])

  return (
    <div className="admin-metrics-page">
      <header className="admin-metrics-header">
        <h1>Global Metrics</h1>
        <p>Platform performance and learner activity overview.</p>
      </header>

      <section className="admin-metrics-controls card">
        <label htmlFor="admin-metrics-range">Window</label>
        <select id="admin-metrics-range" value={range} onChange={event => setRange(event.target.value as typeof range)}>
          {METRICS_RANGE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option.toUpperCase()}
            </option>
          ))}
        </select>
        <span className="admin-metrics-controls__hint">Snapshot updates every 60 seconds.</span>
      </section>

      <section className="admin-metrics-kpis">
        {kpis.map(kpi => (
          <article className="admin-metrics-kpi" key={kpi.id}>
            <h4>{kpi.label}</h4>
            <p className="value">{kpi.value}</p>
            <p className={`delta ${kpi.trend}`}>{kpi.delta}</p>
          </article>
        ))}
      </section>

      <section className="admin-metrics-grid">
        <article className="card admin-metrics-panel">
          <h3>Engagement Trend</h3>
          <p>Simple daily and weekly active user counts.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ADMIN_ENGAGEMENT_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eef7" />
                  <XAxis dataKey="day" tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="dau" stroke="#1a6fad" strokeWidth={3} dot={{ r: 3 }} name="DAU" />
                  <Line type="monotone" dataKey="wau" stroke="#5fb3eb" strokeWidth={2} dot={false} name="WAU" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel">
          <h3>Score Distribution</h3>
          <p>Learners grouped into low, medium, and high score bands.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ADMIN_SCORE_BANDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eef7" />
                  <XAxis dataKey="band" tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#5f7fa2', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="learners" fill="#1a6fad" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel admin-metrics-panel--full-row">
          <h3>Weekly Activity Snapshot</h3>
          <p>Simple weekly view of active learners, tests submitted, and average accuracy.</p>
          <div className="admin-metrics-table-wrap">
            <table className="admin-metrics-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Active Learners</th>
                  <th>Tests Submitted</th>
                  <th>Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_WEEKLY_ACTIVITY.map(row => (
                  <tr key={row.week}>
                    <td>{row.week}</td>
                    <td>{row.activeLearners}</td>
                    <td>{row.testsSubmitted}</td>
                    <td>{row.avgAccuracy}</td>
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
