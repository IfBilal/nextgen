import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { notifyStudent } from '../lib/notify.js'
import { stripe } from '../lib/stripe.js'

export const lmsAdminRouter = Router()

// ─── Helper: build teacher response shape ────────────────────────────────────
async function fetchTeacherWithClasses(teacherId: string) {
  const { data: profile } = await supabaseServiceClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', teacherId)
    .single()

  const { data: tp } = await supabaseServiceClient
    .from('lms_teacher_profiles')
    .select('phone, bio, profile_picture_url, status, created_at')
    .eq('id', teacherId)
    .single()

  const { data: classes } = await supabaseServiceClient
    .from('lms_classes')
    .select('id')
    .eq('teacher_id', teacherId)

  return {
    id: teacherId,
    name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: tp?.phone ?? '',
    bio: tp?.bio ?? '',
    profilePicture: tp?.profile_picture_url ?? null,
    status: tp?.status ?? 'pending',
    registeredAt: tp?.created_at ?? '',
    assignedClassIds: (classes ?? []).map(c => c.id),
  }
}

// ─── GET /api/v1/admin/teachers ──────────────────────────────────────────────
lmsAdminRouter.get('/admin/teachers', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: teachers, error } = await supabaseServiceClient
        .from('lms_teacher_profiles')
        .select('id')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = await Promise.all((teachers ?? []).map(t => fetchTeacherWithClasses(t.id)))
      return res.status(200).json({ teachers: result })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/teachers/:id/approve ────────────────────────────────
