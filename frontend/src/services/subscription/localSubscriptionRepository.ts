import { safeParseJson } from '../errorUtils'
import { logWarn } from '../observability'
import type { BillingSettings, UserEntitlement } from '../../types/subscription'
import { DEFAULT_BILLING_SETTINGS } from '../../types/subscription'
import type { SubscriptionRepository } from './subscriptionRepository'

const BILLING_SETTINGS_KEY = 'nextgen.billing.settings'
const USER_ENTITLEMENT_PREFIX = 'nextgen.billing.entitlement.'

function sanitizeBillingSettings(input: BillingSettings | null): BillingSettings {
  if (!input) return DEFAULT_BILLING_SETTINGS

  const normalizedPlans = DEFAULT_BILLING_SETTINGS.plans.map(plan => {
    const incoming = input.plans.find(candidate => candidate.id === plan.id)
    if (!incoming) return plan

    const monthlyPrice = Number(incoming.monthlyPrice)
    const safePrice = Number.isFinite(monthlyPrice) && monthlyPrice > 0 ? monthlyPrice : plan.monthlyPrice

    return {
      ...plan,
      monthlyPrice: safePrice,
      priceLabel: `$${safePrice}/month`,
    }
  })

  const incomingDemoDays = Number(input.demoDurationDays)
  const demoDurationDays = Number.isFinite(incomingDemoDays)
    ? Math.min(30, Math.max(1, Math.round(incomingDemoDays)))
    : DEFAULT_BILLING_SETTINGS.demoDurationDays

  return {
    demoDurationDays,
    plans: normalizedPlans,
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
