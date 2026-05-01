import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Shield, Users } from 'lucide-react'
import { getGroupChatMessages, sendGroupChatMessage, getClassById } from '../../services/lmsApi'
import { useTeacherAuth } from '../../context/TeacherAuthContext'
import type { ChatMessage, LmsClass } from '../../types/lms'
import '../../styles/chat.css'
import '../../styles/teacher.css'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function TeacherChatPage() {
  const { classId } = useParams<{ classId: string }>()
  const { teacher } = useTeacherAuth()

  const [cls, setCls] = useState<LmsClass | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      let cid = classId
      if (!cid && teacher) {
        const { getTeacherClasses } = await import('../../services/lmsApi')
        const classes = await getTeacherClasses(teacher.id)
        if (classes[0]) { setCls(classes[0]); cid = classes[0].id }
      } else if (cid) {
        const clsData = await getClassById(cid)
        setCls(clsData)
      }
      if (cid) {
        const msgs = await getGroupChatMessages(cid)
        setMessages(msgs)
      }
    }
    load()
  }, [classId, teacher])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const cid = classId ?? cls?.id
    if (!text.trim() || !cid || !teacher?.id) return
    setSending(true)
    const msg = await sendGroupChatMessage(cid, teacher.id, teacher.name ?? 'Teacher', 'teacher', text.trim())
    setMessages(prev => [...prev, msg])
    setText('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="teacher-page">
      <div className="teacher-section" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
            Group Chat — {cls?.name ?? 'Loading…'}
          </h1>
          <p style={{ fontSize: '0.83rem', color: '#6B7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} /> All students and you in one conversation
          </p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, color: '#92400e' }}>
          <Shield size={11} /> Monitored by admin
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, display: 'flex', flexDirection: 'column', minHeight: 520, margin: '0 0 20px' }}>
        <div className="chat-privacy-bar">
          This is a group chat — all enrolled students can see your messages. Admin monitors all conversations.
        </div>

        <div className="chat-messages" style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Users size={32} style={{ opacity: 0.25 }} />
              <p>No messages yet — say hello to your students!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === teacher?.id
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
                          {msg.senderName}{isTeacher ? ' (Teacher)' : ''}
                        </div>
                      )}
                      <div className="chat-message__bubble">{msg.text}</div>
                      <div className="chat-message__meta">{formatTime(msg.sentAt)}</div>
                    </div>
                    {isMe && (
                      <div className="chat-message__avatar chat-message__avatar--teacher">
                        {teacher?.name?.[0]?.toUpperCase() ?? 'T'}
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
            placeholder="Message the class… (Enter to send, Shift+Enter for newline)"
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
