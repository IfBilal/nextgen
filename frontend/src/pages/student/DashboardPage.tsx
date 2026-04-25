import { Link } from 'react-router-dom'
import { ArrowRight, Video, ShoppingBag, Clock, AlertTriangle } from 'lucide-react'
import WelcomeBar from '../../components/student/dashboard/WelcomeBar'
import DonutRing from '../../components/student/dashboard/DonutRing'
import { studentDashboardData } from '../../data/dashboard'
import { useSubscription } from '../../context/SubscriptionContext'
import '../../components/student/dashboard/Dashboard.css'

export default function DashboardPage() {
  const data = studentDashboardData
  const { snapshot, planLabel } = useSubscription()
  const qbankPct = Math.round((data.questionsAnswered / data.totalQuestions) * 100)

  const isDemo = snapshot?.isCurrentPlanTimeBound
  const isExpired = snapshot?.isCurrentPlanExpired
  const daysLeft = snapshot?.remainingDays ?? 0

  return (
    <div className="dashboard-container">
      <WelcomeBar data={data} />

      {/* Demo / expiry banners */}
      {isExpired && (
        <div className="db-banner db-banner--red">
          <AlertTriangle size={16} />
          <span>Your {planLabel} has expired. Upgrade to continue accessing all features.</span>
          <Link to="/student/demo-expired" className="db-banner__cta">View options →</Link>
        </div>
      )}
      {isDemo && !isExpired && daysLeft <= 3 && (
        <div className="db-banner db-banner--amber">
          <Clock size={16} />
          <span>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your {planLabel}.</span>
          <Link to="/student/lms-preview" className="db-banner__cta">See what's included →</Link>
        </div>
      )}

      {/* Quick links to LMS */}
      <div className="db-lms-strip">
        <Link to="/student/programs" className="db-lms-card">
          <ShoppingBag size={20} />
          <div>
            <strong>Browse Programs</strong>
            <span>Enroll in a live class cohort</span>
          </div>
          <ArrowRight size={16} className="db-lms-card__arrow" />
        </Link>
        <Link to="/student/classes" className="db-lms-card">
          <Video size={20} />
          <div>
            <strong>My Classes</strong>
            <span>Sessions, recordings & chat</span>
          </div>
          <ArrowRight size={16} className="db-lms-card__arrow" />
        </Link>
      </div>

      {/* Main Stats Card */}
      <div className="stats-card">
        <div className="stats-header">
          <div>
            <h2 className="stats-title">Statistics</h2>
            <p className="stats-updated">Last updated: today</p>
          </div>
          <Link to="/student/analytics" className="stats-link">
            View Full Analytics <ArrowRight size={14} />
          </Link>
        </div>

        <div className="donuts-section">
          <DonutRing value={data.overallScore} label="Correct" color="#27AE60" size={180} />
          <DonutRing value={qbankPct} label="Used" color="#1A6FAD" size={180} />
        </div>

        <div className="stats-tables">
          <div className="stats-table">
            <h3 className="stats-table-title">Your Score</h3>
            <div className="stats-row">
              <span className="stats-label">Total Correct</span>
              <span className="stats-value">{data.correctQs}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Total Incorrect</span>
              <span className="stats-value">{data.incorrectQs}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Total Omitted</span>
              <span className="stats-value">{data.omittedQs}</span>
            </div>

            <div className="stats-divider" />

            <h3 className="stats-table-title">Answer Changes</h3>
            <div className="stats-row">
              <span className="stats-label">Correct → Incorrect</span>
              <span className="stats-value">{data.answerChanges.ci}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Incorrect → Correct</span>
              <span className="stats-value">{data.answerChanges.ic}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Incorrect → Incorrect</span>
              <span className="stats-value">{data.answerChanges.ii}</span>
            </div>
          </div>

          <div className="stats-table">
            <h3 className="stats-table-title">QBank Usage</h3>
            <div className="stats-row">
              <span className="stats-label">Used Questions</span>
              <span className="stats-value">{data.questionsAnswered}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Unused Questions</span>
              <span className="stats-value">{data.totalQuestions - data.questionsAnswered}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Total Questions</span>
              <span className="stats-value">{data.totalQuestions}</span>
            </div>

            <div className="stats-divider" />

            <h3 className="stats-table-title">Test Count</h3>
            <div className="stats-row">
              <span className="stats-label">Tests Created</span>
              <span className="stats-value">{data.testsCreated}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Tests Completed</span>
              <span className="stats-value">{data.testsCompleted}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Suspended Tests</span>
              <span className="stats-value">{data.testsSuspended}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
