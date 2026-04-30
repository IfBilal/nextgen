import { Target, Eye, Heart } from 'lucide-react'
import '../../styles/public.css'

const VALUES = [
  { icon: Target, title: 'Excellence', desc: 'We only work with board-certified physicians who have a proven track record of student success.' },
  { icon: Eye, title: 'Transparency', desc: 'Clear pricing, no hidden fees, and honest progress tracking so you always know where you stand.' },
  { icon: Heart, title: 'Student First', desc: 'Every feature we build is designed around what students actually need to pass their exams.' },
]

export default function AboutPage() {
  return (
    <>
      <section className="public-page-hero">
        <h1>About NextGen Medical Mastery</h1>
        <p>We built the platform we wished existed when we were preparing for board exams.</p>
      </section>

      <section className="public-section">
        <div className="public-section__inner">
          <div className="public-card-grid public-card-grid--2">
            <div>
              <span className="public-section__eyebrow">Our Mission</span>
              <h2 className="public-section__title" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                Making Expert Medical Education Accessible
              </h2>
              <p style={{ color: '#6B7280', lineHeight: 1.75, fontSize: '0.93rem' }}>
                NextGen Medical Mastery was founded by physicians who experienced firsthand the gap between
                expensive one-on-one tutoring and generic self-study resources. We believe every medical
                student deserves access to expert live instruction at a fair price.
              </p>
              <p style={{ color: '#6B7280', lineHeight: 1.75, fontSize: '0.93rem', marginTop: '0.75rem' }}>
                Our platform combines the intimacy of small-group live sessions with the convenience of
                recorded libraries, downloadable materials, and personalized progress tracking.
              </p>
            </div>
            <div>
              <span className="public-section__eyebrow">Our Vision</span>
              <h2 className="public-section__title" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                Redefining Board Exam Preparation
              </h2>
              <p style={{ color: '#6B7280', lineHeight: 1.75, fontSize: '0.93rem' }}>
                We envision a future where every medical student — regardless of their background or
                budget — can access world-class exam preparation tools. We are continuously expanding
                our faculty and curriculum to cover more exams and specialties.
              </p>
              <p style={{ color: '#6B7280', lineHeight: 1.75, fontSize: '0.93rem', marginTop: '0.75rem' }}>
                Today we focus on USMLE. Tomorrow, every major medical board exam.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section public-section--alt">
        <div className="public-section__inner">
          <div className="public-section__header">
            <span className="public-section__eyebrow">What We Stand For</span>
            <h2 className="public-section__title">Our Core Values</h2>
          </div>
          <div className="public-card-grid public-card-grid--3">
            {VALUES.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className="public-feature-card">
                  <div className="public-feature-card__icon"><Icon size={20} /></div>
                  <h4 className="public-feature-card__title">{v.title}</h4>
                  <p className="public-feature-card__desc">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section__inner">
          <div className="public-section__header">
            <span className="public-section__eyebrow">What We Offer</span>
            <h2 className="public-section__title">Everything You Need to Pass</h2>
          </div>
          <div className="public-card-grid public-card-grid--2">
            {[
              'Live twice-weekly sessions with board-certified physicians',
              'Full session recordings accessible 24/7',
              'Downloadable high-yield PDFs and study guides',
              'Direct Q&A with your assigned teacher',
              'Attendance tracking and progress analytics',
              'Flexible payment: upfront or monthly installments',
              '2-day free demo with no credit card required',
              'WhatsApp, email, and push notifications for live sessions',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: '1px solid #eef4fc', color: '#374151', fontSize: '0.9rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3730A3', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
