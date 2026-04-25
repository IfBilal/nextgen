import { useEffect, useState } from 'react'
import { Lock, CheckCircle2, Video, MessageCircle, BarChart2, Bell, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { studentGetEnrolledClasses } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import '../../styles/demo.css'

const SESSIONS = [
  { n: 1, topic: 'Biochemistry Foundations', unlocked: true },
  { n: 2, topic: 'Enzyme Kinetics & Inhibition', unlocked: true },
  { n: 3, topic: 'Molecular Biology Essentials', unlocked: true },
  { n: 4, topic: 'Cardiology Basics', unlocked: false },
  { n: 5, topic: 'Renal Physiology', unlocked: false },
  { n: 6, topic: 'Pulmonary Pathology', unlocked: false },
  { n: 7, topic: 'Gastrointestinal System', unlocked: false },
  { n: 8, topic: 'Neuroscience High-Yield', unlocked: false },
  { n: 9, topic: 'Immunology & Microbiology', unlocked: false },
  { n: 10, topic: 'Pharmacology Core', unlocked: false },
]

const FEATURES = [
  { icon: Video, title: 'All Recorded Sessions', note: 'Only today\'s available in demo' },
  { icon: MessageCircle, title: 'Full Chat with Teacher', note: 'Ask unlimited questions' },
  { icon: BarChart2, title: 'Full Attendance History', note: 'Track every session' },
  { icon: Bell, title: 'Priority Notifications', note: 'Never miss a session' },
]

const QUOTES = [
  '"The live sessions are exactly what I needed for Step 1."',
  '"Dr. Carter explains everything so clearly — worth every penny."',
  '"Enrolled after the demo and haven\'t looked back."',
]

export default function LmsFomoPreviewPage() {
  const { user } = useStudentAuth()
  const [demoExpiry, setDemoExpiry] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    studentGetEnrolledClasses(user.id).then(classes => {
      // Check if any class has a demo expiry (mock — always show for demo)
      setDemoExpiry(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
    })
  }, [user?.id])

  const isUrgent = demoExpiry && new Date(demoExpiry).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <div className="fomo-page">
      {/* Hero */}
      <div className="fomo-hero">
        <div className="fomo-hero__left">
          <h1>You're in demo mode — here's what you'll unlock when you enroll</h1>
          <p>Get full access to live sessions, recordings, teacher chat, and more.</p>
        </div>
        {demoExpiry && (
          <div className={`fomo-expiry-chip ${isUrgent ? 'fomo-expiry-chip--red' : 'fomo-expiry-chip--amber'}`}>
            ⏰ Demo expires {isUrgent ? 'soon!' : 'in 2 days'}
          </div>
        )}
      </div>

      {/* Feature grid */}
      <div className="fomo-features-grid">
        {FEATURES.map(f => (
          <div key={f.title} className="fomo-feature-card">
            <div className="fomo-feature-card__icon">
              <f.icon size={20} />
            </div>
            <h3>{f.title}</h3>
            <p><Lock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{f.note}</p>
          </div>
        ))}
      </div>

      {/* Session roadmap */}
      <div className="fomo-roadmap-section">
        <h2>Your Program Roadmap — 10 Sessions</h2>
        <div className="fomo-session-list">
          {SESSIONS.map(s => (
            <div key={s.n} className={`fomo-session-item ${s.unlocked ? 'fomo-session-item--unlocked' : 'fomo-session-item--locked'}`}>
              <div className="fomo-session-num">
                {s.unlocked ? <CheckCircle2 size={14} /> : s.n}
              </div>
              <div className="fomo-session-topic">Session {s.n} — {s.topic}</div>
              {!s.unlocked && <Lock size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="fomo-social-strip">
        <div className="fomo-social-stat">
          <span>47</span> students enrolled this week
        </div>
        <div className="fomo-quotes">
          {QUOTES.map(q => <div key={q} className="fomo-quote">{q}</div>)}
        </div>
      </div>

      {/* CTA */}
      <div className="fomo-cta-banner">
        <h2>Ready to unlock everything?</h2>
        <Link to="/student/checkout" className="fomo-cta-btn">
          Enroll Now <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </Link>
      </div>
    </div>
  )
}
