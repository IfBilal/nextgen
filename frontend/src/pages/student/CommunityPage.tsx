import { useState, useEffect, useRef } from 'react'
import { Send, Shield } from 'lucide-react'
import { useStudentAuth } from '../../context/StudentAuthContext'
import {
  getMessages, postMessage,
  getCommunitySettings, formatMessageTime,
  type CommunityMessage,
} from '../../data/community'
import './Community.css'

const AVATAR_PALETTE: [string, string][] = [
  ['#E0E7FF', '#4338CA'],
  ['#dcfce7', '#15803d'],
  ['#fce7f3', '#be185d'],
  ['#fef3c7', '#b45309'],
  ['#ede9fe', '#7c3aed'],
  ['#ffedd5', '#c2410c'],
  ['#cffafe', '#0e7490'],
]

function getAvatarStyle(name: string): { background: string; color: string } {
  const [bg, fg] = AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
  return { background: bg, color: fg }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function CommunityPage() {
  const { user } = useStudentAuth()
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'open' | 'readonly'>('open')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(getMessages())
    setMode(getCommunitySettings().mode)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const canPost = mode === 'open'

  function handleSend() {
    if (!text.trim() || !user) return
    const msg = postMessage({
      authorId: user.id,
      authorName: user.name || user.email,
      authorRole: 'student',
      text: text.trim(),
    })
    setMessages(prev => [...prev, msg])
    setText('')
  }

  return (
    <div className="community-page">
      <div className="community-header">
        <div>
          <h1 className="community-title">Community</h1>
          <p className="community-subtitle">A space for all NextGen students to connect and learn together</p>
        </div>
        {mode === 'readonly' && (
          <div className="community-readonly-badge">
            <Shield size={13} />
            Read-only mode — only admins can post
          </div>
        )}
      </div>

      <div className="community-feed">
        {messages.map(msg => {
          const isOwn = msg.authorId === user?.id
          const isAdmin = msg.authorRole === 'admin'
          const avatarStyle = isAdmin ? { background: 'var(--color-navy)', color: '#fff' } : isOwn ? { background: '#4F46E5', color: '#fff' } : getAvatarStyle(msg.authorName)
          return (
            <div key={msg.id} className={`community-msg ${isOwn ? 'community-msg--own' : ''}`}>
              <div className="community-msg__avatar" style={avatarStyle}>
                {getInitials(msg.authorName)}
              </div>
              <div className="community-msg__body">
                <div className="community-msg__meta">
                  <span className="community-msg__name">
                    {msg.authorName}
                    {isAdmin && <span className="community-msg__admin-tag">Admin</span>}
                  </span>
                  <span className="community-msg__time">{formatMessageTime(msg.createdAt)}</span>
                </div>
                <p className="community-msg__text">{msg.text}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="community-composer">
        {canPost ? (
          <>
            <input
              className="community-composer__input"
              placeholder="Write a message..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              maxLength={1000}
            />
            <button
              type="button"
              className="community-composer__send"
              onClick={handleSend}
              disabled={!text.trim()}
            >
              <Send size={16} />
            </button>
          </>
        ) : (
          <div className="community-composer__disabled">
            <Shield size={14} />
            Posting is currently disabled by the admin
          </div>
        )}
      </div>
    </div>
  )
}
