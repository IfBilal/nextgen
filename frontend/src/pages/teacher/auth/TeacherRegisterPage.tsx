import { type ChangeEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, GraduationCap, User, Mail, Lock, Phone, FileText, Eye, EyeOff } from 'lucide-react'
import { useTeacherAuth } from '../../../context/TeacherAuthContext'
import '../../student/auth/Auth.css'

export default function TeacherRegisterPage() {
  const { register } = useTeacherAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', bio: '' })
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProfilePicture(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!profilePicture) {
      setError('Please upload a profile picture.')
      return
    }
    setLoading(true)
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        bio: form.bio,
        profilePicture,
      })
      navigate('/teacher/pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const bioLength = form.bio.length

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-left__blob auth-left__blob--1" />
        <div className="auth-left__blob auth-left__blob--2" />
        <div className="auth-left__inner">
          <img src="/logo.png" alt="NextGen" className="auth-logo" />
          <h1 className="auth-left__heading">Join as a Teacher</h1>
          <p className="auth-left__sub">
            Apply to become an instructor on NextGen Medical Mastery. Your application will be
            reviewed by our admin team within 1–2 business days.
          </p>
          <div className="auth-left__features">
            {['Board-certified physicians welcome', 'Manage your own class schedule', 'Interact directly with students', 'Earn while you teach'].map(f => (
              <div key={f} className="auth-left__feature">
                <span className="auth-left__feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right auth-right--scroll">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Apply to Teach</h2>
            <p className="auth-form-subtitle">Fill in your details — we'll review your application shortly.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Profile Picture */}
            <div className="auth-field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <label className="auth-label" style={{ alignSelf: 'flex-start' }}>Your Photo *</label>
              <div
                style={{ width: 88, height: 88, borderRadius: '50%', border: '2px dashed var(--color-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary-surface)', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePicture
                  ? <img src={profilePicture} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Camera size={28} color="var(--color-primary)" />
                }
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Upload a clear photo of yourself</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfilePicChange}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Full Name *</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email Address *</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Phone Number *</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input
                  className="auth-input"
                  type="tel"
                  placeholder="+1-555-0123"
                  required
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password *</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  className={`auth-input auth-input--password`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password *</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  className="auth-input auth-input--password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  required
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Bio / Experience *</span>
                <span style={{ fontWeight: 400, color: bioLength > 280 ? '#dc2626' : '#6B7280', fontSize: '0.78rem' }}>
                  {bioLength}/300
                </span>
              </label>
              <div className="auth-input-wrap" style={{ alignItems: 'flex-start' }}>
                <FileText size={16} className="auth-input-icon" style={{ top: 13 }} />
                <textarea
                  style={{ width: '100%', padding: '10px 16px 10px 42px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', background: 'var(--color-surface)', resize: 'vertical', minHeight: 90, outline: 'none', fontFamily: 'inherit' }}
                  placeholder="Briefly describe your medical qualifications and teaching experience..."
                  required
                  maxLength={300}
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              <GraduationCap size={17} />
              {loading ? 'Submitting Application...' : 'Apply to Teach'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1rem' }}>
            Already approved? <Link to="/teacher/login">Sign in here</Link>
          </p>
          <p className="auth-switch">
            <Link to="/" style={{ fontSize: '0.82rem', color: '#6B7280' }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
