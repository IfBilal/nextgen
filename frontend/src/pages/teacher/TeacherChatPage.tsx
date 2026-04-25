import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Shield } from 'lucide-react'
import { getClassById, getAllChatThreads, sendChatMessage, getChatMessagesForClass } from '../../services/lmsApi'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import type { ChatMessage, LmsClass } from '../../types/lms'
import '../../styles/chat.css'
import '../../styles/teacher.css'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Student {
  id: string
  name: string
}

const MOCK_STUDENTS: Student[] = [
  { id: 'student-mock-001', name: 'Student A' },
  { id: 'student-mock-002', name: 'Student B' },
  { id: 'student-mock-003', name: 'Student C' },
]

export default function TeacherChatPage() {
  const { classId } = useParams<{ classId: string }>()
  const { teacher } = useTeacherAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const resolvedClassId = classId ?? cls?.id

  useEffect(() => {
    async function load() {
      let cid = classId
      if (!cid && teacher) {
        const { getTeacherClasses } = await import('../../services/lmsApi')
        const classes = await getTeacherClasses(teacher.id)
        if (classes[0]) {
          setCls(classes[0])
          cid = classes[0].id
        }
      } else if (cid) {
        const clsData = await getClassById(cid)
        setCls(clsData)
      }
      if (cid) {
        const msgs = await getAllChatThreads(cid)
        setAllMessages(msgs)
      }
    }
    load()
  }, [classId, teacher])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedStudentId, allMessages])

  const threadMessages = selectedStudentId
    ? allMessages.filter(m => m.studentId === selectedStudentId)
    : []

  function getUnread(studentId: string) {
    return allMessages.filter(m => m.studentId === studentId && m.senderRole === 'student' && !m.read).length
  }

  function getLastMessage(studentId: string) {
    const msgs = allMessages.filter(m => m.studentId === studentId)
    return msgs[msgs.length - 1]?.text?.slice(0, 36) ?? ''
  }

  async function handleSend() {
    if (!text.trim() || !selectedStudentId || !resolvedClassId) return
    setSending(true)
    const msg = await sendChatMessage(resolvedClassId, selectedStudentId, 'teacher', text.trim())
    setAllMessages(prev => [...prev, msg])
    setText('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === selectedStudentId)

  return (
    <div className="teacher-page">
      <div className="teacher-section" style={{ padding: '18px 20px' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
          Student Chat — {cls?.name ?? 'Loading…'}
        </h1>
        <p style={{ fontSize: '0.83rem', color: '#55789c', margin: '3px 0 0' }}>
          Respond to student questions. All conversations are supervised.
        </p>
      </div>

      <div className="chat-panel" style={{ margin: '0 0 20px' }}>
        {/* Student list */}
        <div className="chat-sidebar">
          <div className="chat-sidebar__header">Students ({MOCK_STUDENTS.length})</div>
          <div className="chat-sidebar__list">
            {MOCK_STUDENTS.map(student => (
              <div
                key={student.id}
                className={`chat-sidebar__item ${selectedStudentId === student.id ? 'chat-sidebar__item--active' : ''}`}
                onClick={() => setSelectedStudentId(student.id)}
              >
                <div className="chat-sidebar__name">
                  {student.name}
                  {getUnread(student.id) > 0 && (
                    <span className="chat-unread-badge">{getUnread(student.id)}</span>
                  )}
                </div>
                <div className="chat-sidebar__preview">{getLastMessage(student.id) || 'No messages yet'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-main">
          {!selectedStudent ? (
            <div className="chat-empty" style={{ flex: 1, justifyContent: 'center' }}>
              <Shield size={32} style={{ opacity: 0.3 }} />
              <p>No conversation selected</p>
              <p>Choose a student from the list to view and respond to their messages.</p>
            </div>
          ) : (
            <>
              <div className="chat-main__header">
                <div>
                  <div className="chat-main__name">{selectedStudent.name}</div>
                  <div className="chat-main__class">{cls?.name}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#0369a1' }}>
                  <Shield size={11} /> Supervised
                </div>
              </div>

              <div className="chat-supervision-bar">
                All conversations are monitored by platform supervisors and admin.
              </div>

              <div className="chat-messages">
                {threadMessages.length === 0 ? (
                  <div className="chat-empty">
                    <p>No messages yet</p>
                    <p>{selectedStudent.name} hasn't sent a message.</p>
                  </div>
                ) : (
                  threadMessages.map(msg => {
                    const isTeacher = msg.senderRole === 'teacher'
                    return (
                      <div key={msg.id} className={`chat-message ${isTeacher ? 'chat-message--right' : 'chat-message--left'}`}>
                        {!isTeacher && <div className="chat-message__avatar chat-message__avatar--student">S</div>}
                        <div className="chat-message__body">
                          <div className="chat-message__bubble">{msg.text}</div>
                          <div className="chat-message__meta">{formatTime(msg.sentAt)}</div>
                        </div>
                        {isTeacher && <div className="chat-message__avatar chat-message__avatar--teacher">T</div>}
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="chat-input-bar">
                <textarea
                  className="chat-input-bar__textarea"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply to student… (Enter to send)"
                  rows={1}
                />
                <button className="chat-input-bar__send" onClick={handleSend} disabled={!text.trim() || sending}>
                  <Send size={15} /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
