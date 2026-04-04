import { Link } from 'react-router-dom'
import { Brain, PlayCircle, BookOpen } from 'lucide-react'
import type { StudentDashboardData } from '../../../data/dashboard'

interface Props { data: StudentDashboardData }

export default function AiInsightCard({ data }: Props) {
  return (
    <div className="dash-card ai-insight-card">
      <div className="ai-insight-card__header">
        <div className="ai-insight-badge">
          <Brain size={14} />
          AI Insight
        </div>
        <span className="ai-insight-card__subject">{data.aiInsightSubject}</span>
      </div>

      <p className="ai-insight-card__text">{data.aiInsight}</p>

      <div className="ai-insight-card__actions">
        <Link to="/student/qbank" className="ai-chip ai-chip--blue">
          <BookOpen size={13} />
          Practice Questions
        </Link>
        <Link to="/student/content" className="ai-chip ai-chip--purple">
          <PlayCircle size={13} />
          {data.aiInsightVideoTitle} · {data.aiInsightVideoTimestamp}
        </Link>
      </div>
    </div>
  )
}
