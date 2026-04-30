import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ADMIN_METRICS_KPIS,
  METRICS_RANGE_OPTIONS,
} from '../../data/adminMetricsFinancials'
import TaxonomyFilterBar from '../../components/taxonomy/TaxonomyFilterBar'
import { EXAM_TAXONOMY } from '../../data/examTaxonomy'
import { MOCK_STUDENT_ATTEMPTS } from '../../data/mockStudentAttempts'
import {
  buildEngagementTrend,
  buildScoreDistribution,
  buildSimulatedAiInsight,
  buildWeeklyActivity,
  filterAttemptsByTaxonomy,
} from '../../services/simulatedAiEngine'
import { captureException } from '../../services/observability'
import '../../styles/admin-metrics-financials.css'

export default function AdminMetricsPage() {
  const initialExam = EXAM_TAXONOMY[0]
  const initialSubject = initialExam.subjects[0]
  const [range, setRange] = useState<(typeof METRICS_RANGE_OPTIONS)[number]>('30d')
  const [examId, setExamId] = useState(initialExam.id)
  const [subjectId, setSubjectId] = useState(initialSubject.id)
  const [topicId, setTopicId] = useState('all')

  const metricsModel = useMemo(() => {
    try {
      const filteredAttempts = filterAttemptsByTaxonomy(MOCK_STUDENT_ATTEMPTS, {
        examId,
        subjectId,
        topicId,
      })
      const simulatedInsight = buildSimulatedAiInsight(filteredAttempts, EXAM_TAXONOMY, { examId, subjectId, topicId })

      return {
        filteredAttempts,
        simulatedInsight,
        engagementTrend: buildEngagementTrend(filteredAttempts),
        scoreDistribution: buildScoreDistribution(filteredAttempts),
        weeklyActivity: buildWeeklyActivity(filteredAttempts),
        error: null as string | null,
      }
    } catch (error) {
      captureException(error, { feature: 'admin-metrics', action: 'derive-metrics' })
      return {
        filteredAttempts: [],
        simulatedInsight: {
          accuracyPct: 0,
          riskLevel: 'Low' as const,
          weakTopics: [],
          recommendation: 'Metrics temporarily unavailable.',
          testsSubmitted: 0,
          activeLearners: 0,
          studySessions: 0,
        },
        engagementTrend: [
          { day: 'Mon', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Tue', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Wed', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Thu', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Fri', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Sat', dau: 0, wau: 0, avgSessionMins: 0 },
          { day: 'Sun', dau: 0, wau: 0, avgSessionMins: 0 },
        ],
        scoreDistribution: [
          { band: 'Low (0-49)', learners: 0 },
          { band: 'Medium (50-74)', learners: 0 },
          { band: 'High (75-100)', learners: 0 },
        ],
        weeklyActivity: [
          { week: 'Week 1', activeLearners: 0, testsSubmitted: 0, avgAccuracy: '0%' },
          { week: 'Week 2', activeLearners: 0, testsSubmitted: 0, avgAccuracy: '0%' },
          { week: 'Week 3', activeLearners: 0, testsSubmitted: 0, avgAccuracy: '0%' },
          { week: 'Week 4', activeLearners: 0, testsSubmitted: 0, avgAccuracy: '0%' },
        ],
        error: 'Some metrics are temporarily unavailable. Showing fallback values.',
      }
    }
  }, [examId, subjectId, topicId])

  const { filteredAttempts, simulatedInsight, engagementTrend, scoreDistribution, weeklyActivity, error: metricsError } = metricsModel

  const kpis = useMemo(
    () =>
      ADMIN_METRICS_KPIS.map(kpi => {
        if (kpi.id === 'mk1') {
          return {
            ...kpi,
            value: simulatedInsight.activeLearners.toLocaleString(),
            delta: `Based on ${filteredAttempts.length} filtered attempts`,
            trend: simulatedInsight.activeLearners > 0 ? 'up' : 'neutral',
          }
        }

        if (kpi.id === 'mk2') {
          return {
            ...kpi,
            value: simulatedInsight.testsSubmitted.toLocaleString(),
            delta: `Taxonomy-filtered tests`,
            trend: simulatedInsight.testsSubmitted > 0 ? 'up' : 'neutral',
          }
        }

        if (kpi.id === 'mk3') {
          return {
            ...kpi,
            value: simulatedInsight.studySessions.toLocaleString(),
            delta: `Estimated from attempt activity`,
            trend: simulatedInsight.studySessions > 0 ? 'up' : 'neutral',
          }
        }

        if (kpi.id === 'mk4') {
          return {
            ...kpi,
            value: `${simulatedInsight.accuracyPct}%`,
            delta: `Average accuracy in selected scope`,
            trend: simulatedInsight.accuracyPct > 0 ? 'up' : 'neutral',
          }
        }

        return kpi
      }),
    [simulatedInsight, filteredAttempts.length],
  )

  return (
    <div className="admin-metrics-page">
      <header className="admin-metrics-header">
        <h1>Global Metrics</h1>
        <p>Platform performance and learner activity overview.</p>
      </header>

      <section className="admin-metrics-controls card">
        <label htmlFor="admin-metrics-range">Window</label>
        <select id="admin-metrics-range" value={range} onChange={event => setRange(event.target.value as typeof range)}>
          {METRICS_RANGE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option.toUpperCase()}
            </option>
          ))}
        </select>
        <span className="admin-metrics-controls__hint">Demo snapshot for the selected taxonomy scope.</span>
        {metricsError && <span className="admin-metrics-controls__hint">{metricsError}</span>}
      </section>

      <section className="admin-metrics-taxonomy card">
        <h3>Exam Taxonomy Scope</h3>
        <TaxonomyFilterBar
          taxonomy={EXAM_TAXONOMY}
          examId={examId}
          subjectId={subjectId}
          topicId={topicId}
          onExamChange={nextExamId => {
            const nextExam = EXAM_TAXONOMY.find(item => item.id === nextExamId) ?? EXAM_TAXONOMY[0]
            setExamId(nextExam.id)
            setSubjectId(nextExam.subjects[0].id)
            setTopicId('all')
          }}
          onSubjectChange={nextSubjectId => {
            setSubjectId(nextSubjectId)
            setTopicId('all')
          }}
          onTopicChange={setTopicId}
        />
      </section>

      <section className="admin-metrics-kpis">
        {kpis.map(kpi => (
          <article className="admin-metrics-kpi" key={kpi.id}>
            <h4>{kpi.label}</h4>
            <p className="value">{kpi.value}</p>
            <p className={`delta ${kpi.trend}`}>{kpi.delta}</p>
          </article>
        ))}
      </section>

      <section className="admin-metrics-grid">
        <article className="card admin-metrics-panel">
          <h3>Engagement Trend</h3>
          <p>Simple daily and weekly active user counts.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="dau" stroke="#3730A3" strokeWidth={3} dot={{ r: 3 }} name="DAU" />
                  <Line type="monotone" dataKey="wau" stroke="#5fb3eb" strokeWidth={2} dot={false} name="WAU" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel">
          <h3>Score Distribution</h3>
          <p>Learners grouped into low, medium, and high score bands.</p>
          <div className="admin-metrics-chart-wrap">
            <div className="admin-metrics-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
                  <XAxis dataKey="band" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="learners" fill="#3730A3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </article>

        <article className="card admin-metrics-panel admin-metrics-panel--full-row">
          <h3>Weekly Activity Snapshot</h3>
          <p>Simple weekly view of active learners, tests submitted, and average accuracy.</p>
          <div className="admin-metrics-table-wrap">
            <table className="admin-metrics-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Active Learners</th>
                  <th>Tests Submitted</th>
                  <th>Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {weeklyActivity.map(row => (
                  <tr key={row.week}>
                    <td>{row.week}</td>
                    <td>{row.activeLearners}</td>
                    <td>{row.testsSubmitted}</td>
                    <td>{row.avgAccuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
