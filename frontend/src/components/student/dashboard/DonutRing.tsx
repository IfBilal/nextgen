import { useEffect, useState } from 'react'

interface DonutRingProps {
  value: number      // 0-100
  label: string
  color: string      // e.g. '#27AE60'
  size?: number
}

export default function DonutRing({ value, label, color, size = 160 }: DonutRingProps) {
  const [animated, setAnimated] = useState(0)
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timeout = setTimeout(() => {
      let start: number | null = null
      const duration = 1200
      const step = (timestamp: number) => {
        if (!start) start = timestamp
        const progress = Math.min((timestamp - start) / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        setAnimated(ease * value)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, 200)
    return () => clearTimeout(timeout)
  }, [value])

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#EEF2FF" strokeWidth={strokeWidth}
        />
        {/* Arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s' }}
        />
      </svg>
      <div className="donut-center">
        <span className="donut-value">{Math.round(animated)}%</span>
        <span className="donut-label">{label}</span>
      </div>
    </div>
  )
}
