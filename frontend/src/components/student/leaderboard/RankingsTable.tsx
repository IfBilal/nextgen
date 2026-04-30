import { Flame } from 'lucide-react'
import type { LeaderboardEntry } from '../../../data/leaderboard'

interface RankingsTableProps {
  entries: LeaderboardEntry[]
}

const changeLabel = (change: number) => {
  if (change > 0) return `▲${change}`
  if (change < 0) return `▼${Math.abs(change)}`
  return '—'
}

export default function RankingsTable({ entries }: RankingsTableProps) {
  const topTen = entries.filter(entry => entry.rank <= 10)
  const currentUser = entries.find(entry => entry.isCurrentUser)

  return (
    <section className="card leaderboard-list">
      <div className="list-header">
        <div className="col-rank">Rank</div>
        <div className="col-user">Student</div>
        <div className="col-streak">Streak</div>
        <div className="col-score">Score</div>
      </div>

      {topTen.map(entry => (
        <div key={entry.rank} className="list-row">
          <div className="col-rank">
            #{entry.rank}
            <span style={{ fontSize: '0.75rem', color: '#4B5563' }}>{changeLabel(entry.rankChange)}</span>
          </div>
          <div className="col-user">
            <div className="avatar" style={{ width: 34, height: 34 }}>{entry.name.charAt(0)}</div>
            <span className="user-name">{entry.name}</span>
          </div>
          <div className="col-streak">
            <span className="streak-badge">
              <Flame size={14} /> {entry.studyStreakDays}d
            </span>
          </div>
          <div className="col-score">{entry.overallScore}%</div>
        </div>
      ))}

      {currentUser && (
        <div className="list-row current-user-row">
          <div className="col-rank">#{currentUser.rank}</div>
          <div className="col-user">
            <div className="avatar" style={{ width: 34, height: 34 }}>Y</div>
            <span className="user-name font-bold">{currentUser.name} (You)</span>
          </div>
          <div className="col-streak">
            <span className="streak-badge">
              <Flame size={14} /> {currentUser.studyStreakDays}d
            </span>
          </div>
          <div className="col-score">{currentUser.overallScore}%</div>
        </div>
      )}
    </section>
  )
}