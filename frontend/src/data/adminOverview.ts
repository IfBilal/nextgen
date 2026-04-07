export interface AdminKpi {
  id: string
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'neutral'
}

export interface DailyActivePoint {
  day: string
  users: number
}

export interface ScoreBucket {
  bucket: string
  count: number
}

export interface ActivityItem {
  id: string
  message: string
  timeAgo: string
  severity: 'normal' | 'alert'
}

export interface RiskStudent {
  id: string
  name: string
  avgScore: number
  streakDays: number
  weakArea: string
}

export const ADMIN_KPIS: AdminKpi[] = [
  { id: 'k1', label: 'Total Students', value: '248', delta: '+12 this week', trend: 'up' },
  { id: 'k2', label: 'Active This Week', value: '189', delta: '76% engagement', trend: 'up' },
  { id: 'k3', label: 'Platform Avg. Score', value: '71%', delta: '+2.4% vs last week', trend: 'up' },
  { id: 'k4', label: 'At-Risk Students', value: '12', delta: '-3 this week', trend: 'down' },
]

export const DAILY_ACTIVE_USERS: DailyActivePoint[] = [
  { day: 'Mon', users: 142 },
  { day: 'Tue', users: 151 },
  { day: 'Wed', users: 164 },
  { day: 'Thu', users: 158 },
  { day: 'Fri', users: 173 },
  { day: 'Sat', users: 166 },
  { day: 'Sun', users: 189 },
]

export const SCORE_DISTRIBUTION: ScoreBucket[] = [
  { bucket: '0-20', count: 6 },
  { bucket: '20-40', count: 18 },
  { bucket: '40-60', count: 54 },
  { bucket: '60-80', count: 112 },
  { bucket: '80-100', count: 58 },
]

export const ADMIN_ACTIVITY_FEED: ActivityItem[] = [
  { id: 'a1', message: 'Ava Patel completed a 40Q timed test — Score 78%', timeAgo: '5m ago', severity: 'normal' },
  { id: 'a2', message: 'Noah Khan joined the platform on Pro Monthly plan', timeAgo: '12m ago', severity: 'normal' },
  { id: 'a3', message: 'Liam Jones has not logged in for 7 days', timeAgo: '2h ago', severity: 'alert' },
  { id: 'a4', message: 'Comment moderation queue reached 14 pending items', timeAgo: '3h ago', severity: 'alert' },
  { id: 'a5', message: 'Daily AI inference latency improved to 0.84s avg', timeAgo: '4h ago', severity: 'normal' },
]

export const AT_RISK_STUDENTS: RiskStudent[] = [
  { id: 'r1', name: 'Sara Ahmed', avgScore: 44, streakDays: 0, weakArea: 'Renal Pathology' },
  { id: 'r2', name: 'Ethan Clark', avgScore: 47, streakDays: 1, weakArea: 'Neuro Pharmacology' },
  { id: 'r3', name: 'Maya Wilson', avgScore: 49, streakDays: 0, weakArea: 'Cardio Physiology' },
  { id: 'r4', name: 'Daniel Kim', avgScore: 42, streakDays: 0, weakArea: 'Biochemistry Metabolism' },
]
