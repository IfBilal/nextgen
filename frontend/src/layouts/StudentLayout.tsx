import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Map, BookOpen, Library,
  BarChart2, Trophy, Users, FileText, MessageSquare, LogOut,
  ChevronLeft, ChevronRight, Bell, Search, Menu, Inbox, Layers, Sparkles, Clock3
} from 'lucide-react'
import { useStudentAuth } from '../context/StudentAuthContext'
import { useAnnouncements } from '../context/AnnouncementContext'
import { useSubscription } from '../context/SubscriptionContext'
import { getDaysUntilExam } from '../data/dashboard'
import './StudentLayout.css'

const NAV_ITEMS = [
  { to: '/student/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/roadmap',     icon: Map,             label: 'My Roadmap' },
  { to: '/student/qbank',       icon: BookOpen,        label: 'Create Test' },
  { to: '/student/tutor',       icon: BookOpen,        label: 'Tutor' },
  { to: '/student/content',     icon: Library,         label: 'Content Hub' },
  { to: '/student/comments',    icon: MessageSquare,   label: 'Comments' },
  { to: '/student/inbox',       icon: Inbox,           label: 'Inbox' },
  { to: '/student/flashcards',  icon: Layers,          label: 'Flashcards' },
  { to: '/student/analytics',   icon: BarChart2,       label: 'Analytics' },
  { to: '/student/leaderboard', icon: Trophy,          label: 'Leaderboard' },
  { to: '/student/partners',    icon: Users,           label: 'Study Partners' },
  { to: '/student/notes',       icon: FileText,        label: 'Notes' },
  { to: '/student/upgrade',     icon: Sparkles,        label: 'Upgrade' },
]

export default function StudentLayout() {
  const { user, logout } = useStudentAuth()
  const { snapshot, planLabel } = useSubscription()
  const { unreadCount } = useAnnouncements()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const daysLeft = getDaysUntilExam('2025-06-20')
  const announcementUnreadCount = unreadCount(user?.email ?? '')
  const demoStatusText = snapshot?.isCurrentPlanTimeBound
    ? snapshot.isCurrentPlanExpired
      ? `${planLabel} ended • Upgrade required`
      : `${snapshot.remainingDays}d left in ${planLabel}`
    : null

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST'

  const handleLogout = () => { logout(); navigate('/student/login') }

  return (
    <div className={`sl-root ${collapsed ? 'sl-root--collapsed' : ''} ${mobileOpen ? 'sl-root--mobile-open' : ''}`}>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sl-overlay" onClick={() => setMobileOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="sl-sidebar">
        {/* Logo */}
        <div className="sl-logo">
          <img src="/logo.png" alt="NextGen USMLE" className="sl-logo__img" />
          {!collapsed && <span className="sl-logo__text">NextGen <em>USMLE</em></span>}
        </div>

        {/* Collapse toggle */}
        <button className="sl-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Nav */}
        <nav className="sl-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sl-nav__item ${isActive ? 'sl-nav__item--active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="sl-nav__icon" />
              {!collapsed && <span className="sl-nav__label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="sl-bottom">
          {!collapsed && (
            <div className="sl-exam-chip">
              <span className="sl-exam-chip__dot" />
              <span>{daysLeft}d to USMLE Step 1</span>
            </div>
          )}

          <div className="sl-user">
            <div className="sl-user__avatar">{initials}</div>
            {!collapsed && (
              <div className="sl-user__info">
                <span className="sl-user__name">{user?.name || 'Student'}</span>
                <span className="sl-user__tier">{planLabel}</span>
              </div>
            )}
          </div>

          {!collapsed && demoStatusText ? (
            <div className="sl-demo-chip">
              <Clock3 size={12} /> {demoStatusText}
            </div>
          ) : null}

          <button className="sl-logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <div className="sl-main">
        {/* Topbar */}
        <header className="sl-topbar">
          <button className="sl-topbar__menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={20} />
          </button>

          <div className="sl-topbar__left">
            {/* Page title injected via CSS */}
          </div>

          <div className="sl-topbar__right">
            <button className="sl-topbar__icon-btn" title="Search">
              <Search size={18} />
            </button>
            <button
              className="sl-topbar__icon-btn sl-topbar__bell"
              title="Notifications"
              onClick={() => navigate('/student/inbox')}
            >
              <Bell size={18} />
              {announcementUnreadCount > 0 ? (
                <span className="sl-topbar__badge">
                  {announcementUnreadCount > 9 ? '9+' : announcementUnreadCount}
                </span>
              ) : null}
            </button>
            <div className="sl-topbar__avatar">{initials}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="sl-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
