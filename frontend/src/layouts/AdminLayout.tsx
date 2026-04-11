import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Wallet,
  MessageSquareWarning,
  Megaphone,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'
import './AdminLayout.css'

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Student Insights', icon: Users },
  { to: '/admin/metrics', label: 'Global Metrics', icon: BarChart3 },
  { to: '/admin/financials', label: 'Financials', icon: Wallet },
  { to: '/admin/comments', label: 'Comment Moderation', icon: MessageSquareWarning },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
]

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className={`admin-layout ${mobileOpen ? 'admin-layout--mobile-open' : ''}`}>
      {mobileOpen && <button className="admin-layout__overlay" onClick={() => setMobileOpen(false)} />}

      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo-wrap">
            <img src="/logo.png" alt="NextGen" className="admin-sidebar__logo" />
            <div>
              <strong>NextGen</strong>
              <span>Admin Panel</span>
            </div>
          </div>
          <button className="admin-sidebar__close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {ADMIN_NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="admin-sidebar__bottom">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">
              <Shield size={16} />
            </div>
            <div>
              <strong>{admin?.name || 'Admin'}</strong>
              <span>{admin?.email || 'admin@nextgen.com'}</span>
            </div>
          </div>

          <button className="admin-sidebar__logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-topbar__menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="admin-topbar__meta">
            <span className="admin-topbar__title">Administrative Command Center</span>
            <span className="admin-topbar__subtitle">Operational controls and platform intelligence</span>
          </div>

          <div className="admin-topbar__badge">
            <Shield size={14} />
            <span>Secure Session</span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}
