import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

export default function AdminMetricsPage() {
  return (
    <div className="admin-shell-page">
      <header className="admin-shell-page__header">
        <h1>Global Metrics</h1>
        <p>Cohort-level performance trends and engagement diagnostics shell.</p>
      </header>

      <section className="admin-shell-grid">
        <article className="admin-shell-card">
          <h3>Engagement Trend</h3>
          <p>Scaffold chart area for DAU, weekly return rate, and session depth.</p>
          <span className="admin-shell-chip"><TrendingUp size={12} /> Chart Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Score Distribution</h3>
          <p>Scaffold histogram area for performance buckets by cohort.</p>
          <span className="admin-shell-chip"><BarChart3 size={12} /> Chart Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Weak Subject Mix</h3>
          <p>Scaffold visual for dominant weak-topic share across users.</p>
          <span className="admin-shell-chip"><PieChart size={12} /> Insight Slot</span>
        </article>
      </section>
    </div>
  )
}
