import { useState, useEffect } from 'react'
import { getAllClassesWithProducts } from '../../services/lmsApi'
import type { ClassWithProduct } from '../../types/lms'
import '../../styles/editor.css'
import { Eye, MessageSquare, Shield } from 'lucide-react'

interface MockMessage {
  id: string
  sender: 'student' | 'teacher'
  name: string
  text: string
  time: string
}

function getMockMessages(className: string): MockMessage[] {
  return [
    {
      id: '1',
      sender: 'student',
      name: 'Student A',
      text: `Hello! I had a question about the material from the last ${className} session. Could you clarify the mechanism of action we discussed?`,
      time: '10:05 AM',
    },
    {
      id: '2',
      sender: 'teacher',
      name: 'Dr. James',
      text: 'Of course! The key point is that the receptor undergoes conformational change upon ligand binding, which triggers the downstream signaling cascade. Does that help clarify things?',
      time: '10:07 AM',
    },
    {
      id: '3',
      sender: 'student',
      name: 'Student B',
      text: 'That makes sense! Quick follow-up — will that be on the exam next week?',
      time: '10:09 AM',
    },
    {
      id: '4',
      sender: 'teacher',
      name: 'Dr. James',
      text: 'Yes, it is a high-yield topic. Make sure to review pages 142–148 in your notes. I\'ll post a summary notice on the board shortly.',
      time: '10:10 AM',
    },
  ]
}

export default function EditorSupervisionPage() {
  const [classes, setClasses] = useState<ClassWithProduct[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllClassesWithProducts().then(cls => {
      setClasses(cls)
      setLoading(false)
    })
  }, [])

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const messages = selectedClass ? getMockMessages(selectedClass.name) : []

  return (
    <div className="editor-page">
      {/* Header */}
      <div className="editor-section" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
              Class Supervision
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
              Monitor conversations across all classes. Read-only view.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', border: '1px solid #bae6fd', borderRadius: 8, padding: '5px 10px' }}>
            <Shield size={13} style={{ color: '#3730A3' }} />
            <span style={{ fontSize: '0.75rem', color: '#3730A3', fontWeight: 600 }}>Supervision Active</span>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="editor-chat-panel">
        {/* Sidebar */}
        <div className="editor-chat-sidebar">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 10px 8px' }}>
            Classes ({classes.length})
          </div>
          {loading ? (
            <div style={{ padding: '1rem', color: '#6B7280', fontSize: '0.83rem' }}>Loading classes…</div>
          ) : classes.length === 0 ? (
            <div style={{ padding: '1rem', color: '#6B7280', fontSize: '0.83rem' }}>No classes found.</div>
          ) : (
            classes.map(cls => (
              <div
                key={cls.id}
                className={`editor-chat-class-item ${selectedClassId === cls.id ? 'editor-chat-class-item--active' : ''}`}
                onClick={() => setSelectedClassId(cls.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{cls.name}</span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>
                    mock
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#6B7280', marginTop: 1 }}>
                  {cls.productName}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main */}
        <div className="editor-chat-main">
          {!selectedClass ? (
            <div className="editor-chat-placeholder">
              <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontWeight: 600, margin: 0 }}>Select a class to view its conversations</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>
                Choose a class from the sidebar to begin supervision.
              </p>
            </div>
          ) : (
            <>
              {/* Class header */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
                      Supervision — {selectedClass.name}
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '3px 0 0' }}>
                      Teacher: {selectedClass.teacherName} · {selectedClass.enrolledStudentIds.length} students
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#EEF2FF', border: '1px solid #bae6fd', borderRadius: 8, padding: '4px 10px' }}>
                    <Eye size={12} style={{ color: '#3730A3' }} />
                    <span style={{ fontSize: '0.72rem', color: '#3730A3', fontWeight: 600 }}>Privacy Protected</span>
                  </div>
                </div>

                <div className="editor-supervision-note" style={{ marginTop: 10 }}>
                  <strong>Supervision Policy:</strong> All conversations are supervised in real-time.
                  Students and teachers are informed of this policy at enrollment.
                </div>
              </div>

              {/* Messages */}
              <div className="editor-chat-messages" style={{ flex: 1, minHeight: 240 }}>
                {messages.map(msg => (
                  <div key={msg.id} className="editor-chat-message">
                    <div
                      className={`editor-chat-message__avatar editor-chat-message__avatar--${msg.sender}`}
                    >
                      {msg.name.charAt(0)}
                    </div>
                    <div className="editor-chat-message__bubble">
                      <div className="editor-chat-message__sender">
                        {msg.name}
                        <span style={{ fontWeight: 400, marginLeft: 6, color: '#9ca3af' }}>
                          {msg.time}
                        </span>
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: '0.68rem',
                            background: msg.sender === 'teacher' ? '#dcfce7' : '#EEF2FF',
                            color: msg.sender === 'teacher' ? '#15803d' : '#3730A3',
                            padding: '1px 5px',
                            borderRadius: 4,
                          }}
                        >
                          {msg.sender}
                        </span>
                      </div>
                      <div className="editor-chat-message__text">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Read-only note */}
              <div className="editor-chat-readonly-note">
                Read-only supervision view. No input available.
              </div>

              {/* Backend placeholder */}
              <div
                style={{
                  marginTop: 10,
                  background: '#f9fafb',
                  border: '1px dashed #d1d5db',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  color: '#9ca3af',
                  textAlign: 'center',
                }}
              >
                Live supervision activates when chat backend is connected.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
