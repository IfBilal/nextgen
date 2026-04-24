/**
 * LMS API service — all data access for the Online Sessions LMS goes through here.
 *
 * Currently: reads/writes mock data from src/data/lms.ts
 * BACKEND SWAP: Replace each function body with a real API call via apiRequest().
 * The function signatures, parameter shapes, and return types stay identical.
 * Nothing else in the codebase needs to change.
 *
 * Endpoint mapping is noted above each function.
 */

import {
  getTeachers, saveTeachers, getTeacherPassword, setTeacherPassword,
  getEditors, saveEditors, getEditorPassword, setEditorPassword,
  getProducts, saveProducts,
  getClasses,
  getSessions, saveSessions,
  getNotices, saveNotices,
  getDemoOverrides, saveDemoOverrides,
} from '../data/lms'

import type {
  Teacher, Editor, Product, LmsClass, LmsSession, Notice, DemoOverride,
  RegisterTeacherPayload, CreateEditorPayload, CreateProductPayload,
  CreateSessionPayload, UpdateSessionPayload, CreateNoticePayload,
  SessionWithClass, ClassWithProduct,
} from '../types/lms'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TeacherLoginResponse {
  teacher: Teacher
  accessToken: string
}

export async function registerTeacher(payload: RegisterTeacherPayload): Promise<Teacher> {
  // BACKEND SWAP: POST /api/v1/auth/teacher/register
  const teachers = getTeachers()
  const emailExists = teachers.some(t => t.email.toLowerCase() === payload.email.toLowerCase())
  if (emailExists) throw new Error('An account with this email already exists.')

  const newTeacher: Teacher = {
    id: `teacher-${Date.now()}`,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    bio: payload.bio.trim(),
    status: 'pending',
    registeredAt: new Date().toISOString(),
    assignedClassIds: [],
  }

  saveTeachers([...teachers, newTeacher])
  setTeacherPassword(newTeacher.id, payload.password)
  return newTeacher
}

export async function loginTeacher(email: string, password: string): Promise<TeacherLoginResponse> {
  // BACKEND SWAP: POST /api/v1/auth/teacher/login
  const teachers = getTeachers()
  const teacher = teachers.find(t => t.email.toLowerCase() === email.toLowerCase())
  if (!teacher) throw new Error('Invalid email or password.')

  const storedPassword = getTeacherPassword(teacher.id)
  if (storedPassword !== password) throw new Error('Invalid email or password.')

  return {
    teacher,
    accessToken: `mock-teacher-token-${teacher.id}`,
  }
}

export interface EditorLoginResponse {
  editor: Editor
  accessToken: string
}

export async function loginEditor(email: string, password: string): Promise<EditorLoginResponse> {
  // BACKEND SWAP: POST /api/v1/auth/editor/login
  const editors = getEditors()
  const editor = editors.find(e => e.email.toLowerCase() === email.toLowerCase())
  if (!editor) throw new Error('Invalid email or password.')

  const storedPassword = getEditorPassword(editor.id)
  if (storedPassword !== password) throw new Error('Invalid email or password.')

  return {
    editor,
    accessToken: `mock-editor-token-${editor.id}`,
  }
}

// ─── Teacher queries ──────────────────────────────────────────────────────────

export async function getTeacherById(id: string): Promise<Teacher | null> {
  // BACKEND SWAP: GET /api/v1/teacher/:id
  const teachers = getTeachers()
  return teachers.find(t => t.id === id) ?? null
}

export async function getTeacherClasses(teacherId: string): Promise<ClassWithProduct[]> {
  // BACKEND SWAP: GET /api/v1/teacher/classes
  const classes = getClasses()
  const products = getProducts()
  const sessions = getSessions()
  const teachers = getTeachers()

  return classes
    .filter(c => c.teacherId === teacherId)
    .map(c => {
      const product = products.find(p => p.id === c.productId)
      const teacher = teachers.find(t => t.id === c.teacherId)
      const classSessions = sessions
        .filter(s => s.classId === c.id && (s.status === 'scheduled' || s.status === 'live'))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

      return {
        ...c,
        productName: product?.name ?? 'Unknown Product',
        teacherName: teacher?.name ?? 'Unknown Teacher',
        nextSession: classSessions[0],
      }
    })
}

