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
import type { StudyHoursPoint, SubjectPerformancePoint, TrendPoint } from '../../../data/analytics'

interface TrendChartsProps {
  scoreTrend: TrendPoint[]
  subjectPerformance: SubjectPerformancePoint[]
  studyHoursByWeek: StudyHoursPoint[]
}

export default function TrendCharts({ scoreTrend, subjectPerformance, studyHoursByWeek }: TrendChartsProps) {
  return (
    <>
      <div className="card performance-card">
        <h3>Score Trend (30 Days)</h3>
        <div className="analytics-chart-wrap analytics-chart-wrap--md">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
              <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 12 }} />
              <YAxis domain={[40, 100]} tick={{ fill: '#4B5563', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#3730A3" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card performance-card">
        <h3>Performance by Subject</h3>
        <div className="analytics-chart-wrap analytics-chart-wrap--md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectPerformance} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#4B5563', fontSize: 12 }} />
              <YAxis type="category" dataKey="subject" tick={{ fill: '#4B5563', fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="score" fill="#3730A3" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card performance-card analytics-card--full">
        <h3>Study Hours by Week</h3>
        <div className="analytics-chart-wrap analytics-chart-wrap--sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studyHoursByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2FF" />
              <XAxis dataKey="week" tick={{ fill: '#4B5563', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4B5563', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#5BA4CF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}