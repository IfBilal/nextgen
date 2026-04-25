import { useEffect, useState } from 'react'
import { Video, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { studentGetEnrolledClasses } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'

interface AlertBanner {
  type: 'live' | 'starting'
  className: string
  classId: string
  minutesAway?: number
}

export default function SessionStartingBanner({ studentId }: { studentId: string }) {
  const [banner, setBanner] = useState<AlertBanner | null>(null)

  useEffect(() => {
    studentGetEnrolledClasses(studentId).then(classes => {
      const now = Date.now()
      for (const cls of classes) {
        if (cls.nextSession?.status === 'live') {
          setBanner({ type: 'live', className: cls.name, classId: cls.id })
          return
        }
        if (cls.nextSession?.status === 'scheduled') {
          const diff = new Date(cls.nextSession.scheduledAt).getTime() - now
          const mins = Math.floor(diff / 60000)
          if (mins >= 0 && mins <= 60) {
            setBanner({ type: 'starting', className: cls.name, classId: cls.id, minutesAway: mins })
            return
          }
        }
      }
    })
  }, [studentId])

  if (!banner) return null

  if (banner.type === 'live') {
    return (
      <div style={{
        padding: '10px 20px',
        background: '#dcfce7',
        border: '1px solid #86efac',
        borderRadius: 10,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 600, fontSize: '0.87rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <Zap size={14} />
          <strong>{banner.className}</strong> is live right now!
        </div>
        <Link
          to={`/student/classes/${banner.classId}/session`}
          style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}
        >
          Join Now
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      padding: '10px 20px',
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: 10,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 600, fontSize: '0.87rem' }}>
        <Video size={14} />
        Your session starts in <strong>{banner.minutesAway}min</strong> — {banner.className}
      </div>
      <Link
        to={`/student/classes/${banner.classId}/session`}
        style={{ padding: '6px 14px', background: '#d97706', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}
      >
        View Class
      </Link>
    </div>
  )
}
