import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAdminAuth } from '../../../context/AdminAuthContext'
import { normalizeError } from '../../../services/errorUtils'
import { captureException } from '../../../services/observability'
import './Auth.css'
import './AdminAuth.css'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Please enter your credentials.')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      navigate('/admin/dashboard')
    } catch (error) {
      const normalized = normalizeError(error)
      setError(normalized.message || 'Invalid credentials. Access denied.')
      captureException(error, { feature: 'admin-login', action: 'submit' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-auth-container">
      {/* Background blobs */}
      <div className="admin-blob admin-blob--1" />
      <div className="admin-blob admin-blob--2" />

      <div className="admin-auth-card animate-fadeIn">
        {/* Header */}
        <div className="admin-auth-header">
          <div className="admin-shield-icon">
            <ShieldCheck size={28} strokeWidth={1.5} />
          </div>
          <img src="/logo.png" alt="NextGen USMLE" className="admin-auth-logo" />
          <h1 className="admin-auth-title">Admin Portal</h1>
          <p className="admin-auth-subtitle">Authorized personnel only</p>
        </div>

        {error && (
          <div className="admin-auth-error">
            <ShieldCheck size={14} />
            {error}
          </div>
        )}

        <div className="admin-auth-divider" />

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <div className="auth-field">
            <label className="auth-label auth-label--dark">Admin Email</label>
            <div className="auth-input-wrap auth-input-wrap--dark">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                className="auth-input auth-input--dark"
                placeholder="admin@nextgen.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label auth-label--dark">Password</label>
            <div className="auth-input-wrap auth-input-wrap--dark">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input auth-input--dark auth-input--password"
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="auth-eye auth-eye--dark" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn auth-btn--navy" disabled={loading}>
            {loading ? <span className="spinner" /> : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="admin-auth-footer">
          <ShieldCheck size={12} />
          Unauthorized access is strictly prohibited and may be prosecuted.
        </div>
      </div>

      <p className="admin-portal-back">
        <a href="/">← Back to main site</a>
      </p>
    </div>
  )
}
