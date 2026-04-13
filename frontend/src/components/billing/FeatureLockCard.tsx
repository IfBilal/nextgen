import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import '../../styles/billing.css'

interface FeatureLockCardProps {
  title?: string
  description: string
}

export default function FeatureLockCard({
  title = 'Feature locked for your current plan',
  description,
}: FeatureLockCardProps) {
  return (
    <section className="billing-lock-card">
      <div className="billing-lock-card__icon">
        <Lock size={18} />
      </div>
      <div className="billing-lock-card__body">
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="billing-lock-card__actions">
          <Link to="/student/upgrade" className="billing-primary-btn">
            <Sparkles size={16} /> Unlock Your Personalized Plan
          </Link>
        </div>
      </div>
    </section>
  )
}
