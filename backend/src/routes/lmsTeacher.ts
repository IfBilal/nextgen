import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { createZoomMeeting } from '../lib/zoom.js'
import { notifyAllEnrolledStudents } from '../lib/notify.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? ''),
  handler: (_req, res) => res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many messages. Please wait before sending again.' }),
  standardHeaders: true,
  legacyHeaders: false,
})

export const lmsTeacherRouter = Router()

// ─── GET /api/v1/teacher/classes ─────────────────────────────────────────────
lmsTeacherRouter.get('/teacher/classes', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: classes, error } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, name, description, default_duration_minutes, created_at, lms_products!inner(id, name)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const classIds = (classes ?? []).map(c => c.id)
      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').in('class_id', classIds)

      const enrollCountByClass: Record<string, number> = {}
      ;(enrollments ?? []).forEach(e => {
        enrollCountByClass[e.class_id] = (enrollCountByClass[e.class_id] ?? 0) + 1
      })

      const { data: sessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, zoom_meeting_id, zoom_join_url, zoom_start_url, recording_url, missed_reason, started_at, created_at')
        .in('class_id', classIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })

      type SessionRow = NonNullable<typeof sessions>[number]
      const nextSessionByClass: Record<string, SessionRow> = {}
      ;(sessions ?? []).forEach(s => {
        if (!nextSessionByClass[s.class_id]) nextSessionByClass[s.class_id] = s
      })

      const mapNextSession = (s: SessionRow | null) => s ? {
        id: s.id, classId: s.class_id, scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes, status: s.status,
        meetingLink: s.zoom_join_url ?? s.zoom_meeting_id, startUrl: s.zoom_start_url ?? null, recordingUrl: s.recording_url,
        missedReason: s.missed_reason, startedAt: s.started_at ?? null, createdAt: s.created_at,
      } : null

      const result = (classes ?? []).map(c => ({
        id: c.id, name: c.name, description: c.description,
        productId: (c.lms_products as any).id, productName: (c.lms_products as any).name,
        teacherId, defaultDurationMinutes: c.default_duration_minutes,
        enrolledStudentCount: enrollCountByClass[c.id] ?? 0,
        nextSession: mapNextSession(nextSessionByClass[c.id] ?? null),
        createdAt: c.created_at,
      }))

      return res.status(200).json({ classes: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId ────────────────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { data: cls, error } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, name, description, default_duration_minutes, created_at, lms_products!inner(id, name)')
        .eq('id', req.params.classId)
        .eq('teacher_id', teacherId)
        .single()

      if (error || !cls) throw new HttpError(404, 'CLASS_NOT_FOUND', 'Class not found.')

      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id').eq('class_id', cls.id)

      return res.status(200).json({
        class: {
          id: cls.id, name: cls.name, description: cls.description,
          productId: (cls.lms_products as any).id, productName: (cls.lms_products as any).name,
          teacherId, defaultDurationMinutes: cls.default_duration_minutes,
          enrolledStudentCount: (enrollments ?? []).length,
          createdAt: cls.created_at,
        }
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/sessions/:sessionId/start-url ───────────────────────
lmsTeacherRouter.get('/teacher/sessions/:sessionId/start-url', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { sessionId } = req.params

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, zoom_meeting_id')
        .eq('id', sessionId)
        .single()
      if (!session?.zoom_meeting_id) throw new HttpError(404, 'NOT_FOUND', 'No Zoom meeting for this session.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { getZoomStartUrl } = await import('../lib/zoom.js')
      const startUrl = await getZoomStartUrl(session.zoom_meeting_id)
      return res.status(200).json({ startUrl })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId/sessions ───────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId/sessions', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', req.params.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, zoom_meeting_id, zoom_join_url, zoom_start_url, recording_url, attendance_count, actual_duration_minutes, change_note, missed_reason, started_at, created_at')
        .eq('class_id', req.params.classId)
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const sessions = (data ?? []).map(s => ({
        id: s.id, classId: s.class_id, scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes, status: s.status,
        meetingLink: s.zoom_join_url ?? s.zoom_meeting_id, startUrl: s.zoom_start_url ?? null, recordingUrl: s.recording_url,
        attendanceCount: s.attendance_count, actualDurationMinutes: s.actual_duration_minutes,
        changeNote: s.change_note, missedReason: s.missed_reason, startedAt: s.started_at ?? null, createdAt: s.created_at,
      }))

      return res.status(200).json({ sessions })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/sessions ───────────────────────────────────────────
const createSessionSchema = z.object({
  classId:         z.string().uuid(),
  scheduledAt:     z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(300),
  notes:           z.string().optional(),
})

lmsTeacherRouter.post('/teacher/sessions', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSessionSchema.parse(req.body)
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id, name').eq('id', parsed.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .insert({
          class_id: parsed.classId, scheduled_at: parsed.scheduledAt,
          duration_minutes: parsed.durationMinutes, status: 'scheduled',
        })
        .select().single()

      if (error || !data) throw new HttpError(500, 'CREATE_FAILED', error?.message ?? 'No data returned')

      return res.status(201).json({
        session: {
          id: data.id, classId: data.class_id, scheduledAt: data.scheduled_at,
          durationMinutes: data.duration_minutes, status: data.status,
          meetingLink: data.zoom_join_url ?? data.zoom_meeting_id, startUrl: data.zoom_start_url ?? null, attendanceCount: null,
          actualDurationMinutes: null, changeNote: null, missedReason: null,
          startedAt: null, recordingUrl: null, createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id ──────────────────────────────────────
const updateSessionSchema = z.object({
  scheduledAt:     z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(300).optional(),
  notes:           z.string().optional(),
  changeNote:      z.string().min(1),
})

lmsTeacherRouter.patch('/teacher/sessions/:id', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSessionSchema.parse(req.body)
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status === 'completed' || session.status === 'cancelled') {
        throw new HttpError(400, 'UNEDITABLE', 'Cannot edit a completed or cancelled session.')
      }

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const updates: Record<string, unknown> = { change_note: parsed.changeNote, updated_at: new Date().toISOString() }
      if (parsed.scheduledAt) {
        updates.scheduled_at = parsed.scheduledAt
        // Reset reminder flags so students get notified again for the new time
        updates.notified_24h = false
        updates.notified_1h  = false
      }
      if (parsed.durationMinutes) updates.duration_minutes = parsed.durationMinutes

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions').update(updates).eq('id', req.params.id).select().single()

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/sessions/:id/start ─────────────────────────────────
lmsTeacherRouter.post('/teacher/sessions/:id/start', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status, scheduled_at, duration_minutes').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'scheduled') throw new HttpError(400, 'INVALID_STATUS', 'Session is not in scheduled state.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id, name').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      // Atomic lock: only proceed if session is still 'scheduled' — blocks double-start race condition
      const { data: locked, error: lockError } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'live', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('status', 'scheduled')
        .select('id')
      if (lockError) throw new HttpError(500, 'UPDATE_FAILED', lockError.message)
      if (!locked || locked.length === 0) throw new HttpError(409, 'ALREADY_STARTED', 'Session was already started by another request.')

      // Create Zoom meeting — if this fails, roll back status to 'scheduled'
      let zoom: { meetingId: string; joinUrl: string; startUrl: string }
      try {
        zoom = await createZoomMeeting(cls.name, new Date().toISOString(), session.duration_minutes)
      } catch (zoomErr: any) {
        await supabaseServiceClient
          .from('lms_sessions')
          .update({ status: 'scheduled', started_at: null, updated_at: new Date().toISOString() })
          .eq('id', req.params.id)
        throw new HttpError(503, 'ZOOM_UNAVAILABLE', 'Could not create Zoom meeting. Please try again.')
      }

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ zoom_meeting_id: zoom.meetingId, zoom_join_url: zoom.joinUrl, zoom_start_url: zoom.startUrl, updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single()

      if (error || !updated) throw new HttpError(500, 'UPDATE_FAILED', error?.message ?? 'No data returned')

      await notifyAllEnrolledStudents(session.class_id, {
        type: 'session_starting',
        title: 'Session is now live',
        body: 'Your class session has started. Join now.',
        sessionId: req.params.id,
      })

      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/sessions/:id/end ───────────────────────────────────
lmsTeacherRouter.post('/teacher/sessions/:id/end', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status, started_at').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'live') throw new HttpError(400, 'INVALID_STATUS', 'Session is not live.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const endedAt = new Date()
      const actualMinutes = session.started_at
        ? Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 60000)
        : null

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'completed', ended_at: endedAt.toISOString(), actual_duration_minutes: actualMinutes, updated_at: endedAt.toISOString() })
        .eq('id', req.params.id).select().single()

      if (error || !updated) throw new HttpError(500, 'UPDATE_FAILED', error?.message ?? 'No data returned')
      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id/cancel ───────────────────────────────
const cancelSessionSchema = z.object({ reason: z.string().trim().min(10) })

lmsTeacherRouter.patch('/teacher/sessions/:id/cancel', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { reason } = cancelSessionSchema.parse(req.body)

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (!['scheduled', 'live'].includes(session.status)) throw new HttpError(400, 'INVALID_STATUS', 'Only scheduled or live sessions can be cancelled.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', missed_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'CANCEL_FAILED', error.message)
      return res.status(200).json({ message: 'Session cancelled.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id/missed ───────────────────────────────
const missedSessionSchema = z.object({ reason: z.string().trim().min(10) })

lmsTeacherRouter.patch('/teacher/sessions/:id/missed', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { reason } = missedSessionSchema.parse(req.body)

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status, scheduled_at').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'scheduled') {
        throw new HttpError(400, 'INVALID_STATUS', 'Only scheduled sessions can be marked as missed.')
      }

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', missed_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single()

      if (error || !updated) throw new HttpError(500, 'UPDATE_FAILED', error?.message ?? 'No data returned')

      await notifyAllEnrolledStudents(session.class_id, {
        type: 'session_rescheduled',
        title: 'Session cancelled',
        body: String(reason),
        sessionId: req.params.id,
      })

      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId/students ───────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId/students', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', req.params.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'Class not found or not yours.')

      const { data: enrollments, error } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('student_id, enrolled_at, demo_expires_at')
        .eq('class_id', req.params.classId)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const studentIds = (enrollments ?? []).map(e => e.student_id)

      const [profilesResult, sessionsResult] = await Promise.all([
        studentIds.length
          ? supabaseServiceClient.from('profiles').select('id, full_name, email').in('id', studentIds)
          : { data: [], error: null },
        supabaseServiceClient.from('lms_sessions').select('id').eq('class_id', req.params.classId).eq('status', 'completed'),
      ])

      const profileMap: Record<string, { full_name: string; email: string }> = {}
      ;(profilesResult.data ?? []).forEach(p => { profileMap[p.id] = p })

      const sessionIds = (sessionsResult.data ?? []).map(s => s.id)

      const { data: attendanceRows } = sessionIds.length
        ? await supabaseServiceClient
            .from('lms_attendance_records')
            .select('student_id, status')
            .in('student_id', studentIds)
            .in('session_id', sessionIds)
        : { data: [] }

      const attendedByStudent: Record<string, number> = {}
      ;(attendanceRows ?? []).forEach(r => {
        if (r.status === 'attended') {
          attendedByStudent[r.student_id] = (attendedByStudent[r.student_id] ?? 0) + 1
        }
      })

      const now = new Date()
      const result = (enrollments ?? []).map(e => {
        const expires = e.demo_expires_at ? new Date(e.demo_expires_at) : null
        const accessType = expires === null ? 'full' : expires > now ? 'demo_active' : 'demo_expired'
        return {
          studentId: e.student_id,
          studentName: profileMap[e.student_id]?.full_name ?? '',
          studentEmail: profileMap[e.student_id]?.email ?? '',
          enrolledAt: e.enrolled_at,
          accessType,
          attendedCount: attendedByStudent[e.student_id] ?? 0,
          totalSessions: sessionIds.length,
        }
      })

      return res.status(200).json({ students: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/notices/upload-pdf ─────────────────────────────────
lmsTeacherRouter.post('/teacher/notices/upload-pdf', authenticateRequest, requireRole('teacher'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new HttpError(400, 'NO_FILE', 'No file uploaded.')
      if (req.file.mimetype !== 'application/pdf') throw new HttpError(400, 'INVALID_TYPE', 'Only PDF files are allowed.')

      const classId = req.body.classId as string
      if (!classId) throw new HttpError(400, 'NO_CLASS_ID', 'classId is required.')

      const path = `${classId}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error } = await supabaseServiceClient.storage
        .from('notice-pdfs')
        .upload(path, req.file.buffer, { contentType: 'application/pdf', upsert: false })

      if (error) throw new HttpError(500, 'UPLOAD_FAILED', error.message)

      const { data: urlData } = supabaseServiceClient.storage.from('notice-pdfs').getPublicUrl(path)

      return res.status(200).json({ url: urlData.publicUrl, fileName: req.file.originalname })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId/notices ────────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId/notices', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', req.params.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .select('id, class_id, teacher_id, title, content, type, file_name, created_at')
        .eq('class_id', req.params.classId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const notices = (data ?? []).map(n => ({
        id: n.id, classId: n.class_id, teacherId: n.teacher_id,
        title: n.title, content: n.content, type: n.type,
        fileName: n.file_name, createdAt: n.created_at,
      }))

      return res.status(200).json({ notices })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/notices ────────────────────────────────────────────
const createNoticeSchema = z.object({
  classId:  z.string().uuid(),
  title:    z.string().min(1),
  content:  z.string().default(''),
  type:     z.enum(['announcement', 'pdf']),
  fileName: z.string().optional(),
})

lmsTeacherRouter.post('/teacher/notices', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createNoticeSchema.parse(req.body)
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', parsed.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .insert({ class_id: parsed.classId, teacher_id: teacherId, title: parsed.title, content: parsed.content, type: parsed.type, file_name: parsed.fileName ?? null })
        .select().single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)

      await notifyAllEnrolledStudents(parsed.classId, {
        type: 'notice_posted',
        title: `New notice: ${parsed.title}`,
        body: parsed.content.slice(0, 100),
        classId: parsed.classId,
      })

      return res.status(201).json({
        notice: {
          id: data.id, classId: data.class_id, teacherId: data.teacher_id,
          title: data.title, content: data.content, type: data.type,
          fileName: data.file_name, createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/teacher/notices/:id ──────────────────────────────────────
lmsTeacherRouter.delete('/teacher/notices/:id', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { data: notice } = await supabaseServiceClient
        .from('lms_notices').select('teacher_id').eq('id', req.params.id).single()
      if (!notice) throw new HttpError(404, 'NOT_FOUND', 'Notice not found.')
      if (notice.teacher_id !== teacherId) throw new HttpError(403, 'FORBIDDEN', 'This notice does not belong to you.')

      const { error } = await supabaseServiceClient.from('lms_notices').delete().eq('id', req.params.id)
      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Notice deleted.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/chat/group ──────────────────────────────────────────────────
// Shared endpoint: student or teacher JWT accepted
lmsTeacherRouter.get('/chat/group', authenticateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.auth!.role
      const userId = req.auth!.userId
      const classId = req.query.classId as string

      if (!classId) throw new HttpError(400, 'CLASSID_REQUIRED', 'classId query param is required.')

      // Access control
      if (role === 'teacher') {
        const { data: cls } = await supabaseServiceClient
          .from('lms_classes').select('id').eq('id', classId).eq('teacher_id', userId).single()
        if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')
      } else if (role === 'student') {
        const { data: enr } = await supabaseServiceClient
          .from('lms_enrollments').select('demo_expires_at').eq('student_id', userId).eq('class_id', classId).single()
        if (!enr) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')
        if (enr.demo_expires_at && new Date(enr.demo_expires_at) < new Date()) {
          throw new HttpError(403, 'DEMO_EXPIRED', 'Your demo access has expired.')
        }
      } else if (role !== 'admin' && role !== 'editor') {
        throw new HttpError(403, 'FORBIDDEN', 'Access denied.')
      }
      // admin and editor: no additional check — full supervision access

      const limit = Math.min(Number(req.query.limit) || 50, 100)
      const before = req.query.before as string | undefined

      let query = supabaseServiceClient
        .from('lms_chat_messages')
        .select('id, class_id, sender_id, sender_name, sender_role, text, sent_at')
        .eq('class_id', classId)
        .eq('is_deleted', false)
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (before) query = (query as any).lt('sent_at', before)

      const { data, error } = await query
      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const messages = (data ?? []).reverse().map(m => ({
        id: m.id, classId: m.class_id, senderId: m.sender_id,
        senderName: m.sender_name, senderRole: m.sender_role,
        text: m.text, sentAt: m.sent_at,
      }))

      return res.status(200).json({ messages, hasMore: (data ?? []).length === limit })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/chat/group ─────────────────────────────────────────────────
lmsTeacherRouter.post('/chat/group', authenticateRequest, chatLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.auth!.role
      const userId = req.auth!.userId
      const { classId, text } = req.body

      if (!classId || !text) {
        throw new HttpError(400, 'MISSING_FIELDS', 'classId and text are required.')
      }

      if (role !== 'student' && role !== 'teacher') {
        throw new HttpError(403, 'FORBIDDEN', 'Only students and teachers can send chat messages.')
      }

      // Access control
      if (role === 'teacher') {
        const { data: cls } = await supabaseServiceClient
          .from('lms_classes').select('id').eq('id', classId).eq('teacher_id', userId).single()
        if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')
      } else {
        const { data: enr } = await supabaseServiceClient
          .from('lms_enrollments').select('demo_expires_at').eq('student_id', userId).eq('class_id', classId).single()
        if (!enr) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')
        if (enr.demo_expires_at && new Date(enr.demo_expires_at) < new Date()) {
          throw new HttpError(403, 'DEMO_EXPIRED', 'Your demo access has expired.')
        }
      }

      // Always look up the sender name from the DB — never trust client-supplied names
      const { data: profile } = await supabaseServiceClient
        .from('profiles').select('full_name').eq('id', userId).single()
      const senderName = profile?.full_name ?? 'Unknown'

      const { data, error } = await supabaseServiceClient
        .from('lms_chat_messages')
        .insert({ class_id: classId, sender_id: userId, sender_name: senderName, sender_role: role, text })
        .select().single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)

      return res.status(201).json({
        message: {
          id: data.id, classId: data.class_id, senderId: data.sender_id,
          senderName: data.sender_name, senderRole: data.sender_role,
          text: data.text, sentAt: data.sent_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id/recording ────────────────────────────
const recordingUrlSchema = z.object({ url: z.string().url() })

lmsTeacherRouter.patch('/teacher/sessions/:id/recording', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { url } = recordingUrlSchema.parse(req.body)

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'completed') throw new HttpError(400, 'NOT_COMPLETED', 'Recording can only be set on completed sessions.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ recording_url: url, recording_status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single()

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/teacher/sessions/:id/recording ───────────────────────────
lmsTeacherRouter.delete('/teacher/sessions/:id/recording', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id').eq('id', req.params.id).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', session.class_id).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ recording_url: null, recording_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single()

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({
        session: {
          id: updated.id, classId: updated.class_id, scheduledAt: updated.scheduled_at,
          durationMinutes: updated.duration_minutes, status: updated.status,
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null, attendanceCount: updated.attendance_count,
          actualDurationMinutes: updated.actual_duration_minutes, changeNote: updated.change_note,
          missedReason: updated.missed_reason, startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/classes/:classId/sessions/:sessionId/attendance ─────
const attendanceSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['attended', 'absent', 'late']),
  })).min(1),
})

lmsTeacherRouter.post('/teacher/classes/:classId/sessions/:sessionId/attendance', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId
      const { records } = attendanceSchema.parse(req.body)

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('class_id, status').eq('id', req.params.sessionId).single()
      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'completed') throw new HttpError(400, 'NOT_COMPLETED', 'Attendance can only be submitted for completed sessions.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('id', req.params.classId).eq('teacher_id', teacherId).single()
      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const rows = records.map(r => ({
        session_id: req.params.sessionId,
        student_id: r.studentId,
        status: r.status,
      }))

      const { error } = await supabaseServiceClient
        .from('lms_attendance_records')
        .upsert(rows, { onConflict: 'session_id,student_id' })

      if (error) throw new HttpError(500, 'UPSERT_FAILED', error.message)

      const attendedCount = records.filter(r => r.status === 'attended').length

      await supabaseServiceClient
        .from('lms_sessions')
        .update({ attendance_count: attendedCount, updated_at: new Date().toISOString() })
        .eq('id', req.params.sessionId)

      return res.status(200).json({ message: 'Attendance recorded.', attendedCount })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/analytics ───────────────────────────────────────────
lmsTeacherRouter.get('/teacher/analytics', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: classes } = await supabaseServiceClient
        .from('lms_classes').select('id').eq('teacher_id', teacherId)

      const classIds = (classes ?? []).map(c => c.id)
      if (!classIds.length) {
        return res.status(200).json({
          analytics: { teacherId, totalSessionsCompleted: 0, avgAttendanceRate: 0, avgActualDuration: 0, totalStudentsTaught: 0, perSession: [] },
        })
      }

      const { data: sessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, actual_duration_minutes')
        .in('class_id', classIds)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: true })

      const sessionIds = (sessions ?? []).map(s => s.id)

      const { data: attendanceRecords } = await supabaseServiceClient
        .from('lms_attendance_records')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds)

      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id, student_id').in('class_id', classIds)

      const enrollCountByClass: Record<string, number> = {}
      const allStudentIds = new Set<string>()
      ;(enrollments ?? []).forEach(e => {
        enrollCountByClass[e.class_id] = (enrollCountByClass[e.class_id] ?? 0) + 1
        allStudentIds.add(e.student_id)
      })

      const attendedBySession: Record<string, number> = {}
      ;(attendanceRecords ?? []).forEach(r => {
        if (r.status === 'attended') {
          attendedBySession[r.session_id] = (attendedBySession[r.session_id] ?? 0) + 1
        }
      })

      const perSession = (sessions ?? []).map(s => {
        const totalEnrolled = enrollCountByClass[s.class_id] ?? 0
        const attendanceCount = attendedBySession[s.id] ?? 0
        const attendancePercent = totalEnrolled > 0 ? Math.round((attendanceCount / totalEnrolled) * 100) : 0
        return {
          sessionId: s.id,
          scheduledAt: s.scheduled_at,
          scheduledDuration: s.duration_minutes,
          actualDuration: s.actual_duration_minutes,
          attendanceCount,
          attendancePercent,
        }
      })

      const totalSessionsCompleted = perSession.length
      const avgAttendanceRate = totalSessionsCompleted > 0
        ? Math.round(perSession.reduce((sum, s) => sum + s.attendancePercent, 0) / totalSessionsCompleted)
        : 0
      const avgActualDuration = totalSessionsCompleted > 0
        ? Math.round(perSession.filter(s => s.actualDuration != null).reduce((sum, s) => sum + (s.actualDuration ?? 0), 0) / totalSessionsCompleted)
        : 0

      return res.status(200).json({
        analytics: {
          teacherId,
          totalSessionsCompleted,
          avgAttendanceRate,
          avgActualDuration,
          totalStudentsTaught: allStudentIds.size,
          perSession,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/profile ───────────────────────────────────────────
const updateTeacherProfileSchema = z.object({
  name:              z.string().min(2).optional(),
  phone:             z.string().min(5).optional(),
  bio:               z.string().min(10).max(300).optional(),
  profilePictureUrl: z.string().optional(),
})

lmsTeacherRouter.patch('/teacher/profile', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTeacherProfileSchema.parse(req.body)
      const teacherId = req.auth!.userId

      if (parsed.name || parsed.phone) {
        const profileUpdates: Record<string, string> = {}
        if (parsed.name)  profileUpdates.full_name = parsed.name
        if (parsed.phone) profileUpdates.phone = parsed.phone
        await supabaseServiceClient.from('profiles').update(profileUpdates).eq('id', teacherId)
      }

      if (parsed.bio !== undefined || parsed.profilePictureUrl !== undefined) {
        const tpUpdates: Record<string, unknown> = {}
        if (parsed.bio !== undefined)               tpUpdates.bio = parsed.bio
        if (parsed.profilePictureUrl !== undefined) tpUpdates.profile_picture_url = parsed.profilePictureUrl
        await supabaseServiceClient.from('lms_teacher_profiles').update(tpUpdates).eq('id', teacherId)
      }

      return res.status(200).json({ message: 'Profile updated.' })
    } catch (err) { return next(err) }
  }
)
