// ─── Dashboard & Student dummy data ───────────────────────────

export interface TestHistoryItem {
  id: string
  subject: string
  score: number
  mode: 'Timed' | 'Mock Exam'
  date: string
  questionsCount: number
  durationMins: number
}

export interface TodaySession {
  id: string
  subject: string
  subtopic: string
  estimatedHours: number
  status: 'completed' | 'in-progress' | 'upcoming'
}

export interface WeakSubject {
  name: string
  accuracyPct: number
}

export interface StudentDashboardData {
  name: string
  overallScore: number
  scoreChangeVsLastWeek: number
  questionsAnswered: number
  totalQuestions: number
  studyStreakDays: number
  personalBestStreak: number
  hoursThisWeek: number
  weeklyGoalHours: number
  // Score overview
  correctQs: number
  incorrectQs: number
  omittedQs: number
  answerChanges: { ci: number; ic: number; ii: number }
  testsCreated: number
  testsCompleted: number
  testsSuspended: number
  // Roadmap
  examDate: string
  roadmapWeek: number
  roadmapTotalWeeks: number
  roadmapSessionsRemaining: number
  roadmapCompletionPercent: number
  // Insight
  aiInsight: string
  aiInsightSubject: string
  aiInsightVideoTitle: string
  aiInsightVideoTimestamp: string
  // Today
  todaySessions: TodaySession[]
  todaySessionsCompleted: number
  // Recent tests
  recentTests: TestHistoryItem[]
  // Weak areas
  weakSubjects: WeakSubject[]
  totalStudyHours: number
}

export const studentDashboardData: StudentDashboardData = {
  name: 'Alex',
  overallScore: 74,
  scoreChangeVsLastWeek: 3,
  questionsAnswered: 312,
  totalQuestions: 3390,
  studyStreakDays: 8,
  personalBestStreak: 12,
  hoursThisWeek: 14.5,
  weeklyGoalHours: 20,
  correctQs: 63,
  incorrectQs: 12,
  omittedQs: 5,
  answerChanges: { ci: 0, ic: 2, ii: 0 },
  testsCreated: 8,
  testsCompleted: 6,
  testsSuspended: 2,
  examDate: '2025-06-20',
  roadmapWeek: 3,
  roadmapTotalWeeks: 12,
  roadmapSessionsRemaining: 89,
  roadmapCompletionPercent: 22,
  aiInsight:
    'Your Renal Pathophysiology scores dropped 14% this week. Root cause: clinical reasoning gap — not a foundational knowledge issue.',
  aiInsightSubject: 'Renal Pathology',
  aiInsightVideoTitle: 'Glomerulonephritis Overview',
  aiInsightVideoTimestamp: '14:22',
  todaySessions: [
    { id: '1', subject: 'Pathology', subtopic: 'Neoplasia', estimatedHours: 1.5, status: 'completed' },
    { id: '2', subject: 'Pharmacology', subtopic: 'ANS Drugs', estimatedHours: 1, status: 'completed' },
    { id: '3', subject: 'Physiology', subtopic: 'Renal Tubular Function', estimatedHours: 1.5, status: 'in-progress' },
    { id: '4', subject: 'Biochemistry', subtopic: 'Metabolic Pathways', estimatedHours: 1, status: 'upcoming' },
  ],
  todaySessionsCompleted: 2,
  recentTests: [
    { id: 't1', subject: 'Pathology', score: 78, mode: 'Timed', date: 'Apr 3', questionsCount: 40, durationMins: 38 },
    { id: 't2', subject: 'Mixed', score: 65, mode: 'Timed', date: 'Apr 1', questionsCount: 80, durationMins: 110 },
    { id: 't3', subject: 'Pharmacology', score: 82, mode: 'Timed', date: 'Mar 30', questionsCount: 30, durationMins: 28 },
  ],
  weakSubjects: [
    { name: 'Renal Pathology', accuracyPct: 44 },
    { name: 'Endocrinology', accuracyPct: 51 },
    { name: 'Cardiology', accuracyPct: 58 },
    { name: 'Microbiology', accuracyPct: 63 },
    { name: 'Biochemistry', accuracyPct: 67 },
  ],
  totalStudyHours: 42,
}

