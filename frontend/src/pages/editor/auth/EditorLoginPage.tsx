import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Edit3, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useEditorAuth } from '../../../context/EditorAuthContext'
import '../../student/auth/Auth.css'

export default function EditorLoginPage() {
  const { login } = useEditorAuth()
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
      await login(email, password)
      navigate('/editor/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.')
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
          <h1 className="auth-left__heading">Editor Portal</h1>
          <p className="auth-left__sub">
            Supervise sessions, manage schedules, and oversee all platform activity.
          </p>
          <div className="auth-left__features">
            {[
              'View all sessions across products',
              'Approve and manage teachers',
              'Supervise class conversations',
              'Edit and reschedule sessions',
            ].map(f => (
              <div key={f} className="auth-left__feature">
                <span className="auth-left__feature-dot" />
                {f}
              </div>
            ))}
          </div>
          <div className="auth-demo-hint">
            <span>Demo:</span> ali@editor.com / editor123
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Editor Sign In</h2>
            <p className="auth-form-subtitle">
              Sign in with your editor credentials to access the supervision portal.
            </p>
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
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword(s => !s)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={loading}
            >
              <Edit3 size={17} />
              {loading ? 'Signing in…' : 'Sign In as Editor'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1rem' }}>
            Editor accounts are created by administrators.
          </p>
          <p className="auth-switch">
            <Link to="/" style={{ fontSize: '0.82rem', color: '#6B7280' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
