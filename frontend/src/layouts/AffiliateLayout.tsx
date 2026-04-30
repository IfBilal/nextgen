import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart2,
  LogOut,
  Menu,
  X,
  Link2,
} from 'lucide-react'
import { useAffiliateAuth } from '../context/AffiliateAuthContext'
import './AffiliateLayout.css'

const AFFILIATE_NAV_ITEMS = [
  { to: '/affiliate/dashboard',        label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/affiliate/referrals',        label: 'My Referrals',     icon: Users },
  { to: '/affiliate/earnings',         label: 'Earnings',         icon: DollarSign },
  { to: '/affiliate/student-insights', label: 'Student Insights', icon: BarChart2 },
]

export default function AffiliateLayout() {
  const { affiliate, logout } = useAffiliateAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/affiliate/login')
  }

  return (
    <div className={`affiliate-layout ${mobileOpen ? 'affiliate-layout--mobile-open' : ''}`}>
      {mobileOpen && <button className="affiliate-layout__overlay" onClick={() => setMobileOpen(false)} />}

      <aside className="affiliate-sidebar">
        <div className="affiliate-sidebar__brand">
          <div className="affiliate-sidebar__logo-wrap">
            <img src="/logo.png" alt="NextGen" className="affiliate-sidebar__logo" />
            <div>
              <strong>NextGen</strong>
              <span>Partner Portal</span>
            </div>
          </div>
          <button className="affiliate-sidebar__close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {affiliate && (
          <div className="affiliate-sidebar__code-wrap">
            <span className="affiliate-sidebar__code-label">Your Referral Code</span>
            <div className="affiliate-sidebar__code">
              <Link2 size={13} />
              {affiliate.referralCode}
            </div>
          </div>
        )}

        <nav className="affiliate-sidebar__nav">
          {AFFILIATE_NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `affiliate-sidebar__link ${isActive ? 'affiliate-sidebar__link--active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="affiliate-sidebar__bottom">
          <div className="affiliate-sidebar__user">
            <div className="affiliate-sidebar__avatar">
              {affiliate?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div>
              <strong>{affiliate?.name ?? 'Affiliate'}</strong>
              <span>{affiliate?.commissionPct ?? 0}% commission</span>
            </div>
          </div>
          <button className="affiliate-sidebar__logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="affiliate-main">
        <header className="affiliate-topbar">
          <button className="affiliate-topbar__menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="affiliate-topbar__meta">
            <span className="affiliate-topbar__title">Partner Portal</span>
            <span className="affiliate-topbar__subtitle">Track referrals and earnings</span>
          </div>
          <div className="affiliate-topbar__badge">
            <Link2 size={14} />
            <span>{affiliate?.referralCode}</span>
          </div>
        </header>
        <main className="affiliate-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}
