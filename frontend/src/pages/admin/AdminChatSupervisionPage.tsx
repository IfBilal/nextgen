import { useState, useEffect } from 'react'
import { Eye, Trash2, Shield, Flag } from 'lucide-react'
import { getAllClassesWithProducts, getAllChatThreads, deleteChatMessage } from '../../services/lmsApi'
import type { ClassWithProduct, ChatMessage } from '../../types/lms'
import '../../styles/chat.css'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const MOCK_STUDENTS = [
  { id: 'student-mock-001', name: 'Student A' },
  { id: 'student-mock-002', name: 'Student B' },
  { id: 'student-mock-003', name: 'Student C' },
]

export default function AdminChatSupervisionPage() {
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getAllClassesWithProducts().then(cls => {
      setClasses(cls)
      if (cls[0]) setSelectedClassId(cls[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedClassId) return
    getAllChatThreads(selectedClassId).then(setMessages)
  }, [selectedClassId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDelete(messageId: string) {
    await deleteChatMessage(messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
    showToast('Message deleted')
  }

  function getUnread(studentId: string) {
    return messages.filter(m => m.studentId === studentId && !m.read).length
  }

  function getLastMessage(studentId: string) {
    const msgs = messages.filter(m => m.studentId === studentId)
    return msgs[msgs.length - 1]?.text?.slice(0, 36) ?? ''
  }

  const selectedStudent = MOCK_STUDENTS.find(s => s.id === selectedStudentId)
  const threadMessages = selectedStudentId ? messages.filter(m => m.studentId === selectedStudentId) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>Chat Supervision</h1>
          <p style={{ fontSize: '0.83rem', color: '#6B7280', margin: '3px 0 0' }}>Monitor all student-teacher conversations. Admin can delete messages.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selectedClassId ?? ''}
            onChange={e => setSelectedClassId(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #C7D2FE', borderRadius: 8, fontSize: '0.83rem', color: '#374151' }}
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#EEF2FF', border: '1px solid #bae6fd', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#3730A3' }}>
            <Shield size={12} /> Admin Supervision
          </div>
        </div>
      </div>

      <div className="chat-panel">
        {/* Student list */}
        <div className="chat-sidebar">
          <div className="chat-sidebar__header">Students</div>
          <div className="chat-sidebar__list">
            {MOCK_STUDENTS.map(student => (
              <div
                key={student.id}
                className={`chat-sidebar__item ${selectedStudentId === student.id ? 'chat-sidebar__item--active' : ''}`}
                onClick={() => setSelectedStudentId(student.id)}
              >
                <div className="chat-sidebar__name">
                  {student.name}
                  {getUnread(student.id) > 0 && <span className="chat-unread-badge">{getUnread(student.id)}</span>}
                </div>
                <div className="chat-sidebar__preview">{getLastMessage(student.id) || 'No messages'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="chat-main">
          {!selectedStudent ? (
            <div className="chat-empty" style={{ flex: 1 }}>
              <Eye size={32} style={{ opacity: 0.3 }} />
              <p>Select a student to view their conversation</p>
            </div>
          ) : (
            <>
              <div className="chat-main__header">
                <div>
                  <div className="chat-main__name">{selectedStudent.name}</div>
                  <div className="chat-main__class">{classes.find(c => c.id === selectedClassId)?.name}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#dc2626' }}>
                  <Eye size={11} /> Admin View
                </div>
              </div>

              <div className="chat-supervision-bar">
                <Shield size={12} />
                Supervision Mode — Admin view. You can delete individual messages.
              </div>

              <div className="chat-messages">
                {threadMessages.length === 0 ? (
                  <div className="chat-empty">
                    <p>No messages in this thread.</p>
                  </div>
                ) : (
                  threadMessages.map(msg => {
                    const isStudent = msg.senderRole === 'student'
                    return (
                      <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '85%', alignSelf: isStudent ? 'flex-start' : 'flex-end' }}>
                        {isStudent && <div className="chat-message__avatar chat-message__avatar--student">S</div>}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isStudent ? 'row' : 'row-reverse' }}>
                            <div style={{
                              padding: '9px 13px',
                              borderRadius: 14,
                              fontSize: '0.87rem',
                              background: isStudent ? '#F3F4F6' : '#3730A3',
                              color: isStudent ? '#1a2d45' : '#fff',
                              maxWidth: 360,
                              wordBreak: 'break-word',
                            }}>
                              {msg.text}
                            </div>
                            <button
                              onClick={() => handleDelete(msg.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, flexShrink: 0 }}
                              title="Delete message"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2, textAlign: isStudent ? 'left' : 'right' }}>
                            {msg.senderRole === 'teacher' ? 'Teacher' : 'Student'} · {formatTime(msg.sentAt)}
                          </div>
                        </div>
                        {!isStudent && <div className="chat-message__avatar chat-message__avatar--teacher">T</div>}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="chat-readonly-note">
                Read-only supervision view. Use "Delete" to remove inappropriate messages.
              </div>

              <div style={{ padding: '10px 20px', borderTop: '1px solid #EEF2FF', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => showToast('Conversation flagged for review ✓')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Flag size={13} /> Flag Conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
