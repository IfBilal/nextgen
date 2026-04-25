import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, ChevronLeft, Shield } from 'lucide-react'
import { getChatMessagesForClass, sendChatMessage, getClassById } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { ChatMessage, LmsClass } from '../../types/lms'
import '../../styles/chat.css'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
    if (!classId || !user?.id) return
    Promise.all([
      getClassById(classId),
      getChatMessagesForClass(classId, user.id),
    ]).then(([clsData, msgs]) => {
      setCls(clsData)
      setMessages(msgs)
    })
  }, [classId, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || !classId || !user?.id) return
    setSending(true)
    const msg = await sendChatMessage(classId, user.id, 'student', text.trim())
    setMessages(prev => [...prev, msg])
    setText('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const teacherFirstName = cls ? cls.name.split(' ')[0] : 'Teacher'

  return (
    <div className="lms-session-page">
      <div className="lms-session-header">
        <div>
          <Link to={`/student/classes/${classId}/session`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#6a86a7', textDecoration: 'none', marginBottom: 6 }}>
            <ChevronLeft size={14} /> Back to Class
          </Link>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0d2d5e', margin: 0 }}>
            Chat with {cls ? `Dr. ${cls.name.split(' ').slice(-1)[0]}` : 'Teacher'}
          </h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#92400e' }}>
          <Shield size={11} /> Supervised
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #d8e9f8', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
        {/* Privacy notice */}
        <div className="chat-privacy-bar">
          ⚠ All messages in this chat are visible to platform supervisors.
        </div>

        {/* Thread */}
        <div className="chat-messages" style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <p>No messages yet</p>
              <p>Ask {teacherFirstName} a question below.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isStudent = msg.senderRole === 'student'
              return (
                <div key={msg.id} className={`chat-message ${isStudent ? 'chat-message--right' : 'chat-message--left'}`}>
                  {!isStudent && (
                    <div className="chat-message__avatar chat-message__avatar--teacher">T</div>
                  )}
                  <div className="chat-message__body">
                    <div className="chat-message__bubble">{msg.text}</div>
                    <div className="chat-message__meta">
                      {formatTime(msg.sentAt)}
                      {isStudent && (
                        <span style={{ fontSize: '0.65rem', color: msg.read ? '#1a6fad' : '#9ca3af' }}>
                          {msg.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                  {isStudent && (
                    <div className="chat-message__avatar chat-message__avatar--student">
                      {user?.name?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                  )}
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <textarea
            className="chat-input-bar__textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
          />
          <button
            className="chat-input-bar__send"
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            <Send size={15} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
