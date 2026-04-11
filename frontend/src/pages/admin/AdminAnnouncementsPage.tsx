import { useMemo, useState, type FormEvent } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { useAnnouncements } from '../../context/AnnouncementContext'
import { useAdminAuth } from '../../context/AdminAuthContext'
import '../../styles/admin/admin-announcements.css'

function formatAnnouncementTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleString()
}

export default function AdminAnnouncementsPage() {
  const { announcements, postAnnouncement } = useAnnouncements()
  const { admin } = useAdminAuth()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')

  const totalAnnouncements = announcements.length
  const latestAnnouncement = announcements[0] ?? null

  const latestBroadcastAt = useMemo(() => {
    if (!latestAnnouncement) return 'No broadcasts yet'
    return formatAnnouncementTime(latestAnnouncement.createdAtIso)
  }, [latestAnnouncement])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()

    if (!trimmedTitle || !trimmedMessage) {
      setNotice('Please add both a title and message before sending.')
      return
    }

    postAnnouncement({
      title: trimmedTitle,
      message: trimmedMessage,
      createdBy: admin?.name ?? 'Admin',
    })

    setTitle('')
    setMessage('')
    setNotice('Announcement sent to all students.')
  }

  return (
    <div className="admin-announcements-page">
      <header className="admin-announcements-header">
        <h1>
          <Megaphone size={20} /> Announcements
        </h1>
        <p>Create announcements that every student can read in their inbox.</p>
      </header>

      <section className="admin-announcements-kpis">
        <article className="admin-announcements-kpi">
          <h4>Total Broadcasts</h4>
          <p>{totalAnnouncements}</p>
        </article>
        <article className="admin-announcements-kpi">
          <h4>Last Broadcast</h4>
          <p>{latestBroadcastAt}</p>
        </article>
      </section>

      <section className="admin-announcements-grid">
        <article className="card admin-announcements-form-card">
          <h3>New Announcement</h3>
          <form className="admin-announcements-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Exam schedule update"
              />
            </label>

            <label>
              Message
              <textarea
                rows={6}
                value={message}
                onChange={event => setMessage(event.target.value)}
                placeholder="Roadmap milestones have been recalibrated for this week..."
              />
            </label>

            <button type="submit" className="admin-announcements-send">
              <Send size={15} /> Send to all students
            </button>
          </form>

          {notice ? <p className="admin-announcements-notice">{notice}</p> : null}
        </article>

        <article className="card admin-announcements-history-card">
          <h3>Broadcast History</h3>

          <div className="admin-announcements-history-list">
            {announcements.map(announcement => (
              <article className="admin-announcement-item" key={announcement.id}>
                <header>
                  <strong>{announcement.title}</strong>
                  <span>{formatAnnouncementTime(announcement.createdAtIso)}</span>
                </header>
                <p>{announcement.message}</p>
                <footer>
                  <span>By {announcement.createdBy}</span>
                </footer>
              </article>
            ))}

            {announcements.length === 0 ? (
              <p className="admin-announcements-empty">No announcements yet.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  )
}
