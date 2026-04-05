import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, BookOpen, Target } from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { examOptions, subjectOptions, saveOnboardingData } from '../../data/onboarding'
import type { OnboardingData } from '../../data/onboarding'
import './Onboarding.css'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { completeOnboarding } = useStudentAuth()
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    examType: '',
    examDate: '',
    hoursPerDay: 4,
    studyDays: 'all-week',
    weakSubjects: [],
  })

  const progress = (step / 4) * 100

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = () => {
    saveOnboardingData(formData)
    completeOnboarding()
    navigate('/student/roadmap')
  }

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      weakSubjects: prev.weakSubjects.includes(subject)
        ? prev.weakSubjects.filter(s => s !== subject)
        : [...prev.weakSubjects, subject]
    }))
  }

  const canProceed = () => {
    if (step === 1) return formData.examType !== ''
    if (step === 2) return formData.examDate !== ''
    if (step === 3) return formData.hoursPerDay > 0
    if (step === 4) return formData.weakSubjects.length > 0
    return false
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">
            <img src="/logo.png" alt="NextGen" />
            <span>NextGen <em>USMLE</em></span>
          </div>
          <div className="onboarding-step-label">Step {step} of 4</div>
        </div>

        {/* Progress Bar */}
        <div className="onboarding-progress-track">
          <div className="onboarding-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step Content */}
        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <Target size={40} className="step-icon" />
              <h2>Which exam are you preparing for?</h2>
              <p className="step-subtitle">We'll create a personalized study plan for your target exam</p>
              
              <div className="exam-options">
                {examOptions.map(exam => (
                  <button
                    key={exam.value}
                    className={`exam-option ${formData.examType === exam.value ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, examType: exam.value })}
                  >
                    <span className="exam-radio" />
                    <span>{exam.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <Calendar size={40} className="step-icon" />
              <h2>When is your exam scheduled?</h2>
              <p className="step-subtitle">We'll create a timeline to help you prepare effectively</p>
              
              <div className="date-input-wrap">
                <input
                  type="date"
                  className="date-input"
                  value={formData.examDate}
                  onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <Clock size={40} className="step-icon" />
              <h2>How many hours can you study per day?</h2>
              <p className="step-subtitle">Be realistic — consistency matters more than quantity</p>
              
              <div className="slider-wrap">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={formData.hoursPerDay}
                  onChange={e => setFormData({ ...formData, hoursPerDay: Number(e.target.value) })}
                  className="hour-slider"
                />
                <div className="slider-value">{formData.hoursPerDay} hours/day</div>
              </div>

              <div className="study-days-options">
                <label className="study-day-option">
                  <input
                    type="radio"
                    name="studyDays"
                    checked={formData.studyDays === 'weekdays'}
                    onChange={() => setFormData({ ...formData, studyDays: 'weekdays' })}
                  />
                  <span>Weekdays only (Mon-Fri)</span>
                </label>
                <label className="study-day-option">
                  <input
                    type="radio"
                    name="studyDays"
                    checked={formData.studyDays === 'all-week'}
                    onChange={() => setFormData({ ...formData, studyDays: 'all-week' })}
                  />
                  <span>All 7 days</span>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step">
              <BookOpen size={40} className="step-icon" />
              <h2>Which subjects need more focus?</h2>
              <p className="step-subtitle">Select all that apply — we'll prioritize these in your plan</p>
              
              <div className="subject-grid">
                {subjectOptions.map(subject => (
                  <button
                    key={subject}
                    className={`subject-chip ${formData.weakSubjects.includes(subject) ? 'selected' : ''}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    <span className="subject-check">{formData.weakSubjects.includes(subject) ? '✓' : ''}</span>
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="onboarding-nav">
          {step > 1 && (
            <button className="btn-back" onClick={handleBack}>
              ← Back
            </button>
          )}
          <div className="nav-spacer" />
          {step < 4 ? (
            <button 
              className="btn-next" 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button 
              className="btn-next" 
              onClick={handleSubmit}
              disabled={!canProceed()}
            >
              Generate My Plan →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
