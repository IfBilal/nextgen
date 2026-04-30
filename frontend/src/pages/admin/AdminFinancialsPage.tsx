import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ADMIN_FINANCIAL_KPIS,
  ADMIN_INVOICE_STATUSES,
  ADMIN_PLAN_MIX,
  ADMIN_REVENUE_TREND,
} from '../../data/adminMetricsFinancials'
import '../../styles/admin-metrics-financials.css'

export default function AdminFinancialsPage() {
  const [view, setView] = useState<'monthly' | 'quarterly'>('monthly')

  return (
    <div className="admin-financials-page">
      <header className="admin-metrics-header">
        <h1>Financials</h1>
        <p>Revenue health, subscription dynamics, and payment reliability snapshots.</p>
      </header>

      <section className="admin-metrics-controls card">
        <label htmlFor="admin-financials-view">View</label>
        <select id="admin-financials-view" value={view} onChange={event => setView(event.target.value as typeof view)}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
        <span className="admin-metrics-controls__hint">Stripe webhook-backed figures (dummy in this phase).</span>
      </section>

      <section className="admin-financials-kpis">
        {ADMIN_FINANCIAL_KPIS.map(kpi => (
          <article className="admin-financials-kpi" key={kpi.id}>
            <h4>{kpi.label}</h4>
            <p className="value">{kpi.value}</p>
            <p className={`delta ${kpi.trend}`}>{kpi.delta}</p>
          </article>
        ))}
      </section>

      <section className="admin-metrics-grid">
        <article className="card admin-metrics-panel">
          <h3>Revenue + MRR Trend</h3>
          <p>Tracks topline revenue and recurring baseline over time.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ADMIN_REVENUE_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#3730A3" fill="#3730A333" name="Revenue" />
                  <Area type="monotone" dataKey="mrr" stroke="#4fa5df" fill="#4fa5df22" name="MRR" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel">
          <h3>Subscription Plan Mix</h3>
          <p>Paid user concentration by plan type.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ADMIN_PLAN_MIX}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="plan" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="subscribers" fill="#3730A3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel admin-financials-invoices">
          <h3>Payment Reconciliation Feed</h3>
          <p>Latest invoice outcomes from billing gateway sync.</p>
          <div className="admin-metrics-table-wrap">
            <table className="admin-metrics-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Gateway</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_INVOICE_STATUSES.map(row => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.student}</td>
                    <td>{row.amount}</td>
                    <td>
                      <span className={`admin-financials-status ${row.status}`}>{row.status}</span>
                    </td>
                    <td>{row.gateway}</td>
                    <td>{row.updatedAt}</td>
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
