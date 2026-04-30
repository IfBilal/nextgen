import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import DonutRing from './DonutRing'
import type { StudentDashboardData } from '../../../data/dashboard'

interface Props { data: StudentDashboardData }

export default function ScoreOverview({ data }: Props) {
  const qbankPct = Math.round((data.questionsAnswered / data.totalQuestions) * 100)

  const scoreRows = [
    { label: 'Total Correct',   value: data.correctQs },
    { label: 'Total Incorrect', value: data.incorrectQs },
    { label: 'Total Omitted',   value: data.omittedQs },
  ]
  const changesRows = [
    { label: 'Correct → Incorrect',   value: data.answerChanges.ci },
    { label: 'Incorrect → Correct',   value: data.answerChanges.ic },
    { label: 'Incorrect → Incorrect', value: data.answerChanges.ii },
  ]
  const qbankRows = [
    { label: 'Used Questions',   value: data.questionsAnswered.toLocaleString() },
    { label: 'Unused Questions', value: (data.totalQuestions - data.questionsAnswered).toLocaleString() },
    { label: 'Total Questions',  value: data.totalQuestions.toLocaleString() },
  ]
  const testRows = [
    { label: 'Tests Created',   value: data.testsCreated },
    { label: 'Tests Completed', value: data.testsCompleted },
    { label: 'Suspended Tests', value: data.testsSuspended },
  ]

  return (
    <div className="score-overview dash-card">
      <div className="dash-card__header">
        <div>
          <h2 className="dash-card__title">Performance Overview</h2>
          <p className="dash-card__subtitle">Cumulative across all tests</p>
        </div>
        <Link to="/student/analytics" className="dash-link">
          Full Analytics <ArrowRight size={14} />
        </Link>
      </div>

      {/* Donut rings */}
      <div className="score-overview__rings">
        <div className="score-overview__ring-block">
          <DonutRing value={data.overallScore} label="Correct" color="#27AE60" size={156} />
        </div>
        <div className="score-overview__ring-block">
          <DonutRing value={qbankPct} label="Used" color="#3730A3" size={156} />
        </div>
      </div>

      {/* Stats tables */}
      <div className="score-overview__tables">
        {/* Left: score + changes */}
        <div className="score-table-col">
          <p className="score-table__section-label">Your Score</p>
          {scoreRows.map(r => (
            <div className="score-table__row" key={r.label}>
              <span className="score-table__label">{r.label}</span>
              <span className="score-table__badge">{r.value}</span>
            </div>
          ))}
          <div className="score-table__divider" />
          <p className="score-table__section-label">Answer Changes</p>
          {changesRows.map(r => (
            <div className="score-table__row" key={r.label}>
              <span className="score-table__label">{r.label}</span>
              <span className="score-table__badge">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="score-table__vertical-divider" />

        {/* Right: qbank + tests */}
        <div className="score-table-col">
          <p className="score-table__section-label">QBank Usage</p>
          {qbankRows.map(r => (
            <div className="score-table__row" key={r.label}>
              <span className="score-table__label">{r.label}</span>
              <span className="score-table__badge">{r.value}</span>
            </div>
          ))}
          <div className="score-table__divider" />
          <p className="score-table__section-label">Test Count</p>
          {testRows.map(r => (
            <div className="score-table__row" key={r.label}>
              <span className="score-table__label">{r.label}</span>
              <span className="score-table__badge">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
