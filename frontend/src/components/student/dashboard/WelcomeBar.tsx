import { getGreeting, getDaysUntilExam, type StudentDashboardData } from '../../../data/dashboard'
import { useSubscription } from '../../../context/SubscriptionContext'

interface Props {
  data: StudentDashboardData
}

export default function WelcomeBar({ data }: Props) {
  const greeting = getGreeting()
  const daysLeft = getDaysUntilExam(data.examDate)
  const { planLabel, snapshot } = useSubscription()

  const demoStatus = snapshot?.isCurrentPlanTimeBound
    ? snapshot.isCurrentPlanExpired
      ? `${planLabel} expired`
      : `${snapshot.remainingDays} day(s) left in ${planLabel}`
    : null

  return (
    <div className="welcome-bar">
      <div className="welcome-left">
        <h1 className="welcome-greeting">{greeting}, {data.name} 👋</h1>
        <p className="welcome-subtitle">Here's your performance overview</p>
        <div className="welcome-plan-row">
          <span className="welcome-plan-chip">Current Plan: {planLabel}</span>
          {demoStatus ? <span className="welcome-demo-chip">{demoStatus}</span> : null}
        </div>
      </div>
      <div className="welcome-right">
        <div className="exam-badge">
          <span className="exam-icon">📅</span>
          <div className="exam-info">
            <span className="exam-name">USMLE Step 1</span>
            <span className="exam-days">{daysLeft} days away</span>
          </div>
        </div>
      </div>
    </div>
  )
}
