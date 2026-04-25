import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Video, ArrowRight, CheckCircle2, GraduationCap } from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { getAvailablePrograms, studentGetEnrolledClasses } from '../../services/lmsApi'
import type { ProgramListing } from '../../services/lmsApi'
import './StudentProgramsPage.css'

export default function StudentProgramsPage() {
  const { user } = useStudentAuth()
  const [programs, setPrograms] = useState<ProgramListing[]>([])
  const [enrolledProductIds, setEnrolledProductIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pricingMode, setPricingMode] = useState<Record<string, 'upfront' | 'installment'>>({})

  useEffect(() => {
    async function load() {
      const [progs, enrolled] = await Promise.all([
        getAvailablePrograms(),
        user ? studentGetEnrolledClasses(user.id) : Promise.resolve([]),
      ])
      setPrograms(progs)
      const enrolledIds = new Set(enrolled.map(c => c.productId))
      setEnrolledProductIds(enrolledIds)
      const modes: Record<string, 'upfront' | 'installment'> = {}
      progs.forEach(p => { modes[p.product.id] = 'upfront' })
      setPricingMode(modes)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div className="programs-loading">Loading programs…</div>

  if (programs.length === 0) {
    return (
      <div className="programs-empty">
        <BookOpen size={48} />
        <h2>No programs available yet</h2>
        <p>Check back soon — new courses are on the way.</p>
      </div>
    )
  }

  return (
    <div className="programs-page">
      <header className="programs-header">
        <h1>Available Programs</h1>
        <p>Enroll in a live session class with an expert teacher.</p>
      </header>

      <div className="programs-grid">
        {programs.map(({ product, teacherName, classId, sessionCount, enrolledCount }) => {
          const isEnrolled = enrolledProductIds.has(product.id)
          const mode = pricingMode[product.id] ?? 'upfront'

          return (
            <div key={product.id} className="program-card">
              {isEnrolled && (
                <div className="program-card__enrolled-badge">
                  <CheckCircle2 size={13} /> Enrolled
                </div>
              )}

              <div className="program-card__body">
                <h2 className="program-card__name">{product.name}</h2>
                <p className="program-card__desc">{product.description}</p>

                <div className="program-card__meta">
                  <span><GraduationCap size={14} /> {teacherName}</span>
                  <span><Video size={14} /> {sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
                  <span><Users size={14} /> {enrolledCount} enrolled</span>
                </div>
              </div>

              <div className="program-card__footer">
                {!isEnrolled && (
                  <div className="program-card__pricing">
                    <div className="program-pricing-toggle">
                      <button
                        className={`program-pricing-btn ${mode === 'upfront' ? 'program-pricing-btn--active' : ''}`}
                        onClick={() => setPricingMode(prev => ({ ...prev, [product.id]: 'upfront' }))}
                      >
                        Upfront
                      </button>
                      <button
                        className={`program-pricing-btn ${mode === 'installment' ? 'program-pricing-btn--active' : ''}`}
                        onClick={() => setPricingMode(prev => ({ ...prev, [product.id]: 'installment' }))}
                      >
                        Installments
                      </button>
                    </div>
                    <div className="program-card__price">
                      {mode === 'upfront' ? (
                        <span>${product.upfrontPrice}</span>
                      ) : (
                        <span>${product.installmentAmount}<em>/mo × {product.installmentMonths}</em></span>
                      )}
                    </div>
                  </div>
                )}

                <div className="program-card__actions">
                  <Link to={`/student/programs/${product.id}`} className="program-card__details-btn">
                    View Details
                  </Link>
                  {isEnrolled ? (
                    <Link to="/student/classes" className="program-card__cta program-card__cta--enrolled">
                      Go to My Classes <ArrowRight size={15} />
                    </Link>
                  ) : (
                    <Link
                      to={`/student/checkout/${product.id}`}
                      className="program-card__cta"
                      state={{ plan: mode }}
                    >
                      Enroll Now <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
