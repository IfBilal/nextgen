import { useEffect, useMemo, useState } from 'react'
import { Search, TrendingUp, Target, Flame, Clock } from 'lucide-react'
import { useAffiliateAuth } from '../../context/AffiliateAuthContext'
import { getMockStudentInsights } from '../../data/affiliates'
import type { AffiliateStudentInsight } from '../../types/affiliate'
import '../../styles/affiliate.css'
import '../../styles/affiliate-insights.css'

type PlanFilter   = 'all' | 'basic' | 'standard' | 'premium'
type StatusFilter = 'all' | 'active' | 'deactivated'
type SortKey      = 'progress' | 'score' | 'streak' | 'joined'

function formatLastActive(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function progressColor(v: number) {
  return v >= 70 ? '#16a34a' : v >= 45 ? '#d97706' : '#dc2626'
}

function scoreColor(v: number) {
  return v >= 70 ? '#16a34a' : v >= 55 ? '#d97706' : '#dc2626'
}

export default function AffiliateStudentInsightsPage() {
  const { affiliate } = useAffiliateAuth()
  const [students, setStudents]       = useState<AffiliateStudentInsight[]>([])
  const [search, setSearch]           = useState('')
  const [planFilter, setPlanFilter]   = useState<PlanFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey]         = useState<SortKey>('progress')

  useEffect(() => {
    if (!affiliate) return
    setStudents(getMockStudentInsights(affiliate.id))
  }, [affiliate])

  const filtered = useMemo(() => {
    return students
      .filter(s => {
        const q = search.toLowerCase()
        return (
          (s.studentName.toLowerCase().includes(q) || s.studentEmail.toLowerCase().includes(q)) &&
          (planFilter === 'all'   || s.plan === planFilter) &&
          (statusFilter === 'all' || s.status === statusFilter)
        )
      })
      .sort((a, b) => {
        if (sortKey === 'progress') return b.overallProgress - a.overallProgress
        if (sortKey === 'score')    return (b.lastTestScore ?? 0) - (a.lastTestScore ?? 0)
        if (sortKey === 'streak')   return b.studyStreak - a.studyStreak
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      })
  }, [students, search, planFilter, statusFilter, sortKey])

  const active = students.filter(s => s.status === 'active')
  const avgProgress = active.length
    ? Math.round(active.reduce((s, x) => s + x.overallProgress, 0) / active.length) : 0
  const scoredActive = active.filter(s => s.lastTestScore !== null)
  const avgScore = scoredActive.length
    ? Math.round(scoredActive.reduce((s, x) => s + (x.lastTestScore ?? 0), 0) / scoredActive.length) : 0
  const avgStreak = active.length
    ? Math.round(active.reduce((s, x) => s + x.studyStreak, 0) / active.length) : 0

  return (
    <div className="affiliate-page">
      <header className="affiliate-page-header">
        <div>
          <h1>Student Insights</h1>
          <p>Performance metrics for students referred through your code.</p>
        </div>
        <div className="affiliate-referrals-stats">
          <span className="affiliate-stat-chip affiliate-stat-chip--active">{active.length} Active</span>
          <span className="affiliate-stat-chip affiliate-stat-chip--inactive">
            {students.length - active.length} Inactive
          </span>
        </div>
      </header>

      {/* Summary KPIs */}
      <div className="affiliate-kpi-grid affiliate-kpi-grid--3">
        <div className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--blue"><TrendingUp size={18} /></div>
          <div>
            <p className="affiliate-kpi-label">Avg Progress</p>
            <p className="affiliate-kpi-value">{avgProgress}%</p>
            <p className="affiliate-kpi-sub">across active students</p>
          </div>
        </div>
        <div className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--green"><Target size={18} /></div>
          <div>
            <p className="affiliate-kpi-label">Avg Test Score</p>
            <p className="affiliate-kpi-value">{avgScore}%</p>
            <p className="affiliate-kpi-sub">last test average</p>
          </div>
        </div>
        <div className="affiliate-kpi-card">
          <div className="affiliate-kpi-icon affiliate-kpi-icon--teal"><Flame size={18} /></div>
          <div>
            <p className="affiliate-kpi-label">Avg Streak</p>
            <p className="affiliate-kpi-value">{avgStreak}d</p>
            <p className="affiliate-kpi-sub">active students</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="affiliate-card">
        {/* Controls */}
        <div className="si-controls">
          <div className="affiliate-search-wrap si-search">
            <Search size={15} className="affiliate-search-icon" />
            <input
              className="affiliate-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="affiliate-filter-tabs">
            {(['all', 'basic', 'standard', 'premium'] as PlanFilter[]).map(p => (
              <button
                key={p}
                className={`affiliate-filter-tab ${planFilter === p ? 'affiliate-filter-tab--active' : ''}`}
                onClick={() => setPlanFilter(p)}
              >
                {p === 'all' ? 'All Plans' : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="affiliate-filter-tabs">
            {(['all', 'active', 'deactivated'] as StatusFilter[]).map(s => (
              <button
                key={s}
                className={`affiliate-filter-tab ${statusFilter === s ? 'affiliate-filter-tab--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <select
            className="si-sort-select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
          >
            <option value="progress">Sort: Progress</option>
            <option value="score">Sort: Score</option>
            <option value="streak">Sort: Streak</option>
            <option value="joined">Sort: Joined</option>
          </select>
        </div>

        {/* Table header */}
        {filtered.length > 0 && (
          <div className="si-list-head">
            <span className="si-col-student">Student</span>
            <span className="si-col-progress">Progress</span>
            <span className="si-col-stat">Score</span>
            <span className="si-col-stat">Streak</span>
            <span className="si-col-stat">Hours</span>
            <span className="si-col-weak">Weak Areas</span>
            <span className="si-col-meta">Last Active</span>
          </div>
        )}

        {/* Rows */}
        {filtered.length === 0 ? (
          <p className="affiliate-empty">No students match your filters.</p>
        ) : (
          <div className="si-list">
            {filtered.map(s => {
              const pc = progressColor(s.overallProgress)
              return (
                <div key={s.id} className={`si-row ${s.status === 'deactivated' ? 'si-row--inactive' : ''}`}>

                  {/* Student */}
                  <div className="si-col-student">
                    <div className="si-avatar">{s.studentName.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                    <div className="si-identity">
                      <span className="si-name">{s.studentName}</span>
                      <div className="si-meta-row">
                        <span className="si-email">{s.studentEmail}</span>
                        <span className={`si-plan-badge si-plan-badge--${s.plan}`}>{s.plan}</span>
                        <span className={`si-status si-status--${s.status}`}>
                          {s.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="si-col-progress">
                    <div className="si-bar-wrap">
                      <div className="si-bar-track">
                        <div className="si-bar-fill" style={{ width: `${s.overallProgress}%`, background: pc }} />
                      </div>
                      <span className="si-bar-pct" style={{ color: pc }}>{s.overallProgress}%</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="si-col-stat">
                    {s.lastTestScore !== null
                      ? <span className="si-stat-val" style={{ color: scoreColor(s.lastTestScore) }}>{s.lastTestScore}%</span>
                      : <span className="si-stat-none">—</span>
                    }
                  </div>

                  {/* Streak */}
                  <div className="si-col-stat">
                    <span className="si-stat-val" style={{ color: s.studyStreak > 0 ? '#d97706' : '#9CA3AF' }}>
                      {s.studyStreak > 0 ? `${s.studyStreak}d 🔥` : '0d'}
                    </span>
                  </div>

                  {/* Hours */}
                  <div className="si-col-stat">
                    <span className="si-stat-val">{s.totalStudyHours}h</span>
                  </div>

                  {/* Weak areas */}
                  <div className="si-col-weak">
                    {s.weakAreas.slice(0, 2).map(a => (
                      <span key={a} className="si-weak-tag">{a}</span>
                    ))}
                    {s.weakAreas.length > 2 && (
                      <span className="si-weak-more">+{s.weakAreas.length - 2}</span>
                    )}
                  </div>

                  {/* Last active */}
                  <div className="si-col-meta">
                    <span className="si-last-active">
                      <Clock size={11} />
                      {formatLastActive(s.lastActiveAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
