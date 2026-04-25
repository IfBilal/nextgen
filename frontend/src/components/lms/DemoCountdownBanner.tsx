import { useState, useEffect } from 'react'
import { Clock, X, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../../styles/demo.css'

interface Props {
  demoExpiresAt: string | null | undefined
}

function getTimeLeft(expiry: string): { days: number; hours: number; minutes: number; total: number } {
  const diff = Math.max(0, new Date(expiry).getTime() - Date.now())
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  }
}

export default function DemoCountdownBanner({ demoExpiresAt }: Props) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('demo-banner-dismissed') === '1')
  const [timeLeft, setTimeLeft] = useState(demoExpiresAt ? getTimeLeft(demoExpiresAt) : null)

  useEffect(() => {
    if (!demoExpiresAt) return
    const id = setInterval(() => setTimeLeft(getTimeLeft(demoExpiresAt)), 60000)
    return () => clearInterval(id)
  }, [demoExpiresAt])

  if (!demoExpiresAt || dismissed || !timeLeft || timeLeft.total <= 0) return null

  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000

  function handleDismiss() {
    sessionStorage.setItem('demo-banner-dismissed', '1')
    setDismissed(true)
  }

  const label = isUrgent
    ? `Your demo expires in ${timeLeft.hours}h ${timeLeft.minutes}m! Enroll now.`
    : `Demo Access — ${timeLeft.days}d ${timeLeft.hours}h remaining`

  return (
    <div className={`demo-banner ${isUrgent ? 'demo-banner--red' : 'demo-banner--amber'}`}>
      <div className="demo-banner__left">
        <Clock size={16} />
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link to="/student/checkout" className="demo-banner__cta" style={{ textDecoration: 'none' }}>
          {isUrgent ? 'Enroll Now' : 'Upgrade'} <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </Link>
        <button className="demo-banner__dismiss" onClick={handleDismiss} title="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
