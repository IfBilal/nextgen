import { useState, useEffect } from 'react'
import { MailOpen, Mail, CheckCheck, Bell, Video, Megaphone, Clock, CheckCircle2 } from 'lucide-react'
import { useAnnouncements } from '../../context/AnnouncementContext'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { getStudentLmsNotifications, markLmsNotificationRead } from '../../services/lmsApi'
import type { LmsNotification } from '../../types/lms'
import '../../styles/student-inbox.css'

function formatAnnouncementTime(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return parsed.toLocaleString()
}

function formatRelative(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotifIcon({ type }: { type: LmsNotification['type'] }) {
  if (type === 'session_starting' || type === 'session_live') return <Video size={14} style={{ color: '#1a6fad' }} />
  if (type === 'notice_posted') return <Megaphone size={14} style={{ color: '#1a6fad' }} />
  if (type === 'demo_expiring') return <Clock size={14} style={{ color: '#d97706' }} />
  return <Bell size={14} style={{ color: '#1a6fad' }} />
}

type InboxTab = 'announcements' | 'lms'

export default function InboxPage() {
  const { announcements, unreadCount, isRead, markAsRead, markAllAsRead } = useAnnouncements()
  const { user } = useStudentAuth()
  const [activeTab, setActiveTab] = useState<InboxTab>('announcements')
  const [lmsNotifications, setLmsNotifications] = useState<LmsNotification[]>([])

  const studentKey = user?.email ?? ''
  const totalUnread = unreadCount(studentKey)

  useEffect(() => {
    if (user?.id) {
      getStudentLmsNotifications(user.id).then(setLmsNotifications)
    }
  }, [user?.id])

  const lmsUnread = lmsNotifications.filter(n => !n.read).length

  async function handleMarkLmsRead(id: string) {
    await markLmsNotificationRead(id)
    setLmsNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="student-inbox-page">
      <header className="student-inbox-header">
        <h1>
          <MailOpen size={20} /> Inbox
        </h1>
        <p>Your announcements and LMS alerts.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8f1f8', marginBottom: 16, background: '#fff', borderRadius: '10px 10px 0 0', border: '1px solid #d8e9f8', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <button
          onClick={() => setActiveTab('announcements')}
          style={{ flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem', color: activeTab === 'announcements' ? '#1a6fad' : '#6a86a7', borderBottom: `2px solid ${activeTab === 'announcements' ? '#1a6fad' : 'transparent'}` }}
        >
          Announcements {totalUnread > 0 && <span style={{ background: '#1a6fad', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem', marginLeft: 5 }}>{totalUnread}</span>}
        </button>
        <button
          onClick={() => setActiveTab('lms')}
          style={{ flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem', color: activeTab === 'lms' ? '#1a6fad' : '#6a86a7', borderBottom: `2px solid ${activeTab === 'lms' ? '#1a6fad' : 'transparent'}` }}
        >
          LMS Alerts {lmsUnread > 0 && <span style={{ background: '#d97706', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.7rem', marginLeft: 5 }}>{lmsUnread}</span>}
        </button>
      </div>

      {/* Announcements tab */}
      {activeTab === 'announcements' && (
        <>
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
        </>
      )}

      {/* LMS Alerts tab */}
      {activeTab === 'lms' && (
        <section className="student-inbox-list">
          {lmsNotifications.length === 0 ? (
            <p className="student-inbox-empty">No LMS alerts yet.</p>
          ) : (
            lmsNotifications.map(notif => (
              <article key={notif.id} style={{ background: '#fff', border: `1px solid ${notif.read ? '#e8f1f8' : '#cde0f5'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: notif.type === 'demo_expiring' ? '#fffbeb' : '#e8f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <NotifIcon type={notif.type} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: notif.read ? 500 : 700, color: '#0d2d5e', fontSize: '0.87rem' }}>{notif.message}</div>
                  <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 3 }}>{formatRelative(notif.createdAt)}</div>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => handleMarkLmsRead(notif.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6fad', padding: 4 }}
                    title="Mark as read"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </article>
            ))
          )}
        </section>
      )}
    </div>
  )
}
