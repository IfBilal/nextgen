import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  label: string
  value: number
  suffix?: string
  subLabel: string
  change?: number
  delay?: number
}

export default function KpiCard({ icon: Icon, iconColor, iconBg, label, value, suffix = '', subLabel, change, delay = 0 }: KpiCardProps) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      let start: number | null = null
      const duration = 900
      const step = (ts: number) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 2)
        setDisplayed(Math.round(ease * value * 10) / 10)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return (
    <div className="kpi-card animate-fadeIn" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-card__icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <div className="kpi-card__body">
        <span className="kpi-card__label">{label}</span>
        <div className="kpi-card__value-row">
          <span className="kpi-card__value">
            {Number.isInteger(value) ? Math.round(displayed) : displayed.toFixed(1)}{suffix}
          </span>
          {change !== undefined && (
            <span className={`kpi-card__change ${change >= 0 ? 'kpi-card__change--up' : 'kpi-card__change--down'}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
            </span>
          )}
        </div>
        <span className="kpi-card__sub">{subLabel}</span>
      </div>
      <div className="kpi-card__accent" style={{ background: iconColor }} />
    </div>
  )
}
