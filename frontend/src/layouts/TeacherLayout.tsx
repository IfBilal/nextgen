import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  LogOut,
  Menu,
  X,
  GraduationCap,
  MessageSquare,
  BarChart2,
} from 'lucide-react'
import { useTeacherAuth } from '../context/TeacherAuthContext'
import './TeacherLayout.css'

const TEACHER_NAV_ITEMS = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/classes', label: 'My Classes', icon: BookOpen },
  { to: '/teacher/chat', label: 'Student Chat', icon: MessageSquare },
  { to: '/teacher/analytics', label: 'Analytics', icon: BarChart2 },
]

export default function TeacherLayout() {
  const { teacher, logout } = useTeacherAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/teacher/login')
  }

  return (
    <div className={`teacher-layout ${mobileOpen ? 'teacher-layout--mobile-open' : ''}`}>
      {mobileOpen && <button className="teacher-layout__overlay" onClick={() => setMobileOpen(false)} />}

      <aside className="teacher-sidebar">
        <div className="teacher-sidebar__brand">
          <div className="teacher-sidebar__logo-wrap">
            <img src="/logo.png" alt="NextGen" className="teacher-sidebar__logo" />
            <div>
              <strong>NextGen</strong>
              <span>Teacher Portal</span>
            </div>
          </div>
          <button className="teacher-sidebar__close" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="teacher-sidebar__role-badge">
          <GraduationCap size={15} />
          <strong>Teacher</strong>
        </div>

        <nav className="teacher-sidebar__nav">
          {TEACHER_NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `teacher-sidebar__link ${isActive ? 'teacher-sidebar__link--active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="teacher-sidebar__bottom">
          <div className="teacher-sidebar__user">
            <div className="teacher-sidebar__avatar">
              {teacher?.name?.[0]?.toUpperCase() ?? 'T'}
            </div>
            <div>
              <strong>{teacher?.name ?? 'Teacher'}</strong>
              <span>{teacher?.email}</span>
            </div>
          </div>
          <button className="teacher-sidebar__logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="teacher-main">
        <header className="teacher-topbar">
          <button className="teacher-topbar__menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="teacher-topbar__meta">
            <span className="teacher-topbar__title">Teacher Portal</span>
            <span className="teacher-topbar__subtitle">Manage your classes and sessions</span>
          </div>
          <div className="teacher-topbar__badge">
            <GraduationCap size={14} />
            <span>Approved</span>
          </div>
        </header>
        <main className="teacher-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}
