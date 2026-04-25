import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import '../../styles/demo.css'

interface Props {
  locked: boolean
  reason: string
  children: React.ReactNode
}

export default function DemoGate({ locked, reason, children }: Props) {
  if (!locked) return <>{children}</>

  return (
    <div className="demo-gate">
      <div style={{ opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className="demo-gate__overlay">
        <Lock size={28} className="demo-gate__lock-icon" />
        <p className="demo-gate__reason">{reason}</p>
        <Link to="/student/checkout" className="demo-gate__cta">Upgrade to Full Access</Link>
      </div>
    </div>
  )
}