export async function getTeacherSessions(classId: string): Promise<LmsSession[]> {
  // BACKEND SWAP: GET /api/v1/teacher/classes/:classId/sessions
  const sessions = getSessions()
  return sessions
    .filter(s => s.classId === classId)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
}

export async function createSession(payload: CreateSessionPayload): Promise<LmsSession> {
  // BACKEND SWAP: POST /api/v1/teacher/sessions
  const sessions = getSessions()
  const newSession: LmsSession = {
    id: `session-${Date.now()}`,
    classId: payload.classId,
    scheduledAt: payload.scheduledAt,
    durationMinutes: payload.durationMinutes,
    status: 'scheduled',
    meetingLink: payload.meetingLink ?? generateMeetingLink(payload.classId),
    createdAt: new Date().toISOString(),
  }
  saveSessions([...sessions, newSession])
  return newSession
}

export async function updateSession(id: string, payload: UpdateSessionPayload): Promise<LmsSession> {
  // BACKEND SWAP: PATCH /api/v1/teacher/sessions/:id
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) throw new Error('Session not found.')

  const updated: LmsSession = {
    ...sessions[idx],
    scheduledAt: payload.scheduledAt,
    durationMinutes: payload.durationMinutes,
    meetingLink: payload.meetingLink ?? sessions[idx].meetingLink,
    changeNote: payload.changeNote,
  }
  sessions[idx] = updated
  saveSessions(sessions)
  return updated
}

export async function startSession(id: string): Promise<LmsSession> {
  // BACKEND SWAP: POST /api/v1/teacher/sessions/:id/start
  // Backend also fires WhatsApp/Email/Push notifications here
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) throw new Error('Session not found.')

  sessions[idx] = { ...sessions[idx], status: 'live' }
  saveSessions(sessions)
  return sessions[idx]
}

export async function endSession(id: string): Promise<LmsSession> {
  // BACKEND SWAP: POST /api/v1/teacher/sessions/:id/end
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) throw new Error('Session not found.')

  const startedAt = new Date(sessions[idx].scheduledAt)
  const actualMinutes = Math.round((Date.now() - startedAt.getTime()) / 60000)

  sessions[idx] = {
    ...sessions[idx],
    status: 'completed',
    actualDurationMinutes: actualMinutes,
    recordingUrl: `https://recordings.mock/${id}`,
  }
  saveSessions(sessions)
  return sessions[idx]
}

export async function cancelSession(id: string): Promise<void> {
  // BACKEND SWAP: PATCH /api/v1/teacher/sessions/:id/cancel
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === id)
  if (idx !== -1) {
    sessions[idx] = { ...sessions[idx], status: 'cancelled' }
    saveSessions(sessions)
  }
}

// ─── Notice board ─────────────────────────────────────────────────────────────

