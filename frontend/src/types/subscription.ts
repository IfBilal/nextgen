export type PlanId = string

export type FeatureKey =
  | 'dashboard_basic'
  | 'adaptive_limited'
  | 'adaptive_full'
  | 'mock_exam_limited'
  | 'mock_exam_full'
  | 'analytics_basic'
  | 'analytics_advanced'
  | 'peer_matching'
  | 'leaderboard'
  | 'marathon_preview'
  | 'marathon_full'
  | 'priority_support'

export interface PlanDefinition {
  id: PlanId
  name: string
  monthlyPrice: number
  priceLabel: string
  isMostPopular?: boolean
  features: string[]
}

export interface BillingSettings {
  demoDurationDays: number
  plans: PlanDefinition[]
}

export interface UserEntitlement {
  email: string
  currentPlan: PlanId
  demoStartedAt: string | null
  demoEndsAt: string | null
  accessEndsAt: string | null
  mockExamsUsedInDemo: number
  createdAt: string
  updatedAt: string
}

export interface EntitlementSnapshot {
  entitlement: UserEntitlement
  isDemoActive: boolean
  isDemoExpired: boolean
  isCurrentPlanTimeBound: boolean
  isCurrentPlanExpired: boolean
  remainingMs: number
  remainingDays: number
}

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  demoDurationDays: 7,
  plans: [
    {
      id: 'basic',
      name: 'Basic',
      monthlyPrice: 15,
      priceLabel: '$15/month',
      features: ['Adaptive schedule (limited mode)', 'Limited mock exams (starter quota)', 'Structured roadmap preview', 'No analytics access'],
    },
    {
      id: 'standard',
      name: 'Standard',
      monthlyPrice: 30,
      priceLabel: '$30/month',
      isMostPopular: true,
      features: ['Full adaptive system', 'All mocks + assessments', 'Full analytics suite (basic + advanced)'],
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 60,
      priceLabel: '$60/month',
      features: ['All platform features unlocked', 'Everything in Standard', 'Priority support', 'Peer matching + leaderboard boosts'],
    },
  ],
}

export function getPlanDisplayName(planId: PlanId, billingSettings?: BillingSettings): string {
  if (planId === 'demo') {
    return 'Demo Trial'
  }

  const matchedPlan = billingSettings?.plans.find(plan => plan.id === planId)
  if (matchedPlan) {
    return matchedPlan.name
  }

  if (!planId) {
    return 'Unknown Plan'
  }

  return planId.charAt(0).toUpperCase() + planId.slice(1)
}
