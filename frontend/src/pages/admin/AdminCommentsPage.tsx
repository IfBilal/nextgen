import { EyeOff, Flag, MessageSquareMore } from 'lucide-react'

export default function AdminCommentsPage() {
  return (
    <div className="admin-shell-page">
      <header className="admin-shell-page__header">
        <h1>Comment Moderation</h1>
        <p>Community safety shell for reviewing, flagging, and cloaking comments.</p>
      </header>

      <section className="admin-shell-grid">
        <article className="admin-shell-card">
          <h3>Global Comment Feed</h3>
          <p>Scaffold list container for latest platform comments.</p>
          <span className="admin-shell-chip"><MessageSquareMore size={12} /> Feed Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Flagged Queue</h3>
          <p>Scaffold queue for comments caught by moderation rules.</p>
          <span className="admin-shell-chip"><Flag size={12} /> Priority Slot</span>
        </article>

        <article className="admin-shell-card">
          <h3>Visibility Controls</h3>
          <p>Scaffold actions for hide/show moderation decisions.</p>
          <span className="admin-shell-chip"><EyeOff size={12} /> Action Slot</span>
        </article>
      </section>
    </div>
  )
}
