import { Filter, Search, UserRoundCog } from 'lucide-react'

export default function AdminStudentsPage() {
  return (
    <div className="admin-shell-page">
      <header className="admin-shell-page__header">
        <h1>Student Insights</h1>
        <p>CRM shell for searching student records, status, and intervention context.</p>
      </header>

      <section className="admin-shell-grid">
        <article className="admin-shell-card">
          <h3>Search & Filters</h3>
          <p>Scaffold controls for name, tier, activity, and risk-level filters.</p>
          <span className="admin-shell-chip"><Search size={12} /> Control Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Student Table</h3>
          <p>Scaffold table container for paginated student list and actions.</p>
          <span className="admin-shell-chip"><Filter size={12} /> Table Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Admin Actions</h3>
          <p>Scaffold panel for tier override, password reset, and account controls.</p>
          <span className="admin-shell-chip"><UserRoundCog size={12} /> Action Slot</span>
        </article>
      </section>
    </div>
  )
}
