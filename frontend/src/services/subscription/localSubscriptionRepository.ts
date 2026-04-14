import { safeParseJson } from '../errorUtils'
import { logWarn } from '../observability'
import type { BillingSettings, UserEntitlement } from '../../types/subscription'
import { DEFAULT_BILLING_SETTINGS } from '../../types/subscription'
import type { SubscriptionRepository } from './subscriptionRepository'

const BILLING_SETTINGS_KEY = 'nextgen.billing.settings'
const USER_ENTITLEMENT_PREFIX = 'nextgen.billing.entitlement.'

function sanitizeBillingSettings(input: BillingSettings | null): BillingSettings {
  if (!input) return DEFAULT_BILLING_SETTINGS

  const sourcePlans = Array.isArray(input.plans) && input.plans.length > 0 ? input.plans : DEFAULT_BILLING_SETTINGS.plans

  const normalizedPlans = sourcePlans
    .filter(plan => typeof plan?.id === 'string' && plan.id.trim().length > 0)
    .map((plan, index) => {
      const fallbackPlan = DEFAULT_BILLING_SETTINGS.plans[index] ?? DEFAULT_BILLING_SETTINGS.plans[0]
      const monthlyPrice = Number(plan.monthlyPrice)
      const safePrice = Number.isFinite(monthlyPrice) && monthlyPrice > 0
        ? monthlyPrice
        : (fallbackPlan?.monthlyPrice ?? 1)

      const safeName = typeof plan.name === 'string' && plan.name.trim().length > 0
        ? plan.name
        : (fallbackPlan?.name ?? plan.id)

      const incomingFeatures = Array.isArray(plan.features) && plan.features.length > 0
        ? plan.features
        : (fallbackPlan?.features ?? [])

      return {
        id: plan.id,
        name: safeName,
        monthlyPrice: safePrice,
        priceLabel: `$${safePrice}/month`,
        isMostPopular: Boolean(plan.isMostPopular),
        features: incomingFeatures,
      }
    })

  const incomingDemoDays = Number(input.demoDurationDays)
  const demoDurationDays = Number.isFinite(incomingDemoDays)
    ? Math.min(30, Math.max(1, Math.round(incomingDemoDays)))
    : DEFAULT_BILLING_SETTINGS.demoDurationDays

  return {
    demoDurationDays,
    plans: normalizedPlans.length > 0 ? normalizedPlans : DEFAULT_BILLING_SETTINGS.plans,
  }
}

export class LocalSubscriptionRepository implements SubscriptionRepository {
  getBillingSettings(): BillingSettings {
    const parsed = safeParseJson<BillingSettings>(localStorage.getItem(BILLING_SETTINGS_KEY))
    return sanitizeBillingSettings(parsed)
  }

  saveBillingSettings(settings: BillingSettings): void {
    const sanitized = sanitizeBillingSettings(settings)
    localStorage.setItem(BILLING_SETTINGS_KEY, JSON.stringify(sanitized))
  }

  getUserEntitlement(email: string): UserEntitlement | null {
    const key = `${USER_ENTITLEMENT_PREFIX}${email.toLowerCase()}`
    const parsed = safeParseJson<UserEntitlement>(localStorage.getItem(key))
    if (!parsed) return null

    if (!parsed.email || !parsed.currentPlan) {
      logWarn('Malformed entitlement removed', { email })
      localStorage.removeItem(key)
      return null
    }

    return parsed
  }

  saveUserEntitlement(email: string, entitlement: UserEntitlement): void {
    const key = `${USER_ENTITLEMENT_PREFIX}${email.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(entitlement))
  }
}
