/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useStudentAuth } from './StudentAuthContext'
import { LocalSubscriptionRepository } from '../services/subscription/localSubscriptionRepository'
import { SubscriptionService } from '../services/subscription/subscriptionService'
import type {
  BillingSettings,
  EntitlementSnapshot,
  FeatureKey,
  PlanId,
  UserEntitlement,
} from '../types/subscription'
import { DEFAULT_BILLING_SETTINGS, PLAN_DISPLAY_NAME } from '../types/subscription'

const repository = new LocalSubscriptionRepository()
const subscriptionService = new SubscriptionService(repository)

interface SubscriptionContextType {
  billingSettings: BillingSettings
  snapshot: EntitlementSnapshot | null
  planLabel: string
  purchasePlan: (plan: PlanId) => void
  updateBillingSettings: (settings: BillingSettings) => void
  canAccessFeature: (feature: FeatureKey) => boolean
  canStartMockExam: () => boolean
  recordDemoMockUsage: () => void
  refreshSnapshot: () => void
  lockReason: string
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useStudentAuth()
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(() => subscriptionService.getBillingSettings())
  const [, setRefreshTick] = useState(0)

  const refreshSnapshot = useCallback(() => {
    setRefreshTick(previous => previous + 1)
  }, [])

  const snapshot = user?.email ? subscriptionService.getEntitlementSnapshot(user.email) : null

  useEffect(() => {
    if (!snapshot?.isCurrentPlanTimeBound || snapshot.isCurrentPlanExpired) return

    const intervalId = window.setInterval(() => {
      setRefreshTick(previous => previous + 1)
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [snapshot?.isCurrentPlanTimeBound, snapshot?.isCurrentPlanExpired])

  const purchasePlan = (plan: PlanId) => {
    if (!user?.email) return
    subscriptionService.purchasePlan(user.email, plan)
    refreshSnapshot()
  }

  const recordDemoMockUsage = () => {
    if (!user?.email) return
    subscriptionService.incrementDemoMockUsage(user.email)
    refreshSnapshot()
  }

  const updateBillingSettings = (settings: BillingSettings) => {
    subscriptionService.saveBillingSettings(settings)
    setBillingSettings(subscriptionService.getBillingSettings())
    refreshSnapshot()
  }

  const canAccessFeature = (feature: FeatureKey) => {
    if (!snapshot) return false
    return subscriptionService.canAccessFeature(snapshot, feature)
  }

  const canStartMockExam = () => {
    if (!snapshot) return false
    return subscriptionService.canStartMockExam(snapshot)
  }

  const planLabel = useMemo(() => {
    if (!snapshot) return 'No Plan'
    return PLAN_DISPLAY_NAME[snapshot.entitlement.currentPlan]
  }, [snapshot])

  const lockReason = snapshot ? subscriptionService.getLockReason(snapshot) : 'Upgrade to continue.'

  return (
    <SubscriptionContext.Provider
      value={{
        billingSettings,
        snapshot,
        planLabel,
        purchasePlan,
        updateBillingSettings,
        canAccessFeature,
        canStartMockExam,
        recordDemoMockUsage,
        refreshSnapshot,
        lockReason,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

export function useBillingSettingsForAdmin() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    return {
      billingSettings: DEFAULT_BILLING_SETTINGS,
      updateBillingSettings: () => {},
    }
  }

  return {
    billingSettings: context.billingSettings,
    updateBillingSettings: context.updateBillingSettings,
  }
}

export type { UserEntitlement }
