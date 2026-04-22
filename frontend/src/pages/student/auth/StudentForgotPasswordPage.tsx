import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import { normalizeError } from '../../../services/errorUtils'
import { forgotStudentPassword } from '../../../services/authApi'
import './Auth.css'

export default function StudentForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    try {
      setLoading(true)
      const response = await forgotStudentPassword({ email: email.trim().toLowerCase() })
      setNotice(response.message)
    } catch (requestError) {
      const normalized = normalizeError(requestError)
      setError(normalized.message || 'Unable to process request right now. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left__inner animate-fadeInLeft">
          <img src="/logo.png" alt="NextGen USMLE" className="auth-logo" />
          <h1 className="auth-left__heading">Reset your password</h1>
          <p className="auth-left__sub">Enter your student email and we’ll send instructions to reset your password.</p>
          <div className="auth-left__blob auth-left__blob--1" />
          <div className="auth-left__blob auth-left__blob--2" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-card animate-fadeIn">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Forgot Password</h2>
            <p className="auth-form-subtitle">Student account recovery</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-success">{notice}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Send Reset Link <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-switch">
            Remember your password? <Link to="/student/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
