import { CreditCard, DollarSign, RefreshCcw } from 'lucide-react'

export default function AdminFinancialsPage() {
  return (
    <div className="admin-shell-page">
      <header className="admin-shell-page__header">
        <h1>Financials</h1>
        <p>Revenue and subscription shell prepared for Stripe-backed metrics.</p>
      </header>

      <section className="admin-shell-grid">
        <article className="admin-shell-card">
          <h3>MRR Snapshot</h3>
          <p>Scaffold KPI card for monthly recurring revenue and trend delta.</p>
          <span className="admin-shell-chip"><DollarSign size={12} /> KPI Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Subscription Mix</h3>
          <p>Scaffold view for plan distribution and active paid tiers.</p>
          <span className="admin-shell-chip"><CreditCard size={12} /> Billing Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Churn Feed</h3>
          <p>Scaffold area for recent cancellations and retention signals.</p>
          <span className="admin-shell-chip"><RefreshCcw size={12} /> Retention Slot</span>
        </article>
      </section>
    </div>
  )
}