lmsAdminRouter.patch('/admin/teachers/:id/approve', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_teacher_profiles')
        .update({ status: 'approved' })
        .eq('id', req.params.id)
      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Teacher approved.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/teachers/:id/reject ─────────────────────────────────
lmsAdminRouter.patch('/admin/teachers/:id/reject', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_teacher_profiles')
        .update({ status: 'suspended' })
        .eq('id', req.params.id)
      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Teacher rejected.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/teachers/:id/reinstate ──────────────────────────────
lmsAdminRouter.patch('/admin/teachers/:id/reinstate', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_teacher_profiles')
        .update({ status: 'approved' })
        .eq('id', req.params.id)
      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Teacher reinstated.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/editors ───────────────────────────────────────────────
lmsAdminRouter.get('/admin/editors', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_editor_profiles')
        .select('id, created_at, created_by_admin_id, profiles!lms_editor_profiles_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(e => ({
        id: e.id,
        name: (e.profiles as any).full_name,
        email: (e.profiles as any).email,
        createdAt: e.created_at,
        createdByAdminId: e.created_by_admin_id ?? '',
      }))

      return res.status(200).json({ editors: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/editors ──────────────────────────────────────────────
const createEditorSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8),
})

lmsAdminRouter.post('/admin/editors', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createEditorSchema.parse(req.body)
      const normalizedEmail = parsed.email.trim().toLowerCase()
      const adminId = req.auth!.userId

      const { data: authData, error: authError } = await supabaseServiceClient.auth.admin.createUser({
        email: normalizedEmail,
        password: parsed.password,
        email_confirm: true,
        user_metadata: { full_name: parsed.name },
      })

      if (authError || !authData.user) {
        throw new HttpError(400, 'CREATE_USER_FAILED', authError?.message ?? 'Failed to create user')
      }

      const userId = authData.user.id

      const { error: profileError } = await supabaseServiceClient
        .from('profiles')
        .insert({ id: userId, email: normalizedEmail, full_name: parsed.name, role: 'editor' })

      if (profileError) {
        await supabaseServiceClient.auth.admin.deleteUser(userId)
        throw new HttpError(500, 'PROFILE_CREATE_FAILED', profileError.message)
      }

      const { error: editorError } = await supabaseServiceClient
        .from('lms_editor_profiles')
        .insert({ id: userId, created_by_admin_id: adminId })

      if (editorError) {
        await supabaseServiceClient.auth.admin.deleteUser(userId)
        throw new HttpError(500, 'EDITOR_PROFILE_FAILED', editorError.message)
      }

      return res.status(201).json({
        editor: { id: userId, name: parsed.name, email: normalizedEmail, createdAt: new Date().toISOString(), createdByAdminId: adminId },
      })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/editors/:id ────────────────────────────────────────
lmsAdminRouter.delete('/admin/editors/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string }
      await supabaseServiceClient.from('lms_editor_profiles').delete().eq('id', id)
      await supabaseServiceClient.from('profiles').delete().eq('id', id)
      await supabaseServiceClient.auth.admin.deleteUser(id)
      return res.status(200).json({ success: true })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/products ──────────────────────────────────────────────
lmsAdminRouter.get('/admin/products', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const productIds = (data ?? []).map(p => p.id)
      const { data: classes } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, product_id')
        .in('product_id', productIds)

      const classIdsByProduct: Record<string, string[]> = {}
      ;(classes ?? []).forEach(c => {
        if (!classIdsByProduct[c.product_id]) classIdsByProduct[c.product_id] = []
        classIdsByProduct[c.product_id]!.push(c.id)
      })

      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id')
        .in('class_id', (classes ?? []).map(c => c.id))

      const enrollmentsByClass: Record<string, number> = {}
      ;(enrollments ?? []).forEach(e => {
        enrollmentsByClass[e.class_id] = (enrollmentsByClass[e.class_id] ?? 0) + 1
      })

      const result = (data ?? []).map(p => {
        const myClassIds = classIdsByProduct[p.id] ?? []
        const enrolledCount = myClassIds.reduce((sum, cid) => sum + (enrollmentsByClass[cid] ?? 0), 0)
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          upfrontPrice: Number(p.upfront_price),
          installmentAmount: Number(p.installment_amount),
          installmentMonths: p.installment_months,
          isActive: p.is_active,
          classIds: myClassIds,
          enrolledStudentCount: enrolledCount,
          createdAt: p.created_at,
        }
      })

      return res.status(200).json({ products: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/products ─────────────────────────────────────────────
const createProductSchema = z.object({
  name:              z.string().min(2),
  description:       z.string().min(1),
  upfrontPrice:      z.number().min(0),
  installmentAmount: z.number().min(0),
  installmentMonths: z.number().int().min(0),
  isActive:          z.boolean().default(true),
})

lmsAdminRouter.post('/admin/products', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProductSchema.parse(req.body)
      const { data, error } = await supabaseServiceClient
        .from('lms_products')
        .insert({
          name: parsed.name,
          description: parsed.description,
          upfront_price: parsed.upfrontPrice,
          installment_amount: parsed.installmentAmount,
          installment_months: parsed.installmentMonths,
          is_active: parsed.isActive,
        })
        .select()
        .single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)

      return res.status(201).json({
        product: {
          id: data.id, name: data.name, description: data.description,
          upfrontPrice: Number(data.upfront_price), installmentAmount: Number(data.installment_amount),
          installmentMonths: data.installment_months, isActive: data.is_active,
          classIds: [], enrolledStudentCount: 0, createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/products/:id ───────────────────────────────────────
lmsAdminRouter.patch('/admin/products/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createProductSchema.partial().parse(req.body)
      const updates: Record<string, unknown> = {}
      if (parsed.name !== undefined)               updates.name = parsed.name
      if (parsed.description !== undefined)        updates.description = parsed.description
      if (parsed.upfrontPrice !== undefined)       updates.upfront_price = parsed.upfrontPrice
      if (parsed.installmentAmount !== undefined)  updates.installment_amount = parsed.installmentAmount
      if (parsed.installmentMonths !== undefined)  updates.installment_months = parsed.installmentMonths
      if (parsed.isActive !== undefined)           updates.is_active = parsed.isActive
      updates.updated_at = new Date().toISOString()

      const { error } = await supabaseServiceClient
        .from('lms_products').update(updates).eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Product updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/products/:id ──────────────────────────────────────
lmsAdminRouter.delete('/admin/products/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { count } = await supabaseServiceClient
        .from('lms_classes').select('id', { count: 'exact', head: true }).eq('product_id', req.params.id)

      if ((count ?? 0) > 0) {
        throw new HttpError(409, 'HAS_CLASSES', 'Cannot delete a product that has active classes.')
      }

      const { error } = await supabaseServiceClient.from('lms_products').delete().eq('id', req.params.id)
      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Product deleted.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/classes ───────────────────────────────────────────────
lmsAdminRouter.get('/admin/classes', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, product_id, name, description, teacher_id, default_duration_minutes, created_at')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const classIds = (data ?? []).map(c => c.id)
      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments').select('class_id, student_id').in('class_id', classIds)

      const enrolledIdsByClass: Record<string, string[]> = {}
      ;(enrollments ?? []).forEach(e => {
        if (!enrolledIdsByClass[e.class_id]) enrolledIdsByClass[e.class_id] = []
        enrolledIdsByClass[e.class_id]!.push(e.student_id)
      })

      const result = (data ?? []).map(c => ({
        id: c.id, productId: c.product_id, name: c.name, description: c.description,
        teacherId: c.teacher_id, defaultDurationMinutes: c.default_duration_minutes,
        enrolledStudentIds: enrolledIdsByClass[c.id] ?? [],
        createdAt: c.created_at,
      }))

      return res.status(200).json({ classes: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/classes ──────────────────────────────────────────────
const createClassSchema = z.object({
  productId:              z.string().uuid(),
  name:                   z.string().min(2),
  description:            z.string().default(''),
  teacherId:              z.string().uuid(),
  defaultDurationMinutes: z.number().int().min(15).default(90),
})

lmsAdminRouter.post('/admin/classes', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createClassSchema.parse(req.body)

      // Validate teacher is approved
      const { data: teacher } = await supabaseServiceClient
        .from('lms_teacher_profiles').select('status').eq('id', parsed.teacherId).single()
      if (!teacher || teacher.status !== 'approved') {
        throw new HttpError(400, 'TEACHER_NOT_APPROVED', 'Teacher must be approved before assigning a class.')
      }

      // Validate product is active
      const { data: product } = await supabaseServiceClient
        .from('lms_products').select('is_active').eq('id', parsed.productId).single()
      if (!product || !product.is_active) {
        throw new HttpError(400, 'PRODUCT_INACTIVE', 'Product must be active.')
      }

      const { data, error } = await supabaseServiceClient
        .from('lms_classes')
        .insert({
          product_id: parsed.productId,
          name: parsed.name,
          description: parsed.description,
          teacher_id: parsed.teacherId,
          default_duration_minutes: parsed.defaultDurationMinutes,
        })
        .select()
        .single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)

      return res.status(201).json({
        class: {
          id: data.id, productId: data.product_id, name: data.name, description: data.description,
          teacherId: data.teacher_id, defaultDurationMinutes: data.default_duration_minutes,
          enrolledStudentIds: [], createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/classes/:id ─────────────────────────────────────────
lmsAdminRouter.patch('/admin/classes/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createClassSchema.partial().parse(req.body)
      const updates: Record<string, unknown> = {}
      if (parsed.productId !== undefined)              updates.product_id = parsed.productId
      if (parsed.name !== undefined)                   updates.name = parsed.name
      if (parsed.description !== undefined)            updates.description = parsed.description
      if (parsed.teacherId !== undefined)              updates.teacher_id = parsed.teacherId
      if (parsed.defaultDurationMinutes !== undefined) updates.default_duration_minutes = parsed.defaultDurationMinutes

      const { data: updated, error } = await supabaseServiceClient
        .from('lms_classes').update(updates).eq('id', req.params.id).select().single()

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)

      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments').select('student_id').eq('class_id', req.params.id)

      return res.status(200).json({
        class: {
          id: updated.id, productId: updated.product_id, name: updated.name, description: updated.description,
          teacherId: updated.teacher_id, defaultDurationMinutes: updated.default_duration_minutes,
          enrolledStudentIds: (enrollments ?? []).map(e => e.student_id),
          createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/classes/:classId/enrollments ──────────────────────────
lmsAdminRouter.get('/admin/classes/:classId/enrollments', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('student_id, enrolled_at, demo_expires_at')
        .eq('class_id', req.params.classId)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const studentIds = (data ?? []).map(e => e.student_id)
      const { data: profiles } = await supabaseServiceClient
        .from('profiles').select('id, full_name, email').in('id', studentIds)

      const profileMap: Record<string, { full_name: string; email: string }> = {}
      ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })

      const now = new Date()
      const result = (data ?? []).map(e => {
        const expires = e.demo_expires_at ? new Date(e.demo_expires_at) : null
        const accessType = expires === null ? 'full' : expires > now ? 'demo_active' : 'demo_expired'
        return {
          studentId: e.student_id,
          studentName: profileMap[e.student_id]?.full_name ?? '',
          studentEmail: profileMap[e.student_id]?.email ?? '',
          enrolledAt: e.enrolled_at,
          demoExpiresAt: e.demo_expires_at,
          accessType,
        }
      })

      return res.status(200).json({ enrollments: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/classes/:classId/enroll ──────────────────────────────
const enrollStudentSchema = z.object({
  studentId:  z.string().uuid(),
  accessType: z.enum(['full', 'demo']),
  demoDays:   z.number().int().min(1).optional(),
})

lmsAdminRouter.post('/admin/classes/:classId/enroll', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = enrollStudentSchema.parse(req.body)

      const { data: profile } = await supabaseServiceClient
        .from('profiles').select('role').eq('id', parsed.studentId).single()
      if (!profile || profile.role !== 'student') {
        throw new HttpError(400, 'INVALID_STUDENT', 'Student not found.')
      }

      let demoExpiresAt: string | null = null
      if (parsed.accessType === 'demo') {
        if (!parsed.demoDays) throw new HttpError(400, 'DEMO_DAYS_REQUIRED', 'demoDays is required for demo access.')
        const d = new Date()
        d.setDate(d.getDate() + parsed.demoDays)
        demoExpiresAt = d.toISOString()
      }

      const { error } = await supabaseServiceClient
        .from('lms_enrollments')
        .upsert(
          { student_id: parsed.studentId, class_id: req.params.classId, demo_expires_at: demoExpiresAt },
          { onConflict: 'student_id,class_id' }
        )

      if (error) throw new HttpError(500, 'ENROLL_FAILED', error.message)

      await notifyStudent({
        studentId: parsed.studentId,
        type: 'enrollment_confirmed',
        title: 'Enrollment Confirmed',
        body: 'You have been enrolled in a class by an administrator.',
        classId: req.params.classId,
      })

      return res.status(201).json({ message: 'Student enrolled.' })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/classes/:classId/enrollments/:studentId ─────────────
lmsAdminRouter.delete('/admin/classes/:classId/enrollments/:studentId', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_enrollments')
        .delete()
        .eq('class_id', req.params.classId)
        .eq('student_id', req.params.studentId)

      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Enrollment removed.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/classes/:classId/enrollments/:studentId ──────────────
const enrollmentOverrideSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('extend'),      days: z.number().int().min(1).max(365) }),
  z.object({ type: z.literal('full_access') }),
  z.object({ type: z.literal('revoke') }),
])

lmsAdminRouter.patch('/admin/classes/:classId/enrollments/:studentId', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const action = enrollmentOverrideSchema.parse(req.body)
      const { classId, studentId } = req.params

      let demoExpiresAt: string | null
      if (action.type === 'full_access') {
        demoExpiresAt = null
      } else if (action.type === 'revoke') {
        demoExpiresAt = new Date().toISOString()
      } else {
        const d = new Date()
        d.setDate(d.getDate() + action.days)
        demoExpiresAt = d.toISOString()
      }

      const { error } = await supabaseServiceClient
        .from('lms_enrollments')
        .update({ demo_expires_at: demoExpiresAt })
        .eq('class_id', classId)
        .eq('student_id', studentId)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ classId, studentId, demoExpiresAt })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/sessions ──────────────────────────────────────────────
lmsAdminRouter.get('/admin/sessions', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select(`
          *,
          lms_classes!inner(
            id, name, product_id,
            lms_teacher_profiles!inner(id),
            lms_products:lms_classes_product_id_fkey(name)
          )
        `)
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const teacherIds = [...new Set((data ?? []).map(s => (s.lms_classes as any).lms_teacher_profiles?.id).filter(Boolean))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles').select('id, full_name').in('id', teacherIds)

      const nameMap: Record<string, string> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })

      const result = (data ?? []).map(s => ({
        id: s.id, classId: s.class_id,
        className: (s.lms_classes as any).name,
        teacherId: (s.lms_classes as any).lms_teacher_profiles?.id,
        teacherName: nameMap[(s.lms_classes as any).lms_teacher_profiles?.id] ?? '',
        productName: (s.lms_classes as any).lms_products?.name ?? '',
        scheduledAt: s.scheduled_at, durationMinutes: s.duration_minutes, status: s.status,
        meetingLink: s.zoom_join_url ?? s.zoom_meeting_id, startUrl: s.zoom_start_url ?? null,
        attendanceCount: s.attendance_count, actualDurationMinutes: s.actual_duration_minutes,
        changeNote: s.change_note, missedReason: s.missed_reason, startedAt: s.started_at ?? null, recordingUrl: s.recording_url, createdAt: s.created_at,
      }))

      return res.status(200).json({ sessions: result })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/sessions/:id ───────────────────────────────────────
const updateSessionSchema = z.object({
  scheduledAt:     z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).optional(),
  changeNote:      z.string().min(1),
})

lmsAdminRouter.patch('/admin/sessions/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSessionSchema.parse(req.body)
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
          meetingLink: updated.zoom_join_url ?? updated.zoom_meeting_id, startUrl: updated.zoom_start_url ?? null,
          attendanceCount: updated.attendance_count, actualDurationMinutes: updated.actual_duration_minutes,
          changeNote: updated.change_note, missedReason: updated.missed_reason,
          startedAt: updated.started_at ?? null, recordingUrl: updated.recording_url, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/sessions/:id/start-url ─────────────────────────────────
lmsAdminRouter.get('/admin/sessions/:id/start-url', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: session } = await supabaseServiceClient
        .from('lms_sessions').select('zoom_meeting_id').eq('id', req.params.id).single()
      if (!session?.zoom_meeting_id) throw new HttpError(404, 'NOT_FOUND', 'No Zoom meeting for this session.')
      const { getZoomStartUrl } = await import('../lib/zoom.js')
      const startUrl = await getZoomStartUrl(session.zoom_meeting_id)
      return res.status(200).json({ startUrl })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/sessions/:id/regenerate-zoom ─────────────────────────
lmsAdminRouter.post('/admin/sessions/:id/regenerate-zoom', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status')
        .eq('id', req.params.id).single()

      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status === 'completed' || session.status === 'cancelled') {
        throw new HttpError(400, 'INVALID_STATUS', 'Cannot regenerate meeting for completed or cancelled sessions.')
      }

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes').select('name').eq('id', session.class_id).single()

      const { createZoomMeeting } = await import('../lib/zoom.js')
      const { meetingId, joinUrl, startUrl } = await createZoomMeeting(
        cls?.name ?? 'Session',
        session.scheduled_at,
        session.duration_minutes
      )

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ zoom_meeting_id: meetingId, zoom_join_url: joinUrl, zoom_start_url: startUrl, updated_at: new Date().toISOString() })
        .eq('id', session.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ meetingId, joinUrl, startUrl })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/sessions/:id/cancel ─────────────────────────────────
lmsAdminRouter.patch('/admin/sessions/:id/cancel', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: cancelled, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .in('status', ['scheduled', 'live'])
        .select('id')

      if (error) throw new HttpError(500, 'CANCEL_FAILED', error.message)
      if (!cancelled || cancelled.length === 0) throw new HttpError(400, 'INVALID_STATUS', 'Session cannot be cancelled — it may already be completed or cancelled.')
      return res.status(200).json({ message: 'Session cancelled.' })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/sessions/:id/recording ─────────────────────────────
lmsAdminRouter.delete('/admin/sessions/:id/recording', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: updated, error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ recording_url: null, recording_status: 'none', updated_at: new Date().toISOString() })
        .eq('id', req.params.id).select().single()

      if (error || !updated) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
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

// ─── GET /api/v1/admin/demo-overrides ────────────────────────────────────────
lmsAdminRouter.get('/admin/demo-overrides', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_demo_overrides')
        .select('student_id, demo_expires_at, overridden_by_admin_id, overridden_at, profiles!student_id(full_name, email)')
        .order('overridden_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(o => ({
        studentId: o.student_id,
        studentName: (o.profiles as any)?.full_name ?? '',
        studentEmail: (o.profiles as any)?.email ?? '',
        demoExpiresAt: o.demo_expires_at,
        overriddenByAdminId: o.overridden_by_admin_id,
        overriddenAt: o.overridden_at,
      }))

      return res.status(200).json({ overrides: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/students ──────────────────────────────────────────────
lmsAdminRouter.get('/admin/students', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (error) throw error

      const studentIds = (data ?? []).map(s => s.id)

      const { data: enrollments } = studentIds.length
        ? await supabaseServiceClient
            .from('lms_enrollments')
            .select('student_id, class_id, enrolled_at, demo_expires_at')
            .in('student_id', studentIds)
        : { data: [] }

      const classIds = [...new Set((enrollments ?? []).map(e => e.class_id))]
      const { data: classes } = classIds.length
        ? await supabaseServiceClient
            .from('lms_classes')
            .select('id, name')
            .in('id', classIds)
        : { data: [] }

      const classNameMap: Record<string, string> = {}
      ;(classes ?? []).forEach(c => { classNameMap[c.id] = c.name })

      const enrollmentsByStudent: Record<string, { classId: string; className: string; enrolledAt: string; demoExpiresAt: string | null }[]> = {}
      ;(enrollments ?? []).forEach(e => {
        if (!enrollmentsByStudent[e.student_id]) enrollmentsByStudent[e.student_id] = []
        enrollmentsByStudent[e.student_id]!.push({
          classId: e.class_id,
          className: classNameMap[e.class_id] ?? '',
          enrolledAt: e.enrolled_at,
          demoExpiresAt: e.demo_expires_at ?? null,
        })
      })

      return res.status(200).json({
        students: (data ?? []).map(s => ({
          id: s.id,
          name: s.full_name ?? '',
          email: s.email ?? '',
          phone: s.phone ?? '',
          registeredAt: s.created_at,
          enrollments: enrollmentsByStudent[s.id] ?? [],
        })),
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/students/:id/demo-override ──────────────────────────
const demoOverrideSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('extend'),      days: z.number().int().min(1).max(30) }),
  z.object({ type: z.literal('full_access') }),
  z.object({ type: z.literal('reset') }),
])

lmsAdminRouter.patch('/admin/students/:id/demo-override', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const action = demoOverrideSchema.parse(req.body)
      const studentId = req.params.id
      const adminId = req.auth!.userId

      let demoExpiresAt: string | null
      if (action.type === 'full_access') {
        demoExpiresAt = null
      } else if (action.type === 'reset') {
        demoExpiresAt = new Date().toISOString()
      } else {
        const d = new Date()
        d.setDate(d.getDate() + action.days)
        demoExpiresAt = d.toISOString()
      }

      const { error } = await supabaseServiceClient
        .from('lms_demo_overrides')
        .upsert({
          student_id: studentId,
          demo_expires_at: demoExpiresAt,
          overridden_by_admin_id: adminId,
          overridden_at: new Date().toISOString(),
        }, { onConflict: 'student_id' })

      if (error) throw new HttpError(500, 'OVERRIDE_FAILED', error.message)

      await supabaseServiceClient
        .from('lms_enrollments')
        .update({ demo_expires_at: demoExpiresAt })
        .eq('student_id', studentId)
        .not('demo_expires_at', 'is', null)

      return res.status(200).json({
        override: { studentId, demoExpiresAt, overriddenByAdminId: adminId, overriddenAt: new Date().toISOString() },
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/coupons ───────────────────────────────────────────────
lmsAdminRouter.get('/admin/coupons', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_coupons')
        .select('*, lms_products(name)')
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(c => ({
        id: c.id, code: c.code, discountType: c.discount_type,
        discountValue: Number(c.discount_value), maxUses: c.max_uses,
        usedCount: c.uses_count, productId: c.product_id,
        productName: (c.lms_products as any)?.name ?? null,
        expiresAt: c.expires_at, isActive: c.is_active, createdAt: c.created_at,
      }))

      return res.status(200).json({ coupons: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/coupons ──────────────────────────────────────────────
const createCouponSchema = z.object({
  code:          z.string().min(1),
  discountType:  z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  maxUses:       z.number().int().min(1).optional(),
  productId:     z.string().uuid().optional(),
  expiresAt:     z.string().datetime().optional(),
})

lmsAdminRouter.post('/admin/coupons', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createCouponSchema.parse(req.body)

      const { data, error } = await supabaseServiceClient
        .from('lms_coupons')
        .insert({
          code: parsed.code.toUpperCase(),
          discount_type: parsed.discountType,
          discount_value: parsed.discountValue,
          max_uses: parsed.maxUses ?? null,
          product_id: parsed.productId ?? null,
          expires_at: parsed.expiresAt ?? null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') throw new HttpError(409, 'DUPLICATE_CODE', 'A coupon with this code already exists.')
        throw new HttpError(500, 'CREATE_FAILED', error.message)
      }

      return res.status(201).json({
        coupon: {
          id: data.id, code: data.code, discountType: data.discount_type,
          discountValue: Number(data.discount_value), maxUses: data.max_uses,
          usedCount: data.uses_count, productId: data.product_id,
          expiresAt: data.expires_at, isActive: data.is_active, createdAt: data.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/coupons/:id ─────────────────────────────────────────
const toggleCouponSchema = z.object({ isActive: z.boolean() })

lmsAdminRouter.patch('/admin/coupons/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isActive } = toggleCouponSchema.parse(req.body)
      const { data: updated, error } = await supabaseServiceClient
        .from('lms_coupons').update({ is_active: isActive }).eq('id', req.params.id).select().single()
      if (error || !updated) throw new HttpError(500, 'UPDATE_FAILED', error?.message ?? 'No data')
      return res.status(200).json({
        coupon: {
          id: updated.id, code: updated.code, discountType: updated.discount_type,
          discountValue: Number(updated.discount_value), maxUses: updated.max_uses ?? null,
          usedCount: updated.uses_count, productId: updated.product_id,
          expiresAt: updated.expires_at, isActive: updated.is_active, createdAt: updated.created_at,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/coupons/:id ────────────────────────────────────────
lmsAdminRouter.delete('/admin/coupons/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: coupon } = await supabaseServiceClient
        .from('lms_coupons').select('uses_count').eq('id', req.params.id).single()

      if ((coupon?.uses_count ?? 0) > 0) {
        throw new HttpError(409, 'COUPON_IN_USE', 'Cannot delete a coupon that has already been used.')
      }

      const { error } = await supabaseServiceClient.from('lms_coupons').delete().eq('id', req.params.id)
      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Coupon deleted.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/chat ──────────────────────────────────────────────────
lmsAdminRouter.get('/admin/chat', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classIdFilter = req.query.classId as string | undefined
      const limit = Math.min(Number(req.query.limit) || 100, 200)
      const before = req.query.before as string | undefined

      let query = supabaseServiceClient
        .from('lms_chat_messages')
        .select('id, class_id, sender_id, sender_name, sender_role, text, is_deleted, sent_at, lms_classes!inner(name)')
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (classIdFilter) query = (query as any).eq('class_id', classIdFilter)
      if (before) query = (query as any).lt('sent_at', before)

      const { data, error } = await query
      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(m => ({
        id: m.id, classId: m.class_id, className: (m.lms_classes as any).name,
        senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role,
        text: m.text, isDeleted: m.is_deleted, sentAt: m.sent_at,
      }))

      return res.status(200).json({ messages: result.reverse(), hasMore: result.length === limit })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/chat/messages/:messageId ─────────────────────────────────
lmsAdminRouter.delete('/chat/messages/:messageId', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_chat_messages')
        .update({ is_deleted: true })
        .eq('id', req.params.messageId)

      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Message deleted.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/orders ────────────────────────────────────────────────
lmsAdminRouter.get('/admin/orders', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_orders')
        .select('*, profiles!lms_orders_student_id_fkey(full_name, email), lms_products!lms_orders_product_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(o => ({
        id: o.id,
        studentId: o.student_id,
        studentName: (o.profiles as any)?.full_name ?? '',
        studentEmail: (o.profiles as any)?.email ?? '',
        productId: o.product_id,
        productName: (o.lms_products as any)?.name ?? '',
        plan: o.plan,
        amountPaid: o.plan === 'installment' ? Number(o.total_collected ?? o.amount_paid) : Number(o.amount_paid),
        monthlyAmount: o.plan === 'installment' ? Number(o.amount_paid) : null,
        couponId: o.coupon_id ?? null,
        status: o.status,
        stripePaymentIntentId: o.stripe_payment_intent_id ?? null,
        paidAt: o.paid_at ?? null,
        createdAt: o.created_at,
      }))

      return res.status(200).json({ orders: result })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/admin/orders/:orderId/refund ───────────────────────────────
lmsAdminRouter.post('/admin/orders/:orderId/refund', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: order } = await supabaseServiceClient
        .from('lms_orders')
        .select('id, status, student_id, product_id, class_id, stripe_payment_intent_id, stripe_subscription_id')
        .eq('id', req.params.orderId)
        .single()

      if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found.')
      if (order.status !== 'paid') throw new HttpError(400, 'NOT_PAID', 'Only paid orders can be refunded.')

      const isInstallment = !!order.stripe_subscription_id

      if (!isInstallment && order.stripe_payment_intent_id) {
        // Upfront — refund the payment intent
        try {
          await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
        } catch (err: any) {
          const alreadyRefunded = err?.raw?.code === 'charge_already_refunded' || err?.code === 'charge_already_refunded'
          if (!alreadyRefunded) throw err
        }
      } else if (isInstallment) {
        // Installment — cancel subscription only, no refund
        try {
          const subscription = await stripe.subscriptions.retrieve(order.stripe_subscription_id!)
          if (subscription.status !== 'canceled') {
            await stripe.subscriptions.cancel(order.stripe_subscription_id!)
          }
        } catch (err: any) {
          const code = err?.code ?? err?.raw?.code
          if (code !== 'resource_missing') throw err
        }
      }

      await supabaseServiceClient
        .from('lms_orders').update({ status: 'refunded' }).eq('id', req.params.orderId)

      // Remove the enrollment created by this payment
      if (order.class_id) {
        await supabaseServiceClient
          .from('lms_enrollments')
          .delete()
          .eq('student_id', order.student_id)
          .eq('class_id', order.class_id)
      } else {
        // Fallback for orders without class_id: remove paid enrollments across all product classes
        const { data: productClasses } = await supabaseServiceClient
          .from('lms_classes').select('id').eq('product_id', order.product_id)
        if (productClasses && productClasses.length > 0) {
          await supabaseServiceClient
            .from('lms_enrollments')
            .delete()
            .eq('student_id', order.student_id)
            .in('class_id', productClasses.map(c => c.id))
            .is('demo_expires_at', null)
        }
      }

      await notifyStudent({
        studentId: order.student_id,
        type: isInstallment ? 'access_revoked' : 'enrollment_confirmed',
        title: isInstallment ? 'Access Revoked' : 'Refund Processed',
        body: isInstallment
          ? 'Your installment subscription has been cancelled and your class access has been removed.'
          : 'Your refund has been issued and your class access has been removed.',
        classId: order.class_id ?? undefined,
      })

      return res.status(200).json({ message: 'Refund processed. Student access revoked.' })
    } catch (err) { return next(err) }
  }
)
