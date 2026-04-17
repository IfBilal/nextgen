import { useMemo, useState } from 'react'
import { Save, Settings, Sparkles } from 'lucide-react'
import { useBillingSettingsForAdmin } from '../../context/SubscriptionContext'
import {
  CONFIGURABLE_FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
} from '../../types/subscription'
import '../../styles/billing.css'

export default function AdminBillingSettingsPage() {
  const { billingSettings, updateBillingSettings } = useBillingSettingsForAdmin()

  const tierIds = useMemo(() => ['demo', ...billingSettings.plans.map(plan => plan.id)], [billingSettings.plans])

  const getInitialPrices = () =>
    Object.fromEntries(
      billingSettings.plans.map(plan => [plan.id, String(plan.monthlyPrice)]),
    )

  const getInitialTierFeatures = () =>
    Object.fromEntries(
      tierIds.map(tierId => [tierId, billingSettings.tierFeatureAccess[tierId] ?? []]),
    ) as Record<string, FeatureKey[]>

  const [demoDays, setDemoDays] = useState(String(billingSettings.demoDurationDays))
  const [planPrices, setPlanPrices] = useState<Record<string, string>>(getInitialPrices)
  const [tierFeatures, setTierFeatures] = useState<Record<string, FeatureKey[]>>(getInitialTierFeatures)
  const [savedMessage, setSavedMessage] = useState('')

  const parsedValues = useMemo(() => {
    const parsedPlanPrices = Object.fromEntries(
      billingSettings.plans.map(plan => {
        const input = planPrices[plan.id] ?? String(plan.monthlyPrice)
        return [plan.id, Math.max(1, Number(input) || plan.monthlyPrice)]
      }),
    )

    const parsedTierFeatures = Object.fromEntries(
      tierIds.map(tierId => {
        const incoming = tierFeatures[tierId] ?? billingSettings.tierFeatureAccess[tierId] ?? []
        const safe = Array.from(
          new Set(incoming.filter((feature): feature is FeatureKey => CONFIGURABLE_FEATURE_KEYS.includes(feature))),
        )
        return [tierId, safe]
      }),
    ) as Record<string, FeatureKey[]>

    return {
      demoDurationDays: Math.min(30, Math.max(1, Number(demoDays) || 7)),
      planPrices: parsedPlanPrices,
      tierFeatures: parsedTierFeatures,
    }
  }, [demoDays, planPrices, tierFeatures, billingSettings.plans, billingSettings.tierFeatureAccess, tierIds])

  const hasInvalidInput = [
    demoDays,
    ...billingSettings.plans.map(plan => planPrices[plan.id] ?? String(plan.monthlyPrice)),
  ].some(value => value.trim().length === 0)

  const hasChanges =
    parsedValues.demoDurationDays !== billingSettings.demoDurationDays ||
    billingSettings.plans.some(
      plan => parsedValues.planPrices[plan.id] !== plan.monthlyPrice,
    ) ||
    tierIds.some(tierId => {
      const current = billingSettings.tierFeatureAccess[tierId] ?? []
      const next = parsedValues.tierFeatures[tierId] ?? []
      if (current.length !== next.length) return true
      const currentSet = new Set(current)
      return next.some(feature => !currentSet.has(feature))
    })

  const canSave = hasChanges && !hasInvalidInput

  const handleSave = () => {
    if (!canSave) return

    updateBillingSettings({
      demoDurationDays: parsedValues.demoDurationDays,
      plans: billingSettings.plans.map(plan => ({
        ...plan,
        monthlyPrice: parsedValues.planPrices[plan.id],
        priceLabel: `$${parsedValues.planPrices[plan.id]}/month`,
      })),
      tierFeatureAccess: parsedValues.tierFeatures,
    })
    setSavedMessage('Billing settings saved successfully.')
  }

  const toggleTierFeature = (tierId: string, feature: FeatureKey) => {
    setTierFeatures(previous => {
      const existing = previous[tierId] ?? billingSettings.tierFeatureAccess[tierId] ?? []
      const hasFeature = existing.includes(feature)
      const updated = hasFeature
        ? existing.filter(item => item !== feature)
        : [...existing, feature]

      return {
        ...previous,
        [tierId]: updated,
      }
    })
  }

  const getTierDisplayName = (tierId: string) => {
    if (tierId === 'demo') return 'Demo Trial'
    return billingSettings.plans.find(plan => plan.id === tierId)?.name ?? tierId
  }

  return (
    <div className="billing-admin-page">
      <header className="admin-shell-page__header">
        <h1>Billing & Trial Controls</h1>
        <p>Configure fixed frontend pricing and demo trial days. Changes apply instantly for all users on this browser.</p>
      </header>

      <section className="billing-admin-toolbar">
        <div className="billing-admin-status">
          <Sparkles size={15} />
          <span>{savedMessage || (hasChanges ? 'You have unsaved changes.' : 'All settings are up to date.')}</span>
        </div>

        <div className="billing-admin-actions">
          <button type="button" className="billing-primary-btn" onClick={handleSave} disabled={!canSave}>
            <Save size={16} /> Save Billing Settings
          </button>
        </div>
      </section>

      <section className="billing-admin-grid">
        <article className="billing-admin-card">
          <h3>
            <Settings size={16} /> Trial Settings
          </h3>
          <div className="billing-admin-field">
            <label htmlFor="demoDays">Demo duration (days)</label>
            <input
              id="demoDays"
              type="number"
              min={1}
              value={demoDays}
              onChange={event => setDemoDays(event.target.value)}
            />
            <small>Default is 7 days</small>
          </div>

          <div className="billing-admin-presets">
            {[3, 7, 14].map(value => (
              <button
                key={value}
                type="button"
                className={`billing-preset-btn ${parsedValues.demoDurationDays === value ? 'active' : ''}`}
                onClick={() => setDemoDays(String(value))}
              >
                {value} days
              </button>
            ))}
          </div>
        </article>

        <article className="billing-admin-card">
          <h3>Monthly plan pricing</h3>
          {billingSettings.plans.map((plan, index) => (
            <div className="billing-admin-field" key={plan.id}>
              <label htmlFor={`plan-price-${plan.id}`}>{plan.name} plan ($/month)</label>
              <input
                id={`plan-price-${plan.id}`}
                type="number"
                min={1}
                value={planPrices[plan.id] ?? String(plan.monthlyPrice)}
                onChange={event =>
                  setPlanPrices(previous => ({
                    ...previous,
                    [plan.id]: event.target.value,
                  }))
                }
              />
              <small>
                {index === 0
                  ? 'Starter tier pricing used for entry-level access.'
                  : index === billingSettings.plans.length - 1
                    ? 'Top tier pricing for full feature access.'
                    : 'Mid-tier pricing for expanded capabilities.'}
              </small>
            </div>
          ))}
        </article>

        <article className="billing-admin-card billing-admin-card--span-2">
          <h3>Tier feature accessibility</h3>
          {tierIds.map(tierId => (
            <div className="billing-feature-access-block" key={tierId}>
              <h4>{getTierDisplayName(tierId)}</h4>
              <div className="billing-feature-toggle-grid">
                {CONFIGURABLE_FEATURE_KEYS.map(feature => {
                  const enabled = (tierFeatures[tierId] ?? billingSettings.tierFeatureAccess[tierId] ?? []).includes(feature)
                  return (
                    <button
                      key={`${tierId}-${feature}`}
                      type="button"
                      className={`billing-feature-toggle ${enabled ? 'enabled' : ''}`}
                      onClick={() => toggleTierFeature(tierId, feature)}
                    >
                      {FEATURE_LABELS[feature]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </article>
      </section>

      {!canSave && hasChanges ? (
        <p className="billing-admin-warning">Please fill all fields with valid positive values to save changes.</p>
      ) : null}
    </div>
  )
}