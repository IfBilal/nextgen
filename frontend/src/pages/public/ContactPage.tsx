import { useState } from 'react'
import { Mail, Phone, Clock, Send, CheckCircle2 } from 'lucide-react'
import '../../styles/public.css'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <>
      <section className="public-page-hero">
        <h1>Contact Us</h1>
        <p>Have a question? We typically respond within 24 hours on business days.</p>
      </section>

      <section className="public-section">
        <div className="public-section__inner">
          <div className="public-contact-grid">
            <div>
              <h2 style={{ color: '#1E1B4B', fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                Send Us a Message
              </h2>

              {submitted ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#15803d', fontSize: '0.95rem' }}>Message sent!</p>
                    <p style={{ margin: '0.3rem 0 0', color: '#166534', fontSize: '0.87rem' }}>
                      We'll get back to you at <strong>{form.email}</strong> within 24 hours.
                    </p>
                  </div>
                </div>
              ) : (
                <form className="public-contact-form" onSubmit={handleSubmit}>
                  <div className="public-card-grid public-card-grid--2">
                    <div className="public-form-field">
                      <label className="public-form-label">Full Name *</label>
                      <input
                        className="public-form-input"
                        type="text"
                        required
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="public-form-field">
                      <label className="public-form-label">Email Address *</label>
                      <input
                        className="public-form-input"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="public-form-field">
                    <label className="public-form-label">Subject *</label>
                    <input
                      className="public-form-input"
                      type="text"
                      required
                      placeholder="What is your message about?"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    />
                  </div>
                  <div className="public-form-field">
                    <label className="public-form-label">Message *</label>
                    <textarea
                      className="public-form-textarea"
                      required
                      placeholder="Tell us how we can help..."
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    />
                  </div>
                  <div>
                    <button type="submit" className="public-form-submit" disabled={loading}>
                      {loading ? 'Sending...' : <><Send size={15} /> Send Message</>}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <h2 style={{ color: '#1E1B4B', fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                Contact Information
              </h2>
              <div className="public-contact-info">
                <div className="public-contact-info-card">
                  <div className="public-contact-info-card__icon"><Mail size={18} /></div>
                  <div>
                    <p className="public-contact-info-card__label">Email</p>
                    <p className="public-contact-info-card__value">support@nextgenmedical.com</p>
                  </div>
                </div>
                <div className="public-contact-info-card">
                  <div className="public-contact-info-card__icon"><Phone size={18} /></div>
                  <div>
                    <p className="public-contact-info-card__label">WhatsApp</p>
                    <p className="public-contact-info-card__value">+1 (555) 000-1234</p>
                  </div>
                </div>
                <div className="public-contact-info-card">
                  <div className="public-contact-info-card__icon"><Clock size={18} /></div>
                  <div>
                    <p className="public-contact-info-card__label">Office Hours</p>
                    <p className="public-contact-info-card__value">Mon–Fri, 9 AM – 6 PM EST</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', background: '#F9FAFB', border: '1px solid #d6e9fa', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.87rem', color: '#374151', lineHeight: 1.65 }}>
                  <strong style={{ color: '#1E1B4B' }}>For technical issues</strong> or account problems,
                  please include your registered email address and a description of the problem.
                  Our support team will prioritize your ticket.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
