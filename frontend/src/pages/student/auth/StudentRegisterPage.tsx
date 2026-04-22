import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight } from 'lucide-react'
import { useStudentAuth } from '../../../context/StudentAuthContext'
import { normalizeError } from '../../../services/errorUtils'
import { captureException } from '../../../services/observability'
import './Auth.css'

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const { register } = useStudentAuth()

  const [form, setForm] = useState({ name: '', email: '', school: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    return errs
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      setErrors({})
      setLoading(true)
      await register(form.name, form.email, form.password, form.school || undefined)
      navigate('/student/onboarding')
    } catch (error) {
      const normalized = normalizeError(error)
      setErrors({ form: normalized.message || 'Unable to create account. Please try again.' })
      captureException(error, { feature: 'student-register', action: 'submit' })
    } finally {
      setLoading(false)
    }
  }

  const field = (key: string) => ({
    value: form[key as keyof typeof form],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(key, e.target.value),
  })

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left__inner animate-fadeInLeft">
          <img src="/logo.png" alt="NextGen USMLE" className="auth-logo" />
          <h1 className="auth-left__heading">Start Your Journey</h1>
          <p className="auth-left__sub">
            Join thousands of medical students using proven tools to prepare smarter for USMLE Step 1.
          </p>
          <div className="auth-left__stats">
            <div className="auth-stat">
              <span className="auth-stat__num">2,400+</span>
              <span className="auth-stat__label">Active Students</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat__num">94%</span>
              <span className="auth-stat__label">Pass Rate</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat__num">30K+</span>
              <span className="auth-stat__label">Questions Answered</span>
            </div>
          </div>
          <div className="auth-left__blob auth-left__blob--1" />
          <div className="auth-left__blob auth-left__blob--2" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right auth-right--scroll">
        <div className="auth-form-card animate-fadeIn">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-subtitle">Get started with your personalized USMLE Step 1 roadmap</p>
          </div>

          {errors.form && <div className="auth-error">{errors.form}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name */}
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input {...field('name')} type="text" className={`auth-input ${errors.name ? 'auth-input--error' : ''}`} placeholder="Dr. John Smith" />
              </div>
              {errors.name && <p className="auth-field-error">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input {...field('email')} type="email" className={`auth-input ${errors.email ? 'auth-input--error' : ''}`} placeholder="you@university.edu" />
              </div>
              {errors.email && <p className="auth-field-error">{errors.email}</p>}
            </div>

            {/* Medical School */}
            <div className="auth-field">
              <label className="auth-label">
                Medical School <span className="auth-label--optional">(optional)</span>
              </label>
              <div className="auth-input-wrap">
                <Building2 size={16} className="auth-input-icon" />
                <input {...field('school')} type="text" className="auth-input" placeholder="University of Toronto, Faculty of Medicine" />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  {...field('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input auth-input--password ${errors.password ? 'auth-input--error' : ''}`}
                  placeholder="Min. 8 characters"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="auth-field-error">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  {...field('confirm')}
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-input auth-input--password ${errors.confirm ? 'auth-input--error' : ''}`}
                  placeholder="Re-enter password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && <p className="auth-field-error">{errors.confirm}</p>}
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/student/login">Sign In</Link>
          </p>

          <p className="auth-terms">
            By creating an account, you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
