import { useState, useEffect } from 'react'
import { Mail, Smartphone, MessageCircle } from 'lucide-react'
import { getStudentNotificationPrefs, updateStudentNotificationPrefs } from '../../services/lmsApi'
import { useStudentAuth } from '../../context/StudentAuthContext'
import type { NotificationPrefs } from '../../types/lms'

export default function NotificationPreferencesPage() {
  const { user } = useStudentAuth()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getStudentNotificationPrefs(user.id).then(setPrefs)
  }, [user?.id])

  async function handleSave() {
    if (!prefs) return
    setSaving(true)
    await updateStudentNotificationPrefs(prefs)
    setSaving(false)
    setToast('Preferences saved ✓')
    setTimeout(() => setToast(null), 3000)
  }

  async function handlePushToggle(enabled: boolean) {
    if (!prefs) return
    if (enabled && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setToast('Push notifications blocked. Enable them in your browser settings.')
        setTimeout(() => setToast(null), 4000)
        return
      }
    }
    setPrefs({ ...prefs, pushEnabled: enabled })
  }

  if (!prefs) return <div style={{ padding: '2rem', color: '#6B7280' }}>Loading…</div>

  const SUB_OPTIONS: Array<{ key: keyof NotificationPrefs; label: string }> = [
    { key: 'sessionReminder', label: 'Session reminders (1h before)' },
    { key: 'sessionStarted', label: 'Session started' },
    { key: 'sessionRescheduled', label: 'Session rescheduled' },
    { key: 'noticePosted', label: 'New notice posted' },
  ]

  function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!enabled)}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: enabled ? '#3730A3' : '#d1d5db',
          transition: 'background 0.2s',
          position: 'relative', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: enabled ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E1B4B', margin: '0 0 4px' }}>
          Notification Settings
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
          Control how and when you receive LMS notifications.
        </p>
      </div>

      {/* Email */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} style={{ color: '#3730A3' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.9rem' }}>Email Notifications</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{user?.email}</div>
            </div>
          </div>
          <Toggle enabled={prefs.emailEnabled} onChange={v => setPrefs({ ...prefs, emailEnabled: v })} />
        </div>
        {prefs.emailEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 46 }}>
            {SUB_OPTIONS.map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: '0.83rem', color: '#374151' }}>{opt.label}</span>
                <Toggle
                  enabled={prefs[opt.key] as boolean}
                  onChange={v => setPrefs({ ...prefs, [opt.key]: v })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Push */}
      <div style={{ background: '#fff', border: '1px solid #E0E7FF', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={18} style={{ color: '#3730A3' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.9rem' }}>Push Notifications</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Browser notifications on this device</div>
            </div>
          </div>
          <Toggle enabled={prefs.pushEnabled} onChange={handlePushToggle} />
        </div>
        {prefs.pushEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 46 }}>
            {SUB_OPTIONS.map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: '0.83rem', color: '#374151' }}>{opt.label}</span>
                <Toggle
                  enabled={prefs[opt.key] as boolean}
                  onChange={v => setPrefs({ ...prefs, [opt.key]: v })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp info */}
      <div style={{ background: '#F9FAFB', border: '1px solid #EEF2FF', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <MessageCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#1E1B4B', fontSize: '0.85rem' }}>WhatsApp Notifications</div>
          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
            WhatsApp notifications are sent to the phone number on your profile. Contact support to update.
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ alignSelf: 'flex-start', padding: '10px 24px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving…' : 'Save Preferences'}
      </button>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1E1B4B', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: '0.87rem', fontWeight: 600, zIndex: 2000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