export async function getNoticesForClass(classId: string): Promise<Notice[]> {
  // BACKEND SWAP: GET /api/v1/teacher/classes/:classId/notices
  const notices = getNotices()
  return notices
    .filter(n => n.classId === classId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createNotice(teacherId: string, payload: CreateNoticePayload): Promise<Notice> {
  // BACKEND SWAP: POST /api/v1/teacher/classes/:classId/notices
  const notices = getNotices()
  const newNotice: Notice = {
    id: `notice-${Date.now()}`,
    classId: payload.classId,
    teacherId,
    title: payload.title,
    content: payload.content,
    type: payload.type,
    fileName: payload.fileName,
    createdAt: new Date().toISOString(),
  }
  saveNotices([...notices, newNotice])
  return newNotice
}

export async function deleteNotice(id: string): Promise<void> {
  // BACKEND SWAP: DELETE /api/v1/teacher/notices/:id
  const notices = getNotices()
  saveNotices(notices.filter(n => n.id !== id))
}

// ─── Admin — Teachers ────────────────────────────────────────────────────────

export async function adminGetTeachers(): Promise<Teacher[]> {
  // BACKEND SWAP: GET /api/v1/admin/teachers
  return getTeachers()
}

export async function adminApproveTeacher(id: string): Promise<Teacher> {
  // BACKEND SWAP: PATCH /api/v1/admin/teachers/:id/approve
  const teachers = getTeachers()
  const idx = teachers.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Teacher not found.')
  teachers[idx] = { ...teachers[idx], status: 'approved' }
  saveTeachers(teachers)
  return teachers[idx]
}

export async function adminRejectTeacher(id: string): Promise<Teacher> {
  // BACKEND SWAP: PATCH /api/v1/admin/teachers/:id/reject
  const teachers = getTeachers()
  const idx = teachers.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Teacher not found.')
  teachers[idx] = { ...teachers[idx], status: 'suspended' }
  saveTeachers(teachers)
  return teachers[idx]
}

export async function adminReinstateTeacher(id: string): Promise<Teacher> {
  // BACKEND SWAP: PATCH /api/v1/admin/teachers/:id/reinstate
  const teachers = getTeachers()
  const idx = teachers.findIndex(t => t.id === id)
  if (idx === -1) throw new Error('Teacher not found.')
  teachers[idx] = { ...teachers[idx], status: 'approved' }
  saveTeachers(teachers)
  return teachers[idx]
}

// ─── Admin — Editors ──────────────────────────────────────────────────────────

export async function adminGetEditors(): Promise<Editor[]> {
  // BACKEND SWAP: GET /api/v1/admin/editors
  return getEditors()
}

export async function adminCreateEditor(payload: CreateEditorPayload): Promise<Editor> {
  // BACKEND SWAP: POST /api/v1/admin/editors
  // Backend creates Supabase user with editor role, no email confirmation required
  const editors = getEditors()
  const emailExists = editors.some(e => e.email.toLowerCase() === payload.email.toLowerCase())
  if (emailExists) throw new Error('An editor with this email already exists.')

  const newEditor: Editor = {
    id: `editor-${Date.now()}`,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    createdByAdminId: 'admin-001',
  }

  saveEditors([...editors, newEditor])
  setEditorPassword(newEditor.id, payload.password)
  return newEditor
}

// ─── Admin — Products ─────────────────────────────────────────────────────────

export async function adminGetProducts(): Promise<Product[]> {
  // BACKEND SWAP: GET /api/v1/admin/products
  return getProducts()
}

export async function adminCreateProduct(payload: CreateProductPayload): Promise<Product> {
  // BACKEND SWAP: POST /api/v1/admin/products
  const products = getProducts()
  const newProduct: Product = {
    id: `product-${Date.now()}`,
    name: payload.name.trim(),
    description: payload.description.trim(),
    upfrontPrice: payload.upfrontPrice,
    installmentAmount: payload.installmentAmount,
    installmentMonths: payload.installmentMonths,
    isActive: payload.isActive,
    classIds: [],
    createdAt: new Date().toISOString(),
  }
  saveProducts([...products, newProduct])
  return newProduct
}

export async function adminUpdateProduct(id: string, payload: Partial<CreateProductPayload>): Promise<Product> {
  // BACKEND SWAP: PATCH /api/v1/admin/products/:id
  const products = getProducts()
  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) throw new Error('Product not found.')
  products[idx] = { ...products[idx], ...payload }
  saveProducts(products)
  return products[idx]
}

export async function adminDeleteProduct(id: string): Promise<void> {
  // BACKEND SWAP: DELETE /api/v1/admin/products/:id
  const products = getProducts()
  const product = products.find(p => p.id === id)
  if (!product) throw new Error('Product not found.')
  const classes = getClasses()
  const hasEnrollments = product.classIds.some(classId => {
    const cls = classes.find(c => c.id === classId)
    return cls && cls.enrolledStudentIds.length > 0
  })
  if (hasEnrollments) throw new Error('Cannot delete a product with enrolled students.')
  saveProducts(products.filter(p => p.id !== id))
}

// ─── Admin — Sessions (platform-wide) ─────────────────────────────────────────

export async function adminGetAllSessions(): Promise<SessionWithClass[]> {
  // BACKEND SWAP: GET /api/v1/admin/sessions
  const sessions = getSessions()
  const classes = getClasses()
  const products = getProducts()
  const teachers = getTeachers()

  return sessions
    .map(s => {
      const cls = classes.find(c => c.id === s.classId)
      const product = cls ? products.find(p => p.id === cls.productId) : undefined
      const teacher = cls ? teachers.find(t => t.id === cls.teacherId) : undefined
      return {
        ...s,
        className: cls?.name ?? 'Unknown Class',
        teacherName: teacher?.name ?? 'Unknown Teacher',
        productName: product?.name ?? 'Unknown Product',
      }
    })
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
}

export async function adminUpdateSession(id: string, payload: UpdateSessionPayload): Promise<LmsSession> {
  // BACKEND SWAP: PATCH /api/v1/admin/sessions/:id
  return updateSession(id, payload)
}

export async function adminCancelSession(id: string): Promise<void> {
  // BACKEND SWAP: PATCH /api/v1/admin/sessions/:id/cancel
  return cancelSession(id)
}

// ─── Admin — Demo overrides ───────────────────────────────────────────────────

export async function adminGetDemoOverrides(): Promise<DemoOverride[]> {
  // BACKEND SWAP: GET /api/v1/admin/demo-overrides
  return getDemoOverrides()
}

export async function adminSetDemoOverride(
  studentId: string,
  studentName: string,
  studentEmail: string,
  action: { type: 'extend'; days: number } | { type: 'full_access' } | { type: 'reset' },
): Promise<DemoOverride> {
  // BACKEND SWAP: PATCH /api/v1/admin/students/:id/demo-override
  const overrides = getDemoOverrides()
  const idx = overrides.findIndex(o => o.studentId === studentId)

  let demoExpiresAt: string | null
  if (action.type === 'full_access') {
    demoExpiresAt = null
  } else if (action.type === 'reset') {
    demoExpiresAt = new Date().toISOString()
  } else {
    const base = new Date()
    base.setDate(base.getDate() + action.days)
    demoExpiresAt = base.toISOString()
  }

  const override: DemoOverride = {
    studentId,
    studentName,
    studentEmail,
    demoExpiresAt,
    overriddenByAdminId: 'admin-001',
    overriddenAt: new Date().toISOString(),
  }

  if (idx === -1) {
    saveDemoOverrides([...overrides, override])
  } else {
    overrides[idx] = override
    saveDemoOverrides(overrides)
  }

  return override
}

// ─── Student ──────────────────────────────────────────────────────────────────

export async function studentGetEnrolledClasses(_studentId: string): Promise<ClassWithProduct[]> {
  // BACKEND SWAP: GET /api/v1/student/classes
  // Mock: return all classes (real backend filters by enrollment)
  const classes = getClasses()
  const products = getProducts()
  const sessions = getSessions()
  const teachers = getTeachers()

  return classes.map(c => {
    const product = products.find(p => p.id === c.productId)
    const teacher = teachers.find(t => t.id === c.teacherId)
    const upcoming = sessions
      .filter(s => s.classId === c.id && (s.status === 'scheduled' || s.status === 'live'))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    return {
      ...c,
      productName: product?.name ?? 'Unknown Product',
      teacherName: teacher?.name ?? 'Unknown Teacher',
      nextSession: upcoming[0],
    }
  })
}

export async function studentGetSessionsForClass(classId: string): Promise<LmsSession[]> {
  // BACKEND SWAP: GET /api/v1/student/classes/:classId/sessions
  return getTeacherSessions(classId)
}

// ─── Shared utils ─────────────────────────────────────────────────────────────

export function generateMeetingLink(classId: string): string {
  // BACKEND SWAP: backend generates real Zoom meeting URLs
  return `https://zoom.us/j/nextgen-${classId}-${Date.now()}`
}

export async function getClassById(classId: string): Promise<LmsClass | null> {
  // BACKEND SWAP: GET /api/v1/classes/:classId
  const classes = getClasses()
  return classes.find(c => c.id === classId) ?? null
}

export async function getAllClassesWithProducts(): Promise<ClassWithProduct[]> {
  // BACKEND SWAP: GET /api/v1/admin/classes
  const classes = getClasses()
  const products = getProducts()
  const teachers = getTeachers()
  const sessions = getSessions()

  return classes.map(c => {
    const product = products.find(p => p.id === c.productId)
    const teacher = teachers.find(t => t.id === c.teacherId)
    const upcoming = sessions
      .filter(s => s.classId === c.id && (s.status === 'scheduled' || s.status === 'live'))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    return {
      ...c,
      productName: product?.name ?? 'Unknown Product',
      teacherName: teacher?.name ?? 'Unknown Teacher',
      nextSession: upcoming[0],
    }
  })
}