export interface ScorePrediction {
  predictedScore: number
  rangeLow: number
  rangeHigh: number
  confidence: 'low' | 'moderate' | 'high'
  label: string
  message: string
  signals: { label: string; value: string; impact: 'positive' | 'neutral' | 'negative' }[]
}

export function computeScorePrediction(data: StudentDashboardData): ScorePrediction {
  // Base: overall accuracy
  const base = data.overallScore

  // Recent test average bonus/penalty (±5%)
  const recentAvg = data.recentTests.length
    ? data.recentTests.reduce((s, t) => s + t.score, 0) / data.recentTests.length
    : data.overallScore
  const testDelta = ((recentAvg - data.overallScore) / 100) * 5

  // Roadmap progress bonus (0 → +3% at 100%)
  const roadmapBonus = (data.roadmapCompletionPercent / 100) * 3

  // Weak subject penalty (avg weakness below 70% → up to −5%)
  const avgWeak = data.weakSubjects.length
    ? data.weakSubjects.reduce((s, w) => s + w.accuracyPct, 0) / data.weakSubjects.length
    : 70
  const weakPenalty = Math.max(0, (70 - avgWeak) / 70) * 5

  // Streak consistency bonus (0 → +2% at 30+ days)
  const streakBonus = (Math.min(data.studyStreakDays, 30) / 30) * 2

  const raw = base + testDelta + roadmapBonus - weakPenalty + streakBonus
  const predicted = Math.round(Math.max(0, Math.min(100, raw)))
  const rangeLow = Math.max(0, predicted - 5)
  const rangeHigh = Math.min(100, predicted + 5)

  const confidence: ScorePrediction['confidence'] =
    data.recentTests.length >= 3 && data.roadmapCompletionPercent > 20 ? 'high'
    : data.recentTests.length >= 1 ? 'moderate'
    : 'low'

  let label: string
  let message: string
  if (predicted < 50) {
    label = 'Needs focused work'
    message = `Your weak areas are pulling your accuracy down. Prioritise ${data.weakSubjects[0]?.name ?? 'your weakest subjects'} and aim for consistent daily practice.`
  } else if (predicted < 60) {
    label = 'Approaching passing'
    message = `You're close to a solid passing threshold. Improving accuracy in ${data.weakSubjects[0]?.name ?? 'weak subjects'} could push you meaningfully higher.`
  } else if (predicted < 70) {
    label = 'On track'
    message = `Your trajectory is solid. Keep your study streak consistent and continue working through weak areas to push above ${predicted + 5}%.`
  } else if (predicted < 80) {
    label = 'Strong trajectory'
    message = `You're performing well. Targeted review of ${data.weakSubjects[0]?.name ?? 'weak subjects'} could take you into the 80s.`
  } else {
    label = 'High-yield performance'
    message = `Excellent trajectory. Maintain your current pace and focus on minimising weak-area gaps to stay at the top.`
  }

  const signals: ScorePrediction['signals'] = [
    {
      label: 'Overall accuracy',
      value: `${data.overallScore}%`,
      impact: data.overallScore >= 70 ? 'positive' : data.overallScore >= 55 ? 'neutral' : 'negative',
    },
    {
      label: 'Recent tests avg',
      value: `${Math.round(recentAvg)}%`,
      impact: recentAvg >= 70 ? 'positive' : recentAvg >= 55 ? 'neutral' : 'negative',
    },
    {
      label: 'Roadmap progress',
      value: `${data.roadmapCompletionPercent}%`,
      impact: data.roadmapCompletionPercent >= 40 ? 'positive' : data.roadmapCompletionPercent >= 15 ? 'neutral' : 'negative',
    },
    {
      label: 'Weak area avg',
      value: `${Math.round(avgWeak)}%`,
      impact: avgWeak >= 65 ? 'positive' : avgWeak >= 50 ? 'neutral' : 'negative',
    },
  ]

  return { predictedScore: predicted, rangeLow, rangeHigh, confidence, label, message, signals }
}

export function getDaysUntilExam(examDate: string): number {
  const exam = new Date(examDate)
  const today = new Date()
  const diff = exam.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
