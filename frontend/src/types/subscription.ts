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

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  'dashboard_basic',
  'adaptive_limited',
  'adaptive_full',
  'mock_exam_limited',
  'mock_exam_full',
  'analytics_basic',
  'analytics_advanced',
  'peer_matching',
  'leaderboard',
  'marathon_preview',
  'marathon_full',
  'priority_support',
]

export const CONFIGURABLE_FEATURE_KEYS: FeatureKey[] = [
  'adaptive_limited',
  'mock_exam_limited',
  'analytics_basic',
  'peer_matching',
  'leaderboard',
]

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dashboard_basic: 'Dashboard',
  adaptive_limited: 'Roadmap',
  adaptive_full: 'Roadmap (Full)',
  mock_exam_limited: 'Mock Exams',
  mock_exam_full: 'Mock Exams (Full)',
  analytics_basic: 'Analytics',
  analytics_advanced: 'Analytics (Advanced)',
  peer_matching: 'Peer Matching',
  leaderboard: 'Leaderboard',
  marathon_preview: 'Marathon Preview',
  marathon_full: 'Marathon Full',
  priority_support: 'Priority Support',
}

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  dashboard_basic: 'Core dashboard access.',
  adaptive_limited: 'Limited adaptive roadmap access.',
  adaptive_full: 'Full adaptive roadmap access.',
  mock_exam_limited: 'Limited mock test attempts.',
  mock_exam_full: 'Unlimited full mock tests.',
  analytics_basic: 'Basic performance analytics.',
  analytics_advanced: 'Advanced analytics and deep insights.',
  peer_matching: 'Find and match with study partners.',
  leaderboard: 'Access global and cohort leaderboard.',
  marathon_preview: 'Preview marathon mode journey.',
  marathon_full: 'Full marathon mode access.',
  priority_support: 'Priority support and response queue.',
}

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
  tierFeatureAccess: Record<PlanId, FeatureKey[]>
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

const STARTER_FEATURES: FeatureKey[] = ['adaptive_limited', 'mock_exam_limited']
const CORE_FEATURES: FeatureKey[] = ['adaptive_limited', 'mock_exam_limited', 'analytics_basic']
const TOP_FEATURES: FeatureKey[] = [...CONFIGURABLE_FEATURE_KEYS]

function dedupeFeatures(features: FeatureKey[]): FeatureKey[] {
  return Array.from(new Set(features))
}

function getBandDefaultFeatures(index: number, totalPlans: number): FeatureKey[] {
  if (totalPlans <= 1 || index === totalPlans - 1) {
    return TOP_FEATURES
  }

  if (index === 0) {
    return STARTER_FEATURES
  }

  return CORE_FEATURES
}

export function getDefaultTierFeatureAccess(plans: PlanDefinition[]): Record<PlanId, FeatureKey[]> {
  const access: Record<PlanId, FeatureKey[]> = {
    demo: STARTER_FEATURES,
  }

  plans.forEach((plan, index) => {
    access[plan.id] = dedupeFeatures(getBandDefaultFeatures(index, plans.length))
  })

  return access
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
  tierFeatureAccess: {
    demo: [...STARTER_FEATURES],
    basic: [...STARTER_FEATURES],
    standard: [...CORE_FEATURES],
    premium: [...TOP_FEATURES],
  },
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
