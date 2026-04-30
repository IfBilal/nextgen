import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import {
  getTeacherClasses,
  getTeacherSessions,
  createSession,
  updateSession,
} from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import '../../styles/teacher.css'
import { Calendar, ChevronLeft, AlertTriangle } from 'lucide-react'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function TeacherSessionFormPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { teacher } = useTeacherAuth()

  const isEditing = Boolean(sessionId)
  const prefillClassId = searchParams.get('classId') ?? ''

  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // Form fields
  const [classId, setClassId] = useState(prefillClassId)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(90)
  const [notes, setNotes] = useState('')
  const [changeNote, setChangeNote] = useState('')

  useEffect(() => {
    if (!teacher) return
    async function load() {
      if (!teacher) return
      const cls = await getTeacherClasses(teacher.id)
      setClasses(cls)

      if (isEditing && sessionId) {
        // find session from any class
        for (const c of cls) {
          const sessions = await getTeacherSessions(c.id)
          const found = sessions.find(s => s.id === sessionId)
          if (found) {
            const d = new Date(found.scheduledAt)
            setClassId(found.classId)
            setDate(d.toISOString().slice(0, 10))
            setStartTime(d.toTimeString().slice(0, 5))
            setDuration(found.durationMinutes)
            break
          }
        }
      } else {
        // default duration from class
        const selectedClass = cls.find(c => c.id === (prefillClassId || cls[0]?.id))
        if (selectedClass) {
          setDuration(selectedClass.defaultDurationMinutes)
        }
      }

      setLoading(false)
    }
    load()
  }, [teacher, isEditing, sessionId, prefillClassId])

  function handleClassChange(newClassId: string) {
    setClassId(newClassId)
    const selectedClass = classes.find(c => c.id === newClassId)
    if (selectedClass && !isEditing) {
      setDuration(selectedClass.defaultDurationMinutes)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit() {
    setError('')

    if (!classId) { setError('Please select a class.'); return }
    if (!date) { setError('Please select a date.'); return }
    if (!startTime) { setError('Please select a start time.'); return }
    if (!duration || duration < 15) { setError('Duration must be at least 15 minutes.'); return }
    if (isEditing && !changeNote.trim()) { setError('Reason for change is required when editing a session.'); return }

    const scheduledAt = new Date(`${date}T${startTime}:00`).toISOString()

    setSubmitting(true)
    try {
      if (isEditing && sessionId) {
        await updateSession(sessionId, {
          classId,
          scheduledAt,
          durationMinutes: duration,
          notes,
          changeNote: changeNote.trim(),
        })
        showToast('Session updated ✓')
      } else {
        await createSession({
          classId,
          scheduledAt,
          durationMinutes: duration,
          notes,
        })
        showToast('Session scheduled ✓')
      }
      setTimeout(() => navigate(`/teacher/classes/${classId}`), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="teacher-page">
        <div className="teacher-section">
          <div className="teacher-empty-state">Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="teacher-page">
      {/* Header */}
      <div className="teacher-section" style={{ padding: '18px 20px' }}>
        <div>
          <button
            className="teacher-btn teacher-btn--ghost"
            style={{ marginBottom: 8 }}
            onClick={() => navigate(classId ? `/teacher/classes/${classId}` : '/teacher/classes')}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            {isEditing ? 'Edit Session' : 'Schedule New Session'}
          </h1>
          <p style={{ fontSize: '0.83rem', color: '#6B7280', margin: '4px 0 0' }}>
            {isEditing
              ? 'Update session details. A reason for change is required.'
              : 'Add a new live session to your class.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="teacher-section">
        {isEditing && (
          <div className="teacher-change-note-section">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0 }} />
              <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>
                Audit Notice
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
              Any change to a session requires a reason. This is logged for audit purposes and
              students will be notified of the change.
            </p>
          </div>
        )}

        {/* Class */}
        <div className="teacher-form-field">
          <label className="teacher-form-label">Class *</label>
          <select
            className="teacher-form-select"
            value={classId}
            onChange={e => handleClassChange(e.target.value)}
            disabled={isEditing}
          >
            <option value="">— Select a class —</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.productName})
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="teacher-form-field">
            <label className="teacher-form-label">Date *</label>
            <input
              type="date"
              className="teacher-form-input"
              min={todayStr()}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="teacher-form-field">
            <label className="teacher-form-label">Start Time *</label>
            <input
              type="time"
              className="teacher-form-input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration */}
        <div className="teacher-form-field">
          <label className="teacher-form-label">Duration (minutes) *</label>
          <input
            type="number"
            className="teacher-form-input"
            min={15}
            max={300}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            style={{ maxWidth: 180 }}
          />
          <span className="teacher-form-hint">Minimum 15 minutes. Default is from class settings.</span>
        </div>

        {/* Notes */}
        <div className="teacher-form-field">
          <label className="teacher-form-label">Notes (optional)</label>
          <textarea
            className="teacher-form-textarea"
            placeholder="Any notes for this session (e.g. topics to cover)…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Change Note — required when editing */}
        {isEditing && (
          <div className="teacher-form-field">
            <label className="teacher-form-label">Reason for Change *</label>
            <textarea
              className="teacher-form-textarea"
              placeholder="Explain why this session is being changed…"
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
            />
            <span className="teacher-form-hint">
              This reason is logged and visible to admins and editors.
            </span>
          </div>
        )}

        {error && (
          <div className="teacher-form-required-note">
            <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="teacher-btn teacher-btn--ghost"
            onClick={() => navigate(classId ? `/teacher/classes/${classId}` : '/teacher/classes')}
          >
            Cancel
          </button>
          <button
            className="teacher-btn teacher-btn--primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Calendar size={14} />
            {submitting ? 'Saving…' : isEditing ? 'Update Session' : 'Schedule Session'}
          </button>
        </div>
      </div>

      {toast && <div className="teacher-toast">{toast}</div>}
    </div>
  )
}
