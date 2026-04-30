import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useTeacherAuth } from '../../../context/TeacherAuthContext'
import '../../student/auth/Auth.css'

export default function TeacherLoginPage() {
  const { login } = useTeacherAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const teacher = await login(email, password)
      if (teacher.status === 'pending') {
        navigate('/teacher/pending')
      } else if (teacher.status === 'suspended') {
        setError('Your account has been suspended. Please contact support.')
      } else {
        navigate('/teacher/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left__blob auth-left__blob--1" />
        <div className="auth-left__blob auth-left__blob--2" />
        <div className="auth-left__inner">
          <img src="/logo.png" alt="NextGen" className="auth-logo" />
          <h1 className="auth-left__heading">Teacher Portal</h1>
          <p className="auth-left__sub">
            Access your classes, manage sessions, and connect with your students.
          </p>
          <div className="auth-left__features">
            {['Manage your class schedule', 'Start live sessions with one click', 'Post notices and study materials', 'View student attendance'].map(f => (
              <div key={f} className="auth-left__feature">
                <span className="auth-left__feature-dot" />
                {f}
              </div>
            ))}
          </div>
          <div className="auth-demo-hint">
            <span>Demo:</span> james@teacher.com / teacher123
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign In</h2>
            <p className="auth-form-subtitle">Welcome back. Enter your credentials to continue.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  className="auth-input auth-input--password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              <GraduationCap size={17} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1rem' }}>
            Not a teacher yet? <Link to="/teacher/register">Apply to teach</Link>
          </p>
          <p className="auth-switch">
            <Link to="/" style={{ fontSize: '0.82rem', color: '#6B7280' }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
