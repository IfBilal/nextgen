import { MailOpen, Mail, CheckCheck } from 'lucide-react'
import { useAnnouncements } from '../../context/AnnouncementContext'
import { useStudentAuth } from '../../context/StudentAuthContext'
import '../../styles/student-inbox.css'

function formatAnnouncementTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleString()
}

export default function InboxPage() {
  const { announcements, unreadCount, isRead, markAsRead, markAllAsRead } = useAnnouncements()
  const { user } = useStudentAuth()

  const studentKey = user?.email ?? ''
  const totalUnread = unreadCount(studentKey)

  return (
    <div className="student-inbox-page">
      <header className="student-inbox-header">
        <h1>
          <MailOpen size={20} /> Inbox
        </h1>
        <p>All announcements sent by admin appear here.</p>
      </header>

      <section className="student-inbox-summary card">
        <div>
          <h3>{totalUnread} unread announcements</h3>
          <p>Stay updated with latest admin broadcasts for all students.</p>
        </div>
        <button
          type="button"
          className="student-inbox-read-all"
          onClick={() => markAllAsRead(studentKey)}
          disabled={totalUnread === 0}
        >
          <CheckCheck size={16} /> Mark all as read
        </button>
      </section>

      <section className="student-inbox-list">
        {announcements.map(announcement => {
          const read = isRead(studentKey, announcement.id)

          return (
            <article className={`card student-inbox-item ${read ? 'read' : 'unread'}`} key={announcement.id}>
              <header>
                <div>
                  <h3>{announcement.title}</h3>
                  <p>{formatAnnouncementTime(announcement.createdAtIso)}</p>
                </div>
                <span className="student-inbox-item-status">
                  {read ? <MailOpen size={15} /> : <Mail size={15} />}
                  {read ? 'Read' : 'Unread'}
                </span>
              </header>

              <p className="student-inbox-message">{announcement.message}</p>

              <footer>
                <span>By {announcement.createdBy}</span>
                {!read ? (
                  <button type="button" onClick={() => markAsRead(studentKey, announcement.id)}>
                    Mark as read
                  </button>
                ) : null}
              </footer>
            </article>
          )
        })}

        {announcements.length === 0 ? <p className="student-inbox-empty">No announcements yet.</p> : null}
      </section>
    </div>
  )
}
