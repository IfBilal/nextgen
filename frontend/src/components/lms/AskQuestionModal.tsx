import { useState } from 'react'
import { MessageCircle, X, CheckCircle2 } from 'lucide-react'
import { sendChatMessage } from '../../services/lmsApi'

interface Props {
  classId: string
  studentId: string
  teacherFirstName: string
  onClose: () => void
}

export default function AskQuestionModal({ classId, studentId, teacherFirstName, onClose }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)
    await sendChatMessage(classId, studentId, 'student', text.trim())
    setSubmitting(false)
    setSent(true)
    setTimeout(onClose, 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '26px 26px 22px', width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} style={{ color: '#3730A3' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E1B4B' }}>
              Ask {teacherFirstName} a Question
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 2 }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#15803d' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>Question sent ✓</p>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>Your teacher will reply soon.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
              Your question will be visible to your teacher and platform supervisors.
            </p>
            <div style={{ position: 'relative' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, 500))}
                placeholder="Type your question here…"
                maxLength={500}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #C7D2FE', borderRadius: 10, fontSize: '0.87rem', fontFamily: 'inherit', resize: 'vertical', minHeight: 120, boxSizing: 'border-box', color: '#1E1B4B' }}
              />
              <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.7rem', color: '#9ca3af' }}>
                {text.length}/500
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                onClick={onClose}
                style={{ padding: '8px 16px', border: '1px solid #E0E7FF', background: '#fff', borderRadius: 8, color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                style={{ padding: '8px 18px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: (!text.trim() || submitting) ? 0.6 : 1 }}
              >
                {submitting ? 'Sending…' : 'Send Question'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
