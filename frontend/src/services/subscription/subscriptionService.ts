import type {
  BillingSettings,
  EntitlementSnapshot,
  FeatureKey,
  PlanId,
  UserEntitlement,
} from '../../types/subscription'
import type { SubscriptionRepository } from './subscriptionRepository'

const DEMO_MOCK_LIMIT = 1
const PAID_PLAN_DURATION_DAYS = 30

function getPaidDurationMs() {
  return PAID_PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000
}

function getAccessEndsAtForEntitlement(entitlement: UserEntitlement): string | null {
  if (entitlement.currentPlan === 'demo') {
    return entitlement.demoEndsAt
  }

  if (entitlement.currentPlan === 'basic' || entitlement.currentPlan === 'standard' || entitlement.currentPlan === 'premium') {
    if (entitlement.accessEndsAt) {
      return entitlement.accessEndsAt
    }

    const anchor = Date.parse(entitlement.updatedAt || entitlement.createdAt)
    if (!Number.isFinite(anchor)) return null
    return new Date(anchor + getPaidDurationMs()).toISOString()
  }

  return null
}

export class SubscriptionService {
  private repository: SubscriptionRepository

  constructor(repository: SubscriptionRepository) {
    this.repository = repository
  }

  getBillingSettings(): BillingSettings {
    return this.repository.getBillingSettings()
  }

  saveBillingSettings(settings: BillingSettings) {
    this.repository.saveBillingSettings(settings)
  }

  ensureEntitlementForUser(email: string): UserEntitlement {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = this.repository.getUserEntitlement(normalizedEmail)
    if (existing) {
      return existing
    }

    const settings = this.repository.getBillingSettings()
    const now = Date.now()
    const demoEndsAt = new Date(now + settings.demoDurationDays * 24 * 60 * 60 * 1000).toISOString()
    const timestamp = new Date(now).toISOString()

    const created: UserEntitlement = {
      email: normalizedEmail,
      currentPlan: 'demo',
      demoStartedAt: timestamp,
      demoEndsAt,
      accessEndsAt: demoEndsAt,
      mockExamsUsedInDemo: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.repository.saveUserEntitlement(normalizedEmail, created)
    return created
  }

  getEntitlementSnapshot(email: string): EntitlementSnapshot {
    const entitlement = this.ensureEntitlementForUser(email)
    const now = Date.now()

    const isDemoPlan = entitlement.currentPlan === 'demo'
    const accessEndsAt = getAccessEndsAtForEntitlement(entitlement)
    const accessEndsAtMs = accessEndsAt ? Date.parse(accessEndsAt) : 0
    const isCurrentPlanTimeBound = entitlement.currentPlan === 'demo' || entitlement.currentPlan === 'basic' || entitlement.currentPlan === 'standard' || entitlement.currentPlan === 'premium'
    const remainingMs = isCurrentPlanTimeBound ? Math.max(0, accessEndsAtMs - now) : 0
    const isCurrentPlanExpired = isCurrentPlanTimeBound && remainingMs <= 0
    const isDemoExpired = isDemoPlan && remainingMs <= 0
    const isDemoActive = isDemoPlan && remainingMs > 0

    return {
      entitlement: {
        ...entitlement,
        accessEndsAt,
      },
      isDemoActive,
      isDemoExpired,
      isCurrentPlanTimeBound,
      isCurrentPlanExpired,
      remainingMs,
      remainingDays: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    }
  }

  purchasePlan(email: string, plan: PlanId): UserEntitlement {
    const entitlement = this.ensureEntitlementForUser(email)
    const now = Date.now()
    const settings = this.repository.getBillingSettings()
    const timestamp = new Date(now).toISOString()
    const demoEndsAt = new Date(now + settings.demoDurationDays * 24 * 60 * 60 * 1000).toISOString()

    const next: UserEntitlement = {
      ...entitlement,
      currentPlan: plan,
      demoStartedAt: plan === 'demo' ? timestamp : null,
      demoEndsAt: plan === 'demo' ? demoEndsAt : null,
      accessEndsAt: plan === 'demo' ? demoEndsAt : new Date(now + getPaidDurationMs()).toISOString(),
      updatedAt: timestamp,
    }

    this.repository.saveUserEntitlement(email, next)
    return next
  }

  incrementDemoMockUsage(email: string): UserEntitlement {
    const entitlement = this.ensureEntitlementForUser(email)
    if (entitlement.currentPlan !== 'demo' && entitlement.currentPlan !== 'basic') return entitlement

    const next: UserEntitlement = {
      ...entitlement,
      mockExamsUsedInDemo: entitlement.mockExamsUsedInDemo + 1,
      updatedAt: new Date().toISOString(),
    }
    this.repository.saveUserEntitlement(email, next)
    return next
  }

  canStartMockExam(snapshot: EntitlementSnapshot): boolean {
    if (snapshot.isCurrentPlanExpired) return false

    if (snapshot.entitlement.currentPlan === 'demo' || snapshot.entitlement.currentPlan === 'basic') {
      return snapshot.entitlement.mockExamsUsedInDemo < DEMO_MOCK_LIMIT
    }

    return true
  }

  canAccessFeature(snapshot: EntitlementSnapshot, feature: FeatureKey): boolean {
    const plan = snapshot.entitlement.currentPlan

    if (snapshot.isCurrentPlanExpired) {
      return false
    }

    if (feature === 'dashboard_basic') return true

    if (plan === 'premium') {
      return true
    }

    if (plan === 'standard') {
      return (
        feature !== 'priority_support' &&
        feature !== 'peer_matching' &&
        feature !== 'leaderboard'
      )
    }

    if (plan === 'basic') {
      return (
        feature === 'adaptive_limited' ||
        feature === 'mock_exam_limited' ||
        feature === 'marathon_preview'
      )
    }

    if (plan === 'demo') {
      if (snapshot.isDemoExpired) {
        return false
      }

      return (
        feature === 'adaptive_limited' ||
        feature === 'mock_exam_limited' ||
        feature === 'marathon_preview'
      )
    }

    return false
  }

  getLockReason(snapshot: EntitlementSnapshot): string {
    if (snapshot.entitlement.currentPlan === 'demo' && snapshot.isDemoExpired) {
      return 'Your demo trial has ended. Upgrade to continue your personalized prep journey.'
    }

    if (snapshot.isCurrentPlanExpired) {
      return 'Your monthly subscription has ended. Renew your plan to continue using these resources.'
    }

    return 'Upgrade to unlock full performance analytics and your personalized roadmap plan.'
  }
}
