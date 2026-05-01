import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CirclePlay,
  ClipboardList,
  GraduationCap,
  LineChart,
  PlayCircle,
  Quote,
  ShieldCheck,
  Stethoscope,
  Target,
  Users,
  Zap,
} from 'lucide-react'
import { DEFAULT_DEMO_VIDEO_URL } from '../data/contentVault'
import { LANDING_FEATURES, LANDING_STATS, LANDING_TESTIMONIALS } from '../data/landing'
import '../styles/landing.css'

function ScheduleGenerator() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    examType: 'step1',
    examDate: '',
    hoursPerDay: '6',
    readiness: 'beginner',
  })

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/student/register')
  }

  return (
    <section className="lsg-wrap">

      {/* ── Left: illustration + copy ── */}
      <div className="lsg-left">
        {/* Calendar illustration */}
        <div className="lsg-cal">
          <div className="lsg-cal__header" />
          <div className="lsg-cal__body">
            {Array.from({ length: 15 }).map((_, i) => <div key={i} className="lsg-cal__cell" />)}
          </div>
          <div className="lsg-cal__badge"><CheckCircle2 size={14} /></div>
        </div>

        {/* Text */}
        <div className="lsg-left-text">
          <span className="lsg-badge"><Zap size={10} /> Free for a limited time</span>
          <h2 className="lsg-title">Free Personalized<br />USMLE Schedule Generator</h2>
          <p className="lsg-sub">Tell us your exam date, study hours, and target score — and our AI creates your perfect roadmap.</p>
          <div className="lsg-arrow" aria-hidden="true">
            <svg viewBox="0 0 90 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 10 C22 2, 54 2, 74 22 C78 26, 80 33, 76 40" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="5 3"/>
              <path d="M70 41 L76 40 L74 34" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <form className="lsg-form" onSubmit={handleGenerate}>
        <div className="lsg-fields">
          <div className="lsg-field">
            <label className="lsg-label">Exam Type</label>
            <select className="lsg-select" value={form.examType} onChange={e => set('examType', e.target.value)}>
              <option value="step1">Step 1</option>
              <option value="step2ck">Step 2 CK</option>
              <option value="step3">Step 3</option>
              <option value="mccqe1">MCCQE Part 1</option>
            </select>
          </div>
          <div className="lsg-field">
            <label className="lsg-label">Exam Date</label>
            <input type="date" className="lsg-select" value={form.examDate} onChange={e => set('examDate', e.target.value)} />
          </div>
          <div className="lsg-field">
            <label className="lsg-label">Hours per day</label>
            <select className="lsg-select" value={form.hoursPerDay} onChange={e => set('hoursPerDay', e.target.value)}>
              <option value="2">2 Hours</option>
              <option value="4">4 Hours</option>
              <option value="6">6 Hours</option>
              <option value="8">8 Hours</option>
              <option value="10">10 Hours</option>
            </select>
          </div>
          <div className="lsg-field">
            <label className="lsg-label">Current Readiness</label>
            <select className="lsg-select" value={form.readiness} onChange={e => set('readiness', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <button type="submit" className="lsg-btn">
          Generate My Schedule
        </button>
      </form>
    </section>
  )
}

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

          <div className="landing-hero-dashboard landing-reveal landing-reveal--right">
            <div className="landing-hero-dashboard__glow" />
            <img src="/dashboard.png" alt="NextGen Student Dashboard" className="landing-hero-dashboard__img" />
          </div>
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

        <ScheduleGenerator />

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

        {/* ── How NextGen Works ── */}
        <section className="landing-section landing-how-section">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">Simple. Smart. Effective.</span>
            <h2>How <span className="landing-section-highlight">NextGen USMLE</span> Works</h2>
            <p>Four focused steps from signup to score improvement.</p>
          </div>

          <div className="landing-how-steps">
            <div className="landing-how-step">
              <div className="landing-how-step__icon">
                <ClipboardList size={26} />
              </div>
              <div className="landing-how-step__label">Step 1</div>
              <h3 className="landing-how-step__title">Tell Us About You</h3>
              <p className="landing-how-step__desc">Share your exam date, target score, and weak subjects so we can build your plan.</p>
            </div>

            <div className="landing-how-connector" aria-hidden="true">
              <span /><span /><span />
              <ArrowRight size={18} />
            </div>

            <div className="landing-how-step">
              <div className="landing-how-step__icon">
                <Target size={26} />
              </div>
              <div className="landing-how-step__label">Step 2</div>
              <h3 className="landing-how-step__title">Get Your Roadmap</h3>
              <p className="landing-how-step__desc">Receive a personalized study plan designed for your timeline and goals.</p>
            </div>

            <div className="landing-how-connector" aria-hidden="true">
              <span /><span /><span />
              <ArrowRight size={18} />
            </div>

            <div className="landing-how-step">
              <div className="landing-how-step__icon">
                <GraduationCap size={26} />
              </div>
              <div className="landing-how-step__label">Step 3</div>
              <h3 className="landing-how-step__title">Practice & Learn</h3>
              <p className="landing-how-step__desc">Take tests, attend live classes, and study with high-yield content every day.</p>
            </div>

            <div className="landing-how-connector" aria-hidden="true">
              <span /><span /><span />
              <ArrowRight size={18} />
            </div>

            <div className="landing-how-step">
              <div className="landing-how-step__icon">
                <LineChart size={26} />
              </div>
              <div className="landing-how-step__label">Step 4</div>
              <h3 className="landing-how-step__title">Analyze & Improve</h3>
              <p className="landing-how-step__desc">Track your progress and improve weak areas consistently with smart analytics.</p>
            </div>
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

        {/* ── About Us ── */}
        <section className="landing-section landing-about-section">
          <div className="landing-about-inner">
            <div className="landing-about-text">
              <span className="landing-section-eyebrow">Who We Are</span>
              <h2>Built by medical educators,<br />for future doctors</h2>
              <p>
                NextGen USMLE was founded by a team of physicians and educators who experienced firsthand how fragmented and stressful board exam prep can be. We built this platform to replace scattered resources with one smart, structured system.
              </p>
              <p>
                From personalized roadmaps to live expert sessions, everything here is designed around one goal: helping you pass with confidence.
              </p>
              <div className="landing-about-stats">
                <div>
                  <strong>2,400+</strong>
                  <span>Students prepared</span>
                </div>
                <div>
                  <strong>4.8/5</strong>
                  <span>Average rating</span>
                </div>
                <div>
                  <strong>98%</strong>
                  <span>Pass rate</span>
                </div>
              </div>
            </div>
            <div className="landing-about-values">
              {[
                { icon: Target, title: 'Precision', desc: 'Every feature is built around the exact demands of USMLE prep — nothing generic.' },
                { icon: Users, title: 'Community', desc: 'Study partners, live sessions, and peer leaderboards keep you accountable.' },
                { icon: ShieldCheck, title: 'Trust', desc: 'Trusted by learners from Harvard, Johns Hopkins, Stanford, and more.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="landing-about-value-card">
                  <div className="landing-about-value-card__icon"><Icon size={20} /></div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
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

      {/* WhatsApp float */}
      <div className="landing-wa-float">
        <div className="landing-wa-float__bubble">
          <p className="landing-wa-float__label">Talk to us</p>
          <a href="https://wa.me/923310203232" target="_blank" rel="noopener noreferrer">+92 331 0203232</a>
          <a href="https://wa.me/923335549499" target="_blank" rel="noopener noreferrer">+92 333 5549499</a>
        </div>
        <div className="landing-wa-float__btn" title="Chat on WhatsApp">
          <svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.47 2.027 7.773L0 32l8.437-2.012A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.75-1.836l-.484-.287-5.008 1.194 1.224-4.871-.316-.501A13.283 13.283 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.862c-.398-.199-2.354-1.161-2.718-1.294-.364-.133-.629-.199-.894.199-.265.398-1.027 1.294-1.259 1.56-.232.265-.464.298-.862.1-.398-.2-1.681-.619-3.202-1.975-1.183-1.055-1.982-2.357-2.214-2.755-.232-.398-.025-.613.175-.811.18-.178.398-.465.597-.697.199-.232.265-.398.398-.663.133-.265.066-.498-.033-.697-.1-.199-.894-2.154-1.225-2.95-.322-.772-.649-.667-.894-.68l-.762-.013c-.265 0-.697.1-1.061.498-.364.398-1.393 1.36-1.393 3.315s1.426 3.845 1.625 4.11c.199.265 2.807 4.287 6.803 6.013.951.41 1.693.655 2.271.839.954.303 1.823.26 2.51.158.766-.114 2.354-.962 2.686-1.891.332-.929.332-1.725.232-1.891-.099-.166-.364-.265-.762-.464z"/></svg>
        </div>
      </div>
    </div>
  )
}
