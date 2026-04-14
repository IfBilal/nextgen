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

function isPaidPlan(planId: PlanId, settings: BillingSettings): boolean {
  return settings.plans.some(plan => plan.id === planId)
}

function getFallbackPaidPlan(settings: BillingSettings): PlanId {
  return settings.plans[0]?.id ?? 'demo'
}

function normalizePlanId(planId: PlanId, settings: BillingSettings): PlanId {
  if (planId === 'demo' || isPaidPlan(planId, settings)) {
    return planId
  }

  return getFallbackPaidPlan(settings)
}

function getPlanBand(planId: PlanId, settings: BillingSettings): 'demo' | 'starter' | 'core' | 'top' | 'unknown' {
  if (planId === 'demo') return 'demo'

  const planIndex = settings.plans.findIndex(plan => plan.id === planId)
  if (planIndex < 0) return 'unknown'

  if (settings.plans.length === 1) return 'top'
  if (planIndex === 0) return 'starter'
  if (planIndex === settings.plans.length - 1) return 'top'
  return 'core'
}

function getAccessEndsAtForEntitlement(entitlement: UserEntitlement, settings: BillingSettings): string | null {
  if (entitlement.currentPlan === 'demo') {
    return entitlement.demoEndsAt
  }

  if (isPaidPlan(entitlement.currentPlan, settings)) {
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
    const settings = this.repository.getBillingSettings()
    const normalizedPlan = normalizePlanId(entitlement.currentPlan, settings)
    const normalizedEntitlement = normalizedPlan === entitlement.currentPlan
      ? entitlement
      : { ...entitlement, currentPlan: normalizedPlan, updatedAt: new Date().toISOString() }

    if (normalizedPlan !== entitlement.currentPlan) {
      this.repository.saveUserEntitlement(email, normalizedEntitlement)
    }

    const now = Date.now()

    const isDemoPlan = normalizedEntitlement.currentPlan === 'demo'
    const accessEndsAt = getAccessEndsAtForEntitlement(normalizedEntitlement, settings)
    const accessEndsAtMs = accessEndsAt ? Date.parse(accessEndsAt) : 0
    const isCurrentPlanTimeBound = normalizedEntitlement.currentPlan === 'demo' || isPaidPlan(normalizedEntitlement.currentPlan, settings)
    const remainingMs = isCurrentPlanTimeBound ? Math.max(0, accessEndsAtMs - now) : 0
    const isCurrentPlanExpired = isCurrentPlanTimeBound && remainingMs <= 0
    const isDemoExpired = isDemoPlan && remainingMs <= 0
    const isDemoActive = isDemoPlan && remainingMs > 0

    return {
      entitlement: {
        ...normalizedEntitlement,
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
    const defaultPaidPlan = getFallbackPaidPlan(settings)
    const safePlan = plan === 'demo' || isPaidPlan(plan, settings) ? plan : defaultPaidPlan
    const timestamp = new Date(now).toISOString()
    const demoEndsAt = new Date(now + settings.demoDurationDays * 24 * 60 * 60 * 1000).toISOString()

    const next: UserEntitlement = {
      ...entitlement,
      currentPlan: safePlan,
      demoStartedAt: safePlan === 'demo' ? timestamp : null,
      demoEndsAt: safePlan === 'demo' ? demoEndsAt : null,
      accessEndsAt: safePlan === 'demo' ? demoEndsAt : new Date(now + getPaidDurationMs()).toISOString(),
      updatedAt: timestamp,
    }

    this.repository.saveUserEntitlement(email, next)
    return next
  }

  incrementDemoMockUsage(email: string): UserEntitlement {
    const entitlement = this.ensureEntitlementForUser(email)
    const settings = this.repository.getBillingSettings()
    const band = getPlanBand(entitlement.currentPlan, settings)
    if (band !== 'demo' && band !== 'starter') return entitlement

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

    const settings = this.repository.getBillingSettings()
    const band = getPlanBand(snapshot.entitlement.currentPlan, settings)

    if (band === 'demo' || band === 'starter') {
      return snapshot.entitlement.mockExamsUsedInDemo < DEMO_MOCK_LIMIT
    }

    return true
  }

  canAccessFeature(snapshot: EntitlementSnapshot, feature: FeatureKey): boolean {
    const plan = snapshot.entitlement.currentPlan
    const settings = this.repository.getBillingSettings()
    const band = getPlanBand(plan, settings)

    if (snapshot.isCurrentPlanExpired) {
      return false
    }

    if (feature === 'dashboard_basic') return true

    if (band === 'top') {
      return true
    }

    if (band === 'core') {
      return (
        feature !== 'priority_support' &&
        feature !== 'peer_matching' &&
        feature !== 'leaderboard'
      )
    }

    if (band === 'starter') {
      return (
        feature === 'adaptive_limited' ||
        feature === 'mock_exam_limited' ||
        feature === 'marathon_preview'
      )
    }

    if (band === 'demo') {
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
