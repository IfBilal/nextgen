import { useMemo, useState } from 'react'
import { Send, User, FileText, PlayCircle, BookOpen } from 'lucide-react'
import '../../styles/ai-tutor.css'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

const presetResponses = [
  {
    answer:
      'Great question. In this context, the key confusion is between Type III and Type IV hypersensitivity. Type III is immune-complex mediated, while Type IV is T-cell mediated delayed response.',
    source: 'Immunology Module, Pg 112',
    video: 'T-Cell Immunity Overview · 14:22',
  },
  {
    answer:
      'You are strong on recall, but your misses indicate a clinical reasoning gap. Try solving stem-to-mechanism before looking at options.',
    source: 'Clinical Reasoning Notes, Pg 44',
    video: 'Stem Strategy Walkthrough · 08:10',
  },
  {
    answer:
      'For ACE inhibitors, remember: cough and angioedema come from increased bradykinin, not from reduced angiotensin II directly.',
    source: 'Pharmacology Ch. 4, Pg 87',
    video: 'RAAS Masterclass · 12:31',
  },
]

export default function AiTutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'assistant',
      text: 'Hello. I am your Tutor. You may ask me anything about your current USMLE roadmap topics.',
    },
  ])
  const [query, setQuery] = useState('')
  const [typing, setTyping] = useState(false)
  const [responseIndex, setResponseIndex] = useState(0)

  const latestAssistant = useMemo(
    () => [...messages].reverse().find(message => message.role === 'assistant'),
    [messages],
  )

  const currentCitation = presetResponses[(responseIndex + presetResponses.length - 1) % presetResponses.length]

  const handleSend = () => {
    const trimmed = query.trim()
    if (!trimmed || typing) return

    const userMessage: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text: trimmed }
    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setTyping(true)

    const response = presetResponses[responseIndex % presetResponses.length]

    window.setTimeout(() => {
      const aiMessage: ChatMessage = { id: `${Date.now()}-a`, role: 'assistant', text: response.answer }
      setMessages(prev => [...prev, aiMessage])
      setTyping(false)
      setResponseIndex(prev => prev + 1)
    }, 1500)
  }

  return (
    <div className="ai-tutor-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Tutor</h1>
        <p>Guided tutoring with evidence panel and linked learning resources.</p>
      </div>

      <div className="tutor-layout">
        <section className="card chat-interface">
          <div className="chat-history">
            {messages.map(message => (
              <div
                key={message.id}
                className={`chat-bubble-container ${message.role === 'user' ? 'is-user' : ''}`}
              >
                <div className="bubble-avatar">{message.role === 'user' ? <User size={16} /> : <BookOpen size={16} />}</div>
                <div className="chat-bubble">{message.text}</div>
              </div>
            ))}

            {typing && (
              <div className="chat-bubble-container">
                <div className="bubble-avatar">
                  <BookOpen size={16} />
                </div>
                <div className="chat-bubble typing-indicator">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about any USMLE Step 1 concept..."
            />
            <button className="send-btn" onClick={handleSend}>
              <Send size={18} />
            </button>
          </div>
        </section>

        <aside className="card rag-context-panel">
          {!latestAssistant ? (
            <div className="empty-context">
              <BookOpen size={30} className="mb-4" />
              <h3>No context yet</h3>
              <p>Ask a question to retrieve linked sources and timestamped references.</p>
            </div>
          ) : (
            <div className="context-card card" style={{ boxShadow: 'none', padding: '1rem' }}>
              <div className="context-header">
                <div className="pulsing-dot" />
                <h4>Verified Context</h4>
              </div>

              <div className="retrieved-doc text-doc">
                <div className="doc-icon">
                  <FileText size={20} />
                </div>
                <div className="doc-meta">
                  <strong>Source Snippet</strong>
                  <span>{currentCitation.source}</span>
                </div>
              </div>

              <div className="retrieved-doc video-doc">
                <div className="doc-icon">
                  <PlayCircle size={20} />
                </div>
                <div className="doc-meta">
                  <strong>Deep Link Video</strong>
                  <span>{currentCitation.video}</span>
                </div>
              </div>

              <div className="fake-diagram">Verified Diagram Placeholder · Retrieval Only</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}