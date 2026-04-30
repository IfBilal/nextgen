import { useMemo, useState } from 'react'
import { Activity, Brain, Clock3, Flame, History, Target } from 'lucide-react'
import PerformanceHeatmap from '../../components/student/analytics/PerformanceHeatmap'
import TrendCharts from '../../components/student/analytics/TrendCharts'
import TaxonomyFilterBar from '../../components/taxonomy/TaxonomyFilterBar'
import {
  type AnalyticsKpi,
  type HeatmapRow,
  type StudyHoursPoint,
  type SubjectPerformancePoint,
  type TestHistoryRow,
  type TrendPoint,
} from '../../data/analytics'
import { EXAM_TAXONOMY } from '../../data/examTaxonomy'
import { mockRoadmapContext } from '../../data/createTest'
import { MOCK_STUDENT_ATTEMPTS } from '../../data/mockStudentAttempts'
import '../../styles/analytics.css'

type AnalyticsTab = 'overview' | 'matrix' | 'history'

function toPct(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

function calculateStreakDays(attemptDateKeys: string[]): number {
  if (attemptDateKeys.length === 0) return 0
  const sorted = [...new Set(attemptDateKeys)].sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

  let streak = 0
  for (let index = 0; index < sorted.length; index += 1) {
    const current = new Date(sorted[index])
    const previous = index === 0 ? current : new Date(sorted[index - 1])
    const diffDays = Math.round((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))

    if (index === 0 || diffDays === 1) {
      streak += 1
      continue
    }

    break
  }

  return streak
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('overview')

  const fixedExam = EXAM_TAXONOMY.find(item => item.id === mockRoadmapContext.examId) ?? EXAM_TAXONOMY[0]

  const [subjectId, setSubjectId] = useState<'all' | string>('all')
  const [topicId, setTopicId] = useState<'all' | string>('all')

  const selectedExam = fixedExam

  const filteredAttempts = useMemo(
    () =>
      MOCK_STUDENT_ATTEMPTS.filter(attempt => {
        if (attempt.examId !== selectedExam.id) return false
        if (subjectId !== 'all' && attempt.subjectId !== subjectId) return false
        if (topicId !== 'all' && attempt.topicId !== topicId) return false
        return true
      }),
    [selectedExam.id, subjectId, topicId],
  )

  const analyticsKpi: AnalyticsKpi = useMemo(() => {
    const total = filteredAttempts.length
    const correct = filteredAttempts.filter(item => item.isCorrect).length
    const distinctDateKeys = filteredAttempts.map(item => item.answeredAt.slice(0, 10))

    return {
      avgScore: toPct(correct, total),
      questionsAnswered: total,
      streakDays: calculateStreakDays(distinctDateKeys),
      totalHours: Number((filteredAttempts.reduce((sum, item) => sum + item.durationSec, 0) / 3600).toFixed(1)),
    }
  }, [filteredAttempts])

  const scoreTrend: TrendPoint[] = useMemo(() => {
    const byDate = new Map<string, { total: number; correct: number }>()

    for (const attempt of filteredAttempts) {
      const key = attempt.answeredAt.slice(0, 10)
      const bucket = byDate.get(key) ?? { total: 0, correct: 0 }
      bucket.total += 1
      if (attempt.isCorrect) bucket.correct += 1
      byDate.set(key, bucket)
    }

    return [...byDate.entries()]
      .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
      .slice(-8)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        score: toPct(stats.correct, stats.total),
      }))
  }, [filteredAttempts])

  const subjectPerformance: SubjectPerformancePoint[] = useMemo(() => {
    const rows = selectedExam.subjects.map(subject => {
      const subjectAttempts = filteredAttempts.filter(item => item.subjectId === subject.id)
      const correct = subjectAttempts.filter(item => item.isCorrect).length
      return {
        subject: subject.label,
        score: toPct(correct, subjectAttempts.length),
      }
    })

    return rows.filter(row => Number.isFinite(row.score))
  }, [filteredAttempts, selectedExam.subjects])

  const studyHoursByWeek: StudyHoursPoint[] = useMemo(() => {
    if (filteredAttempts.length === 0) {
      return [
        { week: 'W1', hours: 0 },
        { week: 'W2', hours: 0 },
        { week: 'W3', hours: 0 },
        { week: 'W4', hours: 0 },
      ]
    }

    const sorted = [...filteredAttempts].sort((left, right) => new Date(left.answeredAt).getTime() - new Date(right.answeredAt).getTime())
    const firstTime = new Date(sorted[0].answeredAt).getTime()
    const byWeek = new Map<number, number>()

    for (const attempt of sorted) {
      const diffDays = Math.floor((new Date(attempt.answeredAt).getTime() - firstTime) / (1000 * 60 * 60 * 24))
      const weekIndex = Math.min(3, Math.max(0, Math.floor(diffDays / 7)))
      byWeek.set(weekIndex, (byWeek.get(weekIndex) ?? 0) + attempt.durationSec / 3600)
    }

    return [0, 1, 2, 3].map(index => ({
      week: `W${index + 1}`,
      hours: Number((byWeek.get(index) ?? 0).toFixed(1)),
    }))
  }, [filteredAttempts])

  const performanceHeatmap: HeatmapRow[] = useMemo(() => {
    const subjectList = subjectId === 'all'
      ? selectedExam.subjects
      : selectedExam.subjects.filter(item => item.id === subjectId)

    return subjectList.map(subject => ({
      subject: subject.label,
      cells: subject.topics.map(topic => {
        const topicAttempts = filteredAttempts.filter(item => item.topicId === topic.id)
        const correct = topicAttempts.filter(item => item.isCorrect).length
        return {
          subtopic: topic.label,
          score: toPct(correct, topicAttempts.length),
        }
      }),
    }))
  }, [filteredAttempts, selectedExam.subjects, subjectId])

  const testHistory: TestHistoryRow[] = useMemo(
    () =>
      [...filteredAttempts]
        .sort((left, right) => new Date(right.answeredAt).getTime() - new Date(left.answeredAt).getTime())
        .slice(0, 8)
        .map(attempt => {
          const subjectLabel = selectedExam.subjects.find(subject => subject.id === attempt.subjectId)?.label ?? attempt.subjectId
          const topicLabel = selectedExam.subjects
            .flatMap(subject => subject.topics)
            .find(topic => topic.id === attempt.topicId)?.label ?? attempt.topicId

          return {
            id: attempt.id,
            date: new Date(attempt.answeredAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            subjectFocus: `${subjectLabel}: ${topicLabel}`,
            mode:
              attempt.testType === 'mock'
                ? 'Mock'
                : attempt.testType === 'custom'
                  ? 'Custom'
                  : 'Roadmap',
            score: attempt.isCorrect ? 100 : 0,
            duration: `${Math.max(1, Math.round(attempt.durationSec / 60))}m`,
          }
        }),
    [filteredAttempts, selectedExam.subjects],
  )

  const avgWeakCell = useMemo(() => {
    const allCells = performanceHeatmap.flatMap(row => row.cells)
    if (allCells.length === 0) {
      return { subtopic: selectedExam.subjects[0]?.topics[0]?.label ?? 'No Topic', score: 0 }
    }
    return allCells.reduce((lowest, current) => (current.score < lowest.score ? current : lowest), allCells[0])
  }, [performanceHeatmap, selectedExam.subjects])

  const handleSubjectChange = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId as 'all' | string)
    setTopicId('all')
  }

  const handleTopicChange = (nextTopicId: string) => {
    setTopicId(nextTopicId)
  }

  return (
    <div className="analytics-page">
      <div className="page-header analytics-page-header">
        <h1>Analytics & Diagnostics</h1>
        <p>Track trends, identify weak subtopics, and review your test performance history.</p>
      </div>

      <TaxonomyFilterBar
        taxonomy={EXAM_TAXONOMY}
        examId={selectedExam.id}
        subjectId={subjectId}
        topicId={topicId}
        onSubjectChange={handleSubjectChange}
        onTopicChange={handleTopicChange}
        showExam={false}
        allowAllSubjects
      />

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
              <div className="stat-icon"><Target size={22} color="#3730A3" /></div>
              <div>
                <p className="stat-label">Average Score</p>
                <p className="stat-value">{analyticsKpi.avgScore}%</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Brain size={22} color="#3730A3" /></div>
              <div>
                <p className="stat-label">Questions Answered</p>
                <p className="stat-value">{analyticsKpi.questionsAnswered}</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Flame size={22} color="#3730A3" /></div>
              <div>
                <p className="stat-label">Study Streak</p>
                <p className="stat-value">{analyticsKpi.streakDays}d</p>
              </div>
            </article>

            <article className="card stat-card">
              <div className="stat-icon"><Clock3 size={22} color="#3730A3" /></div>
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
              <strong>Analysis:</strong> The lowest area is <strong>{avgWeakCell.subtopic}</strong> at{' '}
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
                  <th>Test Type</th>
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