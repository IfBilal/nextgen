import type { BillingSettings, UserEntitlement } from '../../types/subscription'

export interface SubscriptionRepository {
  getBillingSettings(): BillingSettings
  saveBillingSettings(settings: BillingSettings): void
  getUserEntitlement(email: string): UserEntitlement | null
  saveUserEntitlement(email: string, entitlement: UserEntitlement): void
}
