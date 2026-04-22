import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { normalizeError } from '../../../services/errorUtils'
import { resetStudentPassword } from '../../../services/authApi'
import './Auth.css'

function getRecoveryTokens() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)

  return {
    accessToken: hashParams.get('access_token') ?? queryParams.get('access_token') ?? '',
    refreshToken: hashParams.get('refresh_token') ?? queryParams.get('refresh_token') ?? '',
  }
}

export default function StudentResetPasswordPage() {
  const navigate = useNavigate()
  const { accessToken, refreshToken } = useMemo(() => getRecoveryTokens(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!accessToken || !refreshToken) {
      setError('Reset link is invalid or expired. Please request a new password reset link.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const response = await resetStudentPassword({
        accessToken,
        refreshToken,
        newPassword: password,
      })
      setNotice(response.message)
      window.setTimeout(() => {
        navigate('/student/login')
      }, 1200)
    } catch (requestError) {
      const normalized = normalizeError(requestError)
      setError(normalized.message || 'Unable to reset password. Please request a new link and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left__inner animate-fadeInLeft">
          <img src="/logo.png" alt="NextGen USMLE" className="auth-logo" />
          <h1 className="auth-left__heading">Choose a new password</h1>
          <p className="auth-left__sub">Set a secure password for your student account and continue your preparation journey.</p>
          <div className="auth-left__blob auth-left__blob--1" />
          <div className="auth-left__blob auth-left__blob--2" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-card animate-fadeIn">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Reset Password</h2>
            <p className="auth-form-subtitle">Student account recovery</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-success">{notice}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">New password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input auth-input--password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(previous => !previous)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm new password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input auth-input--password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowConfirmPassword(previous => !previous)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Update Password <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-switch">
            Back to <Link to="/student/login">student sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
