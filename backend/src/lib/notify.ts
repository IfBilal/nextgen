import { supabaseServiceClient } from './supabase.js'

type NotificationType =
  | 'session_starting'
  | 'notice_posted'
  | 'demo_expiring'
  | 'chat_reply'
  | 'enrollment_confirmed'
  | 'session_rescheduled'
  | 'access_revoked'

interface NotifyPayload {
  studentId: string
  type: NotificationType
  title: string
  body: string
  classId?: string
  sessionId?: string
}

export async function notifyStudent(payload: NotifyPayload): Promise<void> {
  await supabaseServiceClient.from('lms_notifications').insert({
    student_id: payload.studentId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    class_id: payload.classId ?? null,
    session_id: payload.sessionId ?? null,
  })
  // EMAIL SWAP: Trigger email here using Resend/SendGrid/SES.
  // Check lms_notification_prefs for the student before sending.
}

export async function notifyAllEnrolledStudents(
  classId: string,
  payload: Omit<NotifyPayload, 'studentId'>
): Promise<void> {
  const { data: enrollments } = await supabaseServiceClient
    .from('lms_enrollments')
    .select('student_id')
    .eq('class_id', classId)

  if (!enrollments?.length) return

  const rows = enrollments.map(e => ({
    student_id: e.student_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    class_id: classId,
    session_id: payload.sessionId ?? null,
  }))

  await supabaseServiceClient.from('lms_notifications').insert(rows)
}
