import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, AlertTriangle, Clock, TrendingUp, TrendingDown,
  BookOpen, ShoppingBag, ChevronRight, Calendar,
} from 'lucide-react'
import WelcomeBar from '../../components/student/dashboard/WelcomeBar'
import DonutRing from '../../components/student/dashboard/DonutRing'
import TodaysPlan from '../../components/student/dashboard/TodaysPlan'
import { studentDashboardData } from '../../data/dashboard'
import { useSubscription } from '../../context/SubscriptionContext'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { studentGetEnrolledClasses } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import '../../components/student/dashboard/Dashboard.css'

export default function DashboardPage() {
  const data = studentDashboardData
  const { snapshot, planLabel } = useSubscription()
  const { user } = useStudentAuth()
  const navigate = useNavigate()
  const [enrolledClasses, setEnrolledClasses] = useState<ClassWithProduct[]>([])

  const isDemo = snapshot?.isCurrentPlanTimeBound
  const isExpired = snapshot?.isCurrentPlanExpired
  const daysLeft = snapshot?.remainingDays ?? 0

  const lastTest = data.recentTests[0]

  useEffect(() => {
    if (user?.id) {
      studentGetEnrolledClasses(user.id).then(setEnrolledClasses).catch(() => {})
    }
  }, [user?.id])

  // Next upcoming session across all enrolled classes
  const nextSession = enrolledClasses
    .filter(c => c.nextSession != null)
    .map(c => ({ ...c.nextSession!, className: c.name }))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  return (
    <div className="dashboard-container">
      <WelcomeBar data={data} />

      {/* Banners */}
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

      {/* ── Row 1: Today's Plan · Progress · Weak Areas ── */}
      <div className="db-row db-row--3">
        {/* Today's Plan */}
        <TodaysPlan />

        {/* Your Progress */}
        <div className="db-card">
          <div className="db-card__head">
            <h2 className="db-card__title">Your Progress</h2>
            <Link to="/student/analytics" className="db-card__link">
              Full stats <ChevronRight size={13} />
            </Link>
          </div>

          <div className="db-progress-body">
            <DonutRing value={data.overallScore} label="Completed" color="#4F46E5" size={140} />

            <div className="db-progress-stats">
              <div className="db-progress-stat">
                <span className="db-progress-stat__label">Step 1 Progress</span>
                <span className="db-progress-stat__val db-progress-stat__val--blue">
                  {data.overallScore}%
                </span>
                <span className="db-progress-stat__sub">
                  {data.scoreChangeVsLastWeek >= 0
                    ? <TrendingUp size={11} className="db-trend--up" />
                    : <TrendingDown size={11} className="db-trend--down" />}
                  <span className={data.scoreChangeVsLastWeek >= 0 ? 'db-trend--up' : 'db-trend--down'}>
                    {data.scoreChangeVsLastWeek >= 0 ? '+' : ''}{data.scoreChangeVsLastWeek}% vs last week
                  </span>
                </span>
              </div>

              <div className="db-progress-stat">
                <span className="db-progress-stat__label">Study Streak</span>
                <span className="db-progress-stat__val">
                  {data.studyStreakDays} days 🔥
                </span>
                <span className="db-progress-stat__sub">Best: {data.personalBestStreak} days</span>
              </div>

              <div className="db-progress-stat">
                <span className="db-progress-stat__label">Total Study Time</span>
                <span className="db-progress-stat__val">
                  {data.totalStudyHours}h
                </span>
                <span className="db-progress-stat__sub">{data.hoursThisWeek}h this week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weak Areas */}
        <div className="db-card">
          <div className="db-card__head">
            <h2 className="db-card__title">Focus Areas</h2>
            <Link to="/student/analytics" className="db-card__link">
              All subjects <ChevronRight size={13} />
            </Link>
          </div>
          <div className="db-weak-list">
            {data.weakSubjects.map(s => {
              const color = s.accuracyPct < 50 ? '#e74c3c' : s.accuracyPct < 65 ? '#f59e0b' : '#27AE60'
              return (
                <div key={s.name} className="db-weak-row">
                  <div className="db-weak-top">
                    <span className="db-weak-name">{s.name}</span>
                    <span className="db-weak-pct" style={{ color }}>{s.accuracyPct}%</span>
                  </div>
                  <div className="db-progress-bar-track">
                    <div className="db-progress-bar-fill" style={{ width: `${s.accuracyPct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Row 2: Last Test · Upcoming Class / Browse Programs ── */}
      <div className="db-row db-row--2">
        {/* Last Test */}
        <div className="db-card">
          <div className="db-card__head">
            <h2 className="db-card__title">Last Test</h2>
            <button type="button" className="db-card__link" onClick={() => navigate('/student/qbank')}>
              New test <ChevronRight size={13} />
            </button>
          </div>
          {lastTest ? (
            <div className="db-last-test">
              <div className="db-last-test__score-row">
                <span
                  className="db-last-test__score"
                  style={{ color: lastTest.score >= 70 ? '#27AE60' : lastTest.score >= 55 ? '#f59e0b' : '#e74c3c' }}
                >
                  {lastTest.score}%
                </span>
                <div className="db-last-test__meta">
                  <span className="db-last-test__subject">{lastTest.subject}</span>
                  <span className="db-last-test__mode">{lastTest.mode} · {lastTest.questionsCount} Qs · {lastTest.durationMins} min</span>
                  <span className="db-last-test__date">{lastTest.date}</span>
                </div>
              </div>
              <div className="db-last-test__tests-row">
                <div className="db-stat-chip">
                  <span className="db-stat-chip__label">Created</span>
                  <span className="db-stat-chip__val">{data.testsCreated}</span>
                </div>
                <div className="db-stat-chip">
                  <span className="db-stat-chip__label">Completed</span>
                  <span className="db-stat-chip__val">{data.testsCompleted}</span>
                </div>
                <div className="db-stat-chip">
                  <span className="db-stat-chip__label">Suspended</span>
                  <span className="db-stat-chip__val">{data.testsSuspended}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="db-empty-text">No tests completed yet.</p>
          )}
        </div>

        {/* Upcoming Class or Browse Programs */}
        <div className="db-card">
          {nextSession ? (
            <>
              <div className="db-card__head">
                <h2 className="db-card__title">Upcoming Class</h2>
                <Link to="/student/classes" className="db-card__link">
                  My Classes <ChevronRight size={13} />
                </Link>
              </div>
              <div className="db-upcoming">
                <div className="db-upcoming__class-name">{nextSession.className}</div>
                <div className="db-upcoming__topic">Live Session</div>
                <div className="db-upcoming__time">
                  <Calendar size={13} />
                  {new Date(nextSession.scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                  {' · '}
                  {new Date(nextSession.scheduledAt).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit',
                  })}
                </div>
                <Link to="/student/classes" className="db-upcoming__join">
                  View in My Classes <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="db-card__head">
                <h2 className="db-card__title">Live Classes</h2>
              </div>
              <div className="db-browse">
                <ShoppingBag size={32} className="db-browse__icon" />
                <p className="db-browse__text">
                  Enroll in a live class cohort to get real-time instruction and recorded sessions.
                </p>
                <Link to="/student/programs" className="db-browse__cta">
                  <BookOpen size={15} /> Browse Programs <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
