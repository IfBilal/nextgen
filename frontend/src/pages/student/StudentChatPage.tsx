import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, ChevronLeft, Shield, Users } from 'lucide-react'
import { getGroupChatMessages, sendGroupChatMessage, getClassById } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { ChatMessage, LmsClass } from '../../types/lms'
import '../../styles/chat.css'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function StudentChatPage() {
  const { classId } = useParams<{ classId: string }>()
  const { user } = useStudentAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!classId) return
    Promise.all([
      getClassById(classId),
      getGroupChatMessages(classId),
    ]).then(([clsData, msgs]) => {
      setCls(clsData)
      setMessages(msgs)
    })
  }, [classId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || !classId || !user?.id) return
    setSending(true)
    const msg = await sendGroupChatMessage(classId, user.id, user.name ?? 'Student', 'student', text.trim())
    setMessages(prev => [...prev, msg])
    setText('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="lms-session-page">
      <div className="lms-session-header">
        <div>
          <Link to={`/student/classes/${classId}/session`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none', marginBottom: 6 }}>
            <ChevronLeft size={14} /> Back to Class
          </Link>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            {cls?.name ?? 'Class'} — Group Chat
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} /> All students and teacher
          </p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#92400e' }}>
          <Shield size={11} /> Supervised by admin
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
        <div className="chat-privacy-bar">
          All messages are visible to everyone in this class and monitored by platform supervisors.
        </div>

        <div className="chat-messages" style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Users size={32} style={{ opacity: 0.25 }} />
              <p>No messages yet — start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.id
              const isTeacher = msg.senderRole === 'teacher'
              const showDate = idx === 0 || !isSameDay(messages[idx - 1].sentAt, msg.sentAt)
              const showName = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId)

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '0.75rem 0', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>
                      {formatDate(msg.sentAt)}
                    </div>
                  )}
                  <div className={`chat-message ${isMe ? 'chat-message--right' : 'chat-message--left'}`}>
                    {!isMe && (
                      <div className={`chat-message__avatar ${isTeacher ? 'chat-message__avatar--teacher' : 'chat-message__avatar--student'}`}>
                        {msg.senderName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="chat-message__body">
                      {showName && !isMe && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isTeacher ? '#4F46E5' : '#374151', marginBottom: 2 }}>
                          {isTeacher ? `${msg.senderName} (Teacher)` : msg.senderName}
                        </div>
                      )}
                      <div className="chat-message__bubble">{msg.text}</div>
                      <div className="chat-message__meta">{formatTime(msg.sentAt)}</div>
                    </div>
                    {isMe && (
                      <div className="chat-message__avatar chat-message__avatar--student">
                        {user?.name?.[0]?.toUpperCase() ?? 'S'}
                      </div>
                    )}
                  </div>
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
            placeholder="Message the group… (Enter to send, Shift+Enter for newline)"
            rows={1}
          />
          <button className="chat-input-bar__send" onClick={handleSend} disabled={!text.trim() || sending}>
            <Send size={15} /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
