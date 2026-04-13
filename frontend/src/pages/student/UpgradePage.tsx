import { CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import { useSubscription } from '../../context/SubscriptionContext'
import { PLAN_DISPLAY_NAME, type PlanId } from '../../types/subscription'
import '../../styles/billing.css'

export default function UpgradePage() {
  const { billingSettings, snapshot, purchasePlan } = useSubscription()

  const handlePurchase = (plan: PlanId) => {
    purchasePlan(plan)
  }

  return (
    <div className="billing-upgrade-page">
      <header className="billing-upgrade-header">
        <h1>
          <Sparkles size={20} /> Choose your prep plan
        </h1>
        <p>Demo Trial runs for 7 days. All paid plans provide 30 days of access per purchase cycle.</p>
      </header>

      {snapshot ? (
        <section className="billing-current-banner">
          <span>
            Current plan: <strong>{PLAN_DISPLAY_NAME[snapshot.entitlement.currentPlan]}</strong>
          </span>
          {snapshot.isCurrentPlanTimeBound ? (
            <span className="billing-countdown-chip">
              <Clock3 size={14} />
              {snapshot.isCurrentPlanExpired
                ? `${PLAN_DISPLAY_NAME[snapshot.entitlement.currentPlan]} expired`
                : `${snapshot.remainingDays} day(s) left in ${PLAN_DISPLAY_NAME[snapshot.entitlement.currentPlan]}`}
            </span>
          ) : null}
        </section>
      ) : null}

      <section className="billing-plan-grid">
        {billingSettings.plans.map(plan => (
          <article key={plan.id} className={`billing-plan-card ${plan.isMostPopular ? 'popular' : ''}`}>
            {plan.isMostPopular ? <span className="billing-popular-badge">Most Popular</span> : null}
            <div>
              <h3>{plan.name}</h3>
              <div className="billing-plan-price">${plan.monthlyPrice}/month</div>
            </div>

            <ul className="billing-feature-list">
              {plan.features.map(feature => (
                <li key={feature}>
                  <CheckCircle2 size={16} /> {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="billing-primary-btn"
              onClick={() => handlePurchase(plan.id)}
              disabled={snapshot?.entitlement.currentPlan === plan.id}
            >
              {snapshot?.entitlement.currentPlan === plan.id ? `Current plan: ${plan.name}` : `Purchase ${plan.name}`}
            </button>
          </article>
        ))}
      </section>

      <section className="card">
        <h3>Why upgrade now?</h3>
        <p>Based on your performance, you need focused prep. Unlock full analytics and your personalized long-form plan.</p>
      </section>
    </div>
  )
}
