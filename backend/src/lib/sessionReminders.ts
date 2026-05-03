import { supabaseServiceClient } from './supabase.js'

// ─── Reminder windows ────────────────────────────────────────────────────────
// 24h reminder: sessions starting between 23h and 25h from now
// 1h  reminder: sessions starting between 45min and 75min from now
// Running every 10 minutes means each session will be caught at least once per window.

const WINDOWS = {
  h24: { minMs: 23 * 60 * 60 * 1000, maxMs: 25 * 60 * 60 * 1000, flag: 'notified_24h' as const },
  h1:  { minMs: 45 * 60 * 1000,       maxMs: 75 * 60 * 1000,       flag: 'notified_1h'  as const },
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }) + ' UTC'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

async function processWindow(
  windowMin: number,
  windowMax: number,
  flag: 'notified_24h' | 'notified_1h',
) {
  const now = Date.now()
  const from = new Date(now + windowMin).toISOString()
  const to   = new Date(now + windowMax).toISOString()

  const { data: sessions, error } = await supabaseServiceClient
    .from('lms_sessions')
    .select('id, class_id, scheduled_at, lms_classes!inner(name)')
    .eq('status', 'scheduled')
    .eq(flag, false)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)

  if (error) {
    console.error(`[reminders] Failed to fetch sessions for ${flag}:`, error.message)
    return
  }

  if (!sessions?.length) return

  for (const session of sessions) {
    try {
      const sessionTime = new Date(session.scheduled_at)
      const minutesUntil = Math.round((sessionTime.getTime() - Date.now()) / 60000)
      const className = (session.lms_classes as any)?.name ?? 'your class'

      let title: string
      let body: string

      if (flag === 'notified_24h') {
        title = `Session tomorrow — ${className}`
        body  = `Your session is scheduled for tomorrow (${formatDate(sessionTime)}) at ${formatTime(sessionTime)}. Don't miss it.`
      } else {
        title = `Session starting soon — ${className}`
        body  = `Your session starts in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''} at ${formatTime(sessionTime)}. Get ready.`
      }

      // Fetch only students with active access — exclude expired demo enrollments.
      // This runs BEFORE claiming the flag so if it fails we don't permanently lose the notification.
      const nowIso = new Date().toISOString()
      const { data: enrollments, error: enrollError } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('student_id')
        .eq('class_id', session.class_id)
        .or(`demo_expires_at.is.null,demo_expires_at.gt.${nowIso}`)

      if (enrollError) {
        console.error(`[reminders] Failed to fetch enrollments for session ${session.id}:`, enrollError.message)
        continue // don't claim the flag — will retry on next run
      }

      if (!enrollments?.length) {
        // No active students; claim the flag to avoid re-checking an empty class every 10 min.
        await supabaseServiceClient
          .from('lms_sessions')
          .update({ [flag]: true })
          .eq('id', session.id)
          .eq(flag, false)
        continue
      }

      // Atomically claim the notification slot — only update if flag is still false.
      // If another server instance already processed this, update returns 0 rows and we skip.
      const { data: claimed, error: claimError } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ [flag]: true })
        .eq('id', session.id)
        .eq(flag, false)
        .select('id')

      if (claimError) {
        console.error(`[reminders] Failed to claim ${flag} for session ${session.id}:`, claimError.message)
        continue // transient DB error — will retry on next run (flag still false)
      }

      if (!claimed?.length) continue // another instance beat us to it

      const rows = enrollments.map(e => ({
        student_id: e.student_id,
        type:       'session_reminder',
        title,
        body,
        class_id:   session.class_id,
        session_id: session.id,
      }))

      const { error: insertError } = await supabaseServiceClient
        .from('lms_notifications')
        .insert(rows)

      if (insertError) {
        console.error(`[reminders] Failed to insert notifications for session ${session.id}:`, insertError.message)
        // Flag is already true — log prominently so ops can investigate.
        // We do NOT reset the flag to avoid double-sending on the next run.
        continue
      }

      console.log(`[reminders] ${flag} sent for session ${session.id} to ${rows.length} student(s)`)
    } catch (err: any) {
      console.error(`[reminders] Unexpected error processing session ${session.id}:`, err?.message ?? err)
    }
  }
}

async function runReminders() {
  await Promise.all([
    processWindow(WINDOWS.h24.minMs, WINDOWS.h24.maxMs, WINDOWS.h24.flag),
    processWindow(WINDOWS.h1.minMs,  WINDOWS.h1.maxMs,  WINDOWS.h1.flag),
  ])
}

export function startSessionReminders() {
  const INTERVAL_MS = 10 * 60 * 1000 // every 10 minutes

  // Run immediately on startup then on interval
  runReminders().catch(err => console.error('[reminders] Initial run failed:', err))

  const timer = setInterval(() => {
    runReminders().catch(err => console.error('[reminders] Run failed:', err))
  }, INTERVAL_MS)

  // Allow Node.js to exit cleanly even if this timer is running
  if (timer.unref) timer.unref()

  console.log('[reminders] Session reminder scheduler started (10-min interval)')
}
