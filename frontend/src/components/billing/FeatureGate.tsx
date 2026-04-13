import type { ReactElement } from 'react'
import type { FeatureKey } from '../../types/subscription'
import { useSubscription } from '../../context/SubscriptionContext'
import FeatureLockCard from './FeatureLockCard'

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactElement
  title?: string
}

export default function FeatureGate({ feature, children, title }: FeatureGateProps) {
  const { canAccessFeature, lockReason } = useSubscription()

  if (canAccessFeature(feature)) {
    return children
  }

  return <FeatureLockCard title={title} description={lockReason} />
}
