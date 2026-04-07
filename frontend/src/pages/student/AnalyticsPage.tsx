import { useMemo, useState } from 'react'
import { Activity, Brain, Clock3, Flame, History, Target } from 'lucide-react'
import PerformanceHeatmap from '../../components/student/analytics/PerformanceHeatmap'
import TrendCharts from '../../components/student/analytics/TrendCharts'
import {
  analyticsKpi,
  performanceHeatmap,
  scoreTrend,
  studyHoursByWeek,
  subjectPerformance,
  testHistory,
} from '../../data/analytics'
import '../../styles/analytics.css'

type AnalyticsTab = 'overview' | 'matrix' | 'history'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('overview')

  const avgWeakCell = useMemo(() => {
    const allCells = performanceHeatmap.flatMap(row => row.cells)
    return allCells.reduce((lowest, current) => (current.score < lowest.score ? current : lowest), allCells[0])
  }, [])

  return (
    <div className="analytics-page">
      <div className="page-header analytics-page-header">
        <h1>Analytics & Diagnostics</h1>
        <p>Track trends, identify weak subtopics, and review your test performance history.</p>
      </div>

      <div className="tabs analytics-tabs">
        <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
          <Activity size={16} /> Overview
        </button>
        <button className={`tab-btn ${tab === 'matrix' ? 'active' : ''}`} onClick={() => setTab('matrix')}>
          <Target size={16} /> Strengths & Weaknesses
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <History size={16} /> Test History
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="stats-overview analytics-overview-grid">
            <article className="card stat-card">
              <div className="stat-icon"><Target size={22} color="#1A6FAD" /></div>
              <div>
                <p className="stat-label">Average Score</p>
                <p className="stat-value">{analyticsKpi.avgScore}%</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Brain size={22} color="#1A6FAD" /></div>
              <div>
                <p className="stat-label">Questions Answered</p>
                <p className="stat-value">{analyticsKpi.questionsAnswered}</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Flame size={22} color="#1A6FAD" /></div>
              <div>
                <p className="stat-label">Study Streak</p>
                <p className="stat-value">{analyticsKpi.streakDays}d</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Clock3 size={22} color="#1A6FAD" /></div>
              <div>
                <p className="stat-label">Total Hours</p>
                <p className="stat-value">{analyticsKpi.totalHours}</p>
              </div>
            </article>
          </div>

          <div className="analytics-layout">
            <TrendCharts
              scoreTrend={scoreTrend}
              subjectPerformance={subjectPerformance}
              studyHoursByWeek={studyHoursByWeek}
            />
          </div>
        </>
      )}

      {tab === 'matrix' && (
        <div className="analytics-layout analytics-matrix-layout">
          <div className="card ai-diagnosis-box analytics-matrix-banner">
            <Brain size={20} color="#E74C3C" />
            <div className="ai-diagnosis-text">
              <strong>AI Analysis:</strong> The lowest area is <strong>{avgWeakCell.subtopic}</strong> at{' '}
              <strong>{avgWeakCell.score}%</strong>. Pattern suggests a clinical reasoning gap. Recommended action:
              complete 15 focused mixed stems and review the linked video segment.
            </div>
          </div>

          <div className="card matrix-card">
            <h3>Subject × Subtopic Heatmap</h3>
            <p className="analytics-matrix-note">
              Red = weak (&lt;50), Yellow = moderate (50–74), Green = strong (75+)
            </p>
            <PerformanceHeatmap rows={performanceHeatmap} />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3 className="mb-4 analytics-history-title">Recent Test History</h3>
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject Focus</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {testHistory.map(row => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.subjectFocus}</td>
                    <td>{row.mode}</td>
                    <td>{row.score}%</td>
                    <td>{row.duration}</td>
                    <td>
                      <button className="btn-secondary-sm">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}