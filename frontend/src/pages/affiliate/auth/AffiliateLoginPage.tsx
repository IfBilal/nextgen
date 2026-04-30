import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAffiliateAuth } from '../../../context/AffiliateAuthContext'
import { normalizeError } from '../../../services/errorUtils'
import '../../student/auth/Auth.css'

export default function AffiliateLoginPage() {
  const navigate = useNavigate()
  const { login } = useAffiliateAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    try {
      setLoading(true)
      await login(email, password)
      navigate('/affiliate/dashboard')
    } catch (err) {
      setError(normalizeError(err).message || 'Unable to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left__inner animate-fadeInLeft">
          <img src="/logo.png" alt="NextGen USMLE" className="auth-logo" />
          <h1 className="auth-left__heading">Partner Portal</h1>
          <p className="auth-left__sub">
            Track your referrals, monitor active students, and view your commission earnings in real time.
          </p>
          <div className="auth-left__features">
            {[
              'Real-time referral tracking',
              'Commission ledger',
              'Active vs churned students',
              'Pending payout overview',
            ].map(f => (
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

      <div className="auth-right">
        <div className="auth-form-card animate-fadeIn">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Partner Sign In</h2>
            <p className="auth-form-subtitle">Access your affiliate dashboard</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

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
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
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
                <button type="button" className="auth-eye" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
            Credentials are provided by your account manager.
          </p>
        </div>
      </div>
    </div>
  )
}
