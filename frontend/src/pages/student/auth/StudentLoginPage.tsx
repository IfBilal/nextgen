import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useStudentAuth } from '../../../context/StudentAuthContext'
import { normalizeError } from '../../../services/errorUtils'
import { captureException } from '../../../services/observability'
import './Auth.css'

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const { login } = useStudentAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError('')
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password.')
        return
      }

      setLoading(true)

      const loggedInUser = await login(email, password)
      if (loggedInUser.onboarded) {
        navigate('/student/dashboard')
      } else {
        navigate('/student/onboarding')
      }
    } catch (error) {
      const normalized = normalizeError(error)
      setError(normalized.message || 'Something went wrong while signing in. Please try again.')
      captureException(error, { feature: 'student-login', action: 'submit' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left__inner animate-fadeInLeft">
          <img src="/logo.png" alt="NextGen USMLE" className="auth-logo" />
          <h1 className="auth-left__heading">Ace Your Board Exams</h1>
          <p className="auth-left__sub">
            High-performance preparation for USMLE Step 1. Adaptive learning, real-time analytics, and personalized roadmaps — built around you.
          </p>
          <div className="auth-left__features">
            {['Personalized study roadmap', 'Adaptive create test flow', 'Deep-link video references', 'Real-time performance analytics'].map(f => (
              <div className="auth-left__feature" key={f}>
                <span className="auth-left__feature-dot" />
                {f}
              </div>
            ))}
          </div>
          <div className="auth-left__blob auth-left__blob--1" />
          <div className="auth-left__blob auth-left__blob--2" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-form-card animate-fadeIn">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Welcome back 👋</h2>
            <p className="auth-form-subtitle">Sign in to continue your USMLE Step 1 journey</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">Password</label>
                <Link to="/student/forgot-password" className="auth-forgot">Forgot password?</Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input auth-input--password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/student/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
