import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Video, Lock, ExternalLink, ChevronLeft } from 'lucide-react'
import { getClassById, getRecordingsForClass } from '../../services/lmsApi'
import type { LmsClass, RecordedSession } from '../../types/lms'
import DemoGate from '../../components/lms/DemoGate'
import '../../styles/lms-student.css'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecordedSessionsPage() {
  const { classId } = useParams<{ classId: string }>()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [recordings, setRecordings] = useState<RecordedSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!classId) return
    Promise.all([
      getClassById(classId),
      getRecordingsForClass(classId),
    ]).then(([clsData, recData]) => {
      setCls(clsData)
      setRecordings(recData)
      setLoading(false)
    })
  }, [classId])

  if (loading) return <div style={{ padding: '2rem', color: '#6a86a7' }}>Loading…</div>
  if (!cls) return <div style={{ padding: '2rem', color: '#6a86a7' }}>Class not found.</div>

  return (
    <div className="lms-session-page">
      <div className="lms-session-header">
        <div>
          <Link to={`/student/classes/${classId}/session`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6a86a7', textDecoration: 'none', marginBottom: 6 }}>
            <ChevronLeft size={14} /> Back to Class
          </Link>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
            Recordings — {cls.name}
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recordings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>
            <Video size={36} style={{ opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 4px' }}>No recordings yet</p>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>Recordings will appear here after each session ends.</p>
          </div>
        ) : (
          recordings.map((rec, idx) => {
            const isLocked = rec.accessLevel === 'locked'
            const isDemoOnly = rec.accessLevel === 'demo_only' && idx > 0

            return (
              <DemoGate key={rec.sessionId} locked={isLocked || isDemoOnly} reason="Full access required — enroll to unlock all recordings.">
                <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: rec.recordingUrl ? '#e8f3ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {rec.recordingUrl ? <Video size={18} style={{ color: '#1a6fad' }} /> : <Lock size={16} style={{ color: '#9ca3af' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0d2d5e', fontSize: '0.9rem' }}>
                        {formatDate(rec.scheduledAt)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#55789c', marginTop: 2 }}>
                        {rec.durationMinutes} min session
                      </div>
                    </div>
                  </div>
                  {rec.recordingUrl ? (
                    <a
                      href={rec.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#1a6fad', color: '#fff', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                      Watch Recording
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>Not yet available</span>
                  )}
                </div>
              </DemoGate>
            )
          })
        )}
      </div>
    </div>
  )
}
