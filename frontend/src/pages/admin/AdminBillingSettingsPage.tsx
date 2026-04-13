import { useMemo, useState } from 'react'
import { Save, Settings, Sparkles } from 'lucide-react'
import { useBillingSettingsForAdmin } from '../../context/SubscriptionContext'
import '../../styles/billing.css'

export default function AdminBillingSettingsPage() {
  const { billingSettings, updateBillingSettings } = useBillingSettingsForAdmin()

  const getInitialValues = () => ({
    demoDays: String(billingSettings.demoDurationDays),
    basicPrice: String(billingSettings.plans.find(plan => plan.id === 'basic')?.monthlyPrice ?? 15),
    standardPrice: String(billingSettings.plans.find(plan => plan.id === 'standard')?.monthlyPrice ?? 30),
    premiumPrice: String(billingSettings.plans.find(plan => plan.id === 'premium')?.monthlyPrice ?? 60),
  })

  const [demoDays, setDemoDays] = useState(getInitialValues().demoDays)
  const [basicPrice, setBasicPrice] = useState(getInitialValues().basicPrice)
  const [standardPrice, setStandardPrice] = useState(getInitialValues().standardPrice)
  const [premiumPrice, setPremiumPrice] = useState(getInitialValues().premiumPrice)
  const [savedMessage, setSavedMessage] = useState('')

  const parsedValues = useMemo(() => {
    return {
      demoDurationDays: Math.min(30, Math.max(1, Number(demoDays) || 7)),
      basic: Math.max(1, Number(basicPrice) || 15),
      standard: Math.max(1, Number(standardPrice) || 30),
      premium: Math.max(1, Number(premiumPrice) || 60),
    }
  }, [demoDays, basicPrice, standardPrice, premiumPrice])

  const hasInvalidInput = [demoDays, basicPrice, standardPrice, premiumPrice].some(value => value.trim().length === 0)
  const hasChanges =
    parsedValues.demoDurationDays !== billingSettings.demoDurationDays ||
    parsedValues.basic !== (billingSettings.plans.find(plan => plan.id === 'basic')?.monthlyPrice ?? 15) ||
    parsedValues.standard !== (billingSettings.plans.find(plan => plan.id === 'standard')?.monthlyPrice ?? 30) ||
    parsedValues.premium !== (billingSettings.plans.find(plan => plan.id === 'premium')?.monthlyPrice ?? 60)

  const canSave = hasChanges && !hasInvalidInput

  const handleSave = () => {
    if (!canSave) return

    updateBillingSettings({
      demoDurationDays: parsedValues.demoDurationDays,
      plans: billingSettings.plans.map(plan => {
        if (plan.id === 'basic') {
          return { ...plan, monthlyPrice: parsedValues.basic, priceLabel: `$${parsedValues.basic}/month` }
        }
        if (plan.id === 'standard') {
          return { ...plan, monthlyPrice: parsedValues.standard, priceLabel: `$${parsedValues.standard}/month` }
        }
        if (plan.id === 'premium') {
          return { ...plan, monthlyPrice: parsedValues.premium, priceLabel: `$${parsedValues.premium}/month` }
        }
        return plan
      }),
    })
    setSavedMessage('Billing settings saved successfully.')
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
          <div className="billing-admin-field">
            <label htmlFor="basicPrice">Basic plan ($/month)</label>
            <input id="basicPrice" type="number" min={1} value={basicPrice} onChange={event => setBasicPrice(event.target.value)} />
            <small>Entry tier pricing used on upgrade page and billing summaries.</small>
          </div>
          <div className="billing-admin-field">
            <label htmlFor="standardPrice">Standard plan ($/month)</label>
            <input id="standardPrice" type="number" min={1} value={standardPrice} onChange={event => setStandardPrice(event.target.value)} />
            <small>Mark as most popular in UI for stronger conversion positioning.</small>
          </div>
          <div className="billing-admin-field">
            <label htmlFor="premiumPrice">Premium plan ($/month)</label>
            <input id="premiumPrice" type="number" min={1} value={premiumPrice} onChange={event => setPremiumPrice(event.target.value)} />
            <small>Includes all premium perks: peer matching, leaderboard, priority support.</small>
          </div>
        </article>
      </section>

      {!canSave && hasChanges ? (
        <p className="billing-admin-warning">Please fill all fields with valid positive values to save changes.</p>
      ) : null}
    </div>
  )
}
