export interface AffiliateUser {
  id: string
  name: string
  email: string
  referralCode: string
  commissionPct: number
}

export interface AffiliateProfile {
  id: string
  name: string
  email: string
  referralCode: string
  commissionPct: number
  pendingBalance: number
  totalPaidOut: number
  totalReferrals: number
  activeReferrals: number
  createdAt: string
}

export interface AffiliateReferral {
  id: string
  studentName: string
  studentEmail: string
  plan: 'basic' | 'standard' | 'premium'
  status: 'active' | 'deactivated'
  joinedAt: string
  totalPaid: number
  commissionEarned: number
}

export interface EarningsEntry {
  id: string
  studentName: string
  amountPaid: number
  commissionEarned: number
  plan: string
  createdAt: string
}

export interface AdminAffiliate {
  id: string
  name: string
  email: string
  referralCode: string
  commissionPct: number
  pendingBalance: number
  totalPaidOut: number
  totalReferrals: number
  activeReferrals: number
  createdAt: string
}

export interface AffiliateStudentInsight {
  id: string
  studentName: string
  studentEmail: string
  plan: 'basic' | 'standard' | 'premium'
  status: 'active' | 'deactivated'
  joinedAt: string
  overallProgress: number
  lastTestScore: number | null
  studyStreak: number
  totalStudyHours: number
  questionsAttempted: number
  avgAccuracy: number
  lastActiveAt: string
  weakAreas: string[]
}

export interface CreateAffiliatePayload {
  name: string
  email: string
  password: string
  referralCode: string
  commissionPct: number
}
