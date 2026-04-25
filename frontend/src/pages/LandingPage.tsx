import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CirclePlay,
  PlayCircle,
  Quote,
  Sparkles,
  ShieldCheck,
  Star,
  Stethoscope,
  Target,
  TrendingUp,
} from 'lucide-react'
import { DEFAULT_DEMO_VIDEO_URL } from '../data/contentVault'
import { LANDING_FEATURES, LANDING_STATS, LANDING_TESTIMONIALS } from '../data/landing'
import '../styles/landing.css'

const FEATURE_ICONS = [Target, BookOpen, BarChart3, ShieldCheck]

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = pageRef.current
    if (!root) return

    let rafId = 0

    const updateFromPointer = (clientX: number, clientY: number) => {
      const rect = root.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const x = clientX - rect.left
      const y = clientY - rect.top
      const nx = Math.max(0, Math.min(1, x / rect.width))
      const ny = Math.max(0, Math.min(1, y / rect.height))

      const offsetX = (nx - 0.5) * 16
      const offsetY = (ny - 0.5) * 14

      root.style.setProperty('--mouse-x', `${(nx * 100).toFixed(2)}%`)
      root.style.setProperty('--mouse-y', `${(ny * 100).toFixed(2)}%`)
      root.style.setProperty('--mx-float', `${offsetX.toFixed(2)}px`)
      root.style.setProperty('--my-float', `${offsetY.toFixed(2)}px`)
    }

    const handleMove = (event: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => updateFromPointer(event.clientX, event.clientY))
    }

    const handleLeave = () => {
      root.style.setProperty('--mouse-x', '50%')
      root.style.setProperty('--mouse-y', '45%')
      root.style.setProperty('--mx-float', '0px')
      root.style.setProperty('--my-float', '0px')
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseout', handleLeave)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseout', handleLeave)
    }
  }, [])

  return (
    <div ref={pageRef} className="landing-page">
      <div className="landing-bg-orb landing-bg-orb--left" />
      <div className="landing-bg-orb landing-bg-orb--right" />
      <div className="landing-bg-orb landing-bg-orb--mid" />

      <header className="landing-topbar landing-reveal landing-reveal--top">
        <div className="landing-brand">
          <img src="/logo.png" alt="NextGen" />
          <span>NextGen</span>
        </div>

        <div className="landing-topbar-actions">
          <Link to="/teacher/login" className="landing-btn landing-btn--ghost" style={{ fontSize: '0.82rem', opacity: 0.75 }}>
            Teacher Login
          </Link>
          <Link to="/student/login" className="landing-btn landing-btn--ghost">
            Login
          </Link>
          <Link to="/student/register" className="landing-btn landing-btn--primary">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy landing-reveal landing-reveal--left">
            <span className="landing-chip">
              <Stethoscope size={14} /> Built for serious medical exam prep
            </span>

            <h1>
              A focused learning system to help you <span>clear USMLE with confidence</span>
            </h1>

            <p>
              Plan smarter, practice with precision, and review performance daily using one seamless prep experience.
            </p>

            <div className="landing-hero-ctas">
              <Link to="/student/login" className="landing-btn landing-btn--primary landing-btn--lg">
                Sign Up Free <ArrowRight size={17} />
              </Link>
              <a href="#demo" className="landing-btn landing-btn--outline landing-btn--lg">
                <CirclePlay size={17} /> Watch Demo
              </a>
            </div>

            <div className="landing-hero-points">
              {['Roadmap in minutes', 'Topic-focused tests', 'Daily progress diagnostics'].map((point, index) => (
                <div key={point} style={{ animationDelay: `${120 * index}ms` }}>
                  <CheckCircle2 size={16} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <article className="landing-hero-panel landing-reveal landing-reveal--right">
            <div className="landing-hero-panel-glow" />

            <div className="landing-panel-badge">
              <Sparkles size={14} /> New cohort onboarding flow
            </div>

            <h3>Clear prep, better execution</h3>

            <div className="landing-panel-metrics">
              <div className="landing-panel-metric-card">
                <TrendingUp size={16} />
                <div>
                  <strong>+18%</strong>
                  <span>Average score lift</span>
                </div>
              </div>
              <div className="landing-panel-metric-card">
                <CalendarDays size={16} />
                <div>
                  <strong>12 weeks</strong>
                  <span>Structured roadmap cycle</span>
                </div>
              </div>
            </div>

            <ul>
              <li>Clear day-by-day study direction</li>
              <li>Fast visibility into weak zones</li>
              <li>One place for tests, review, and content</li>
            </ul>

            <div className="landing-panel-rating">
              <div>
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
              </div>
              <p>Rated by medical learners across cohorts</p>
            </div>
          </article>
        </section>

        <section className="landing-trust-strip">
          {['USMLE-Focused Platform', 'Roadmap + Tests + Diagnostics', 'Built for Medical Learners', 'Fast Daily Workflow'].map((item, index) => (
            <span key={item} style={{ animationDelay: `${180 * index}ms` }}>{item}</span>
          ))}
        </section>

        <section className="landing-stats">
          {LANDING_STATS.map((stat, index) => (
            <article key={stat.id} className="landing-stat-card landing-reveal" style={{ animationDelay: `${80 * index}ms` }}>
              <h3>{stat.value}</h3>
              <h4>{stat.label}</h4>
              <p>{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2>Everything needed for consistent exam preparation</h2>
            <p>Built to reduce planning fatigue and increase high-quality practice repetitions.</p>
          </div>

          <div className="landing-features-grid">
            {LANDING_FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length]
              return (
                <article
                  key={feature.id}
                  className="landing-feature-card landing-reveal"
                  style={{ animationDelay: `${90 * index}ms` }}
                >
                  <div className="landing-feature-icon">
                    <Icon size={18} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="demo" className="landing-section landing-demo-section">
          <div className="landing-section-head">
            <h2>See the product in action</h2>
            <p>A short walkthrough of roadmap planning, test flow, and score diagnostics.</p>
          </div>

          <div className="landing-demo-wrap">
            <video controls preload="metadata" src={DEFAULT_DEMO_VIDEO_URL} className="landing-demo-video" />
          </div>

          <div className="landing-demo-points">
            <div>
              <PlayCircle size={16} /> Quick onboarding + goal setup
            </div>
            <div>
              <PlayCircle size={16} /> Personalized week-by-week plan
            </div>
            <div>
              <PlayCircle size={16} /> Test performance diagnostics review
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2>Student testimonials</h2>
            <p>Using placeholder reviews for now — ready to replace with backend API data later.</p>
          </div>

          <div className="landing-testimonials-grid">
            {LANDING_TESTIMONIALS.map((testimonial, index) => (
              <article
                key={testimonial.id}
                className="landing-testimonial-card landing-reveal"
                style={{ animationDelay: `${100 * index}ms` }}
              >
                <Quote size={18} className="landing-quote-icon" />
                <p className="landing-testimonial-quote">{testimonial.quote}</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar">{testimonial.name.charAt(0)}</div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
                <p className="landing-testimonial-result">{testimonial.result}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2>Live Class Programs</h2>
            <p>Join expert-led cohorts with live sessions, recorded replays, and direct teacher chat.</p>
          </div>
          <div className="landing-programs-grid">
            <article className="landing-program-card">
              <div className="landing-program-card__tag">USMLE Step 1</div>
              <h3>USMLE Step 1 Online Sessions</h3>
              <p>Twice-weekly live sessions covering Biochemistry, Physiology, and Pathology. Small group format for maximum interaction.</p>
              <div className="landing-program-card__meta">
                <span><BookOpen size={13} /> 10+ sessions</span>
                <span><CalendarDays size={13} /> Cohort-based</span>
              </div>
              <div className="landing-program-card__price">From <strong>$99/mo</strong></div>
              <Link to="/student/login" className="landing-btn landing-btn--primary">
                Enroll Now <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </section>

        <section className="landing-final-cta">
          <h2>Start preparing with a clear daily strategy</h2>
          <p>Open your account, set your exam date, and begin your personalized roadmap today.</p>
          <div>
            <Link to="/student/login" className="landing-btn landing-btn--primary landing-btn--lg landing-btn--pulse">
              Sign Up Now <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
