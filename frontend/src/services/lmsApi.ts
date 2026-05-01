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
  getClasses, saveClasses,
  getSessions, saveSessions,
  getNotices, saveNotices,
  getDemoOverrides, saveDemoOverrides,
  getChatMessages, saveChatMessages,
  getCoupons, saveCoupons,
  getLmsNotifications, saveLmsNotifications,
  getEnrollments, saveEnrollments,
  getNotificationPrefs as _getNotificationPrefs,
  saveNotificationPrefs as _saveNotificationPrefs,
} from '../data/lms'

import type {
  Teacher, Editor, Product, LmsClass, LmsSession, Notice, DemoOverride,
  RegisterTeacherPayload, CreateEditorPayload, CreateProductPayload,
  CreateSessionPayload, UpdateSessionPayload, CreateNoticePayload,
  SessionWithClass, ClassWithProduct,
  ChatMessage, AttendanceRecord, RecordedSession, Coupon,
  NotificationPrefs, LmsNotification, TeacherAnalytics, SessionAnalytics,
  CreateCouponPayload, CreateClassPayload, EnrollStudentPayload, StudentEnrollment,
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
    profilePicture: payload.profilePicture,
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

export interface ProgramListing {
  product: Product
  teacherName: string
  teacherId: string
  classId: string
  sessionCount: number
  enrolledCount: number
}

export async function getAvailablePrograms(): Promise<ProgramListing[]> {
  // BACKEND SWAP: GET /api/v1/programs
  const products = getProducts().filter(p => p.isActive)
  const classes = getClasses()
  const teachers = getTeachers()
  const sessions = getSessions()

  return products.map(product => {
    const cls = classes.find(c => c.productId === product.id)
    const teacher = cls ? teachers.find(t => t.id === cls.teacherId) : undefined
    const sessionCount = cls ? sessions.filter(s => s.classId === cls.id && s.status !== 'cancelled').length : 0
    return {
      product,
      teacherName: teacher?.name ?? 'TBA',
      teacherId: teacher?.id ?? '',
      classId: cls?.id ?? '',
      sessionCount,
      enrolledCount: cls?.enrolledStudentIds.length ?? 0,
    }
  })
}

export async function studentGetEnrolledClasses(studentId: string): Promise<ClassWithProduct[]> {
  // BACKEND SWAP: GET /api/v1/student/classes
  // In the mock layer, real auth user IDs won't match mock student IDs (student-mock-XXX).
  // Fall back to student-mock-001 so demo enrollments are visible to the logged-in user.
  const DEMO_FALLBACK_ID = 'student-mock-001'
  const allClasses = getClasses()
  const directMatches = allClasses.filter(c => c.enrolledStudentIds.includes(studentId))
  const classes = directMatches.length > 0
    ? directMatches
    : allClasses.filter(c => c.enrolledStudentIds.includes(DEMO_FALLBACK_ID))
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
      teacherPhoto: teacher?.profilePicture,
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

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function getGroupChatMessages(classId: string): Promise<ChatMessage[]> {
  // BACKEND SWAP: GET /api/v1/chat/group?classId=
  const messages = getChatMessages()
  return messages
    .filter(m => m.classId === classId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
}

export async function sendGroupChatMessage(
  classId: string,
  senderId: string,
  senderName: string,
  senderRole: 'student' | 'teacher',
  text: string,
): Promise<ChatMessage> {
  // BACKEND SWAP: POST /api/v1/chat/group
  const messages = getChatMessages()
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    classId,
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    sentAt: new Date().toISOString(),
  }
  saveChatMessages([...messages, newMsg])
  return newMsg
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  // BACKEND SWAP: DELETE /api/v1/chat/messages/:id (admin only)
  const messages = getChatMessages()
  saveChatMessages(messages.filter(m => m.id !== messageId))
}

// Legacy aliases — kept so existing imports don't break during transition
export const getChatMessagesForClass = getGroupChatMessages.bind(null)
export const getAllChatThreads = getGroupChatMessages.bind(null)
export async function sendChatMessage(classId: string, _studentId: string, senderRole: 'student' | 'teacher', text: string): Promise<ChatMessage> {
  return sendGroupChatMessage(classId, _studentId, senderRole === 'teacher' ? 'Teacher' : 'Student', senderRole, text)
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceForClass(classId: string, studentId: string): Promise<AttendanceRecord[]> {
  // BACKEND SWAP: GET /api/v1/student/classes/:classId/attendance
  // Mock: deterministic random based on student+session id
  const sessions = getSessions()
  const completed = sessions.filter(s => s.classId === classId && s.status === 'completed')

  return completed.map(s => {
    const seed = (studentId + s.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const status: AttendanceRecord['status'] = seed % 5 === 0 ? 'missed' : 'attended'
    return {
      sessionId: s.id,
      classId: s.classId,
      scheduledAt: s.scheduledAt,
      durationMinutes: s.durationMinutes,
      status,
    }
  }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export async function getRecordingsForClass(classId: string): Promise<RecordedSession[]> {
  // BACKEND SWAP: GET /api/v1/student/classes/:classId/recordings
  const sessions = getSessions()
  return sessions
    .filter(s => s.classId === classId && s.status === 'completed')
    .map((s, idx) => ({
      sessionId: s.id,
      classId: s.classId,
      scheduledAt: s.scheduledAt,
      durationMinutes: s.durationMinutes,
      recordingUrl: s.recordingUrl ?? null,
      accessLevel: idx === 0 ? ('full' as const) : ('full' as const),
    }))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
}

export async function updateSessionRecording(sessionId: string, url: string): Promise<LmsSession> {
  // BACKEND SWAP: PATCH /api/v1/teacher/sessions/:id/recording
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === sessionId)
  if (idx === -1) throw new Error('Session not found.')
  sessions[idx] = { ...sessions[idx], recordingUrl: url }
  saveSessions(sessions)
  return sessions[idx]
}

export async function removeSessionRecording(sessionId: string): Promise<LmsSession> {
  // BACKEND SWAP: DELETE /api/v1/teacher/sessions/:id/recording
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === sessionId)
  if (idx === -1) throw new Error('Session not found.')
  const updated = { ...sessions[idx] }
  delete updated.recordingUrl
  sessions[idx] = updated
  saveSessions(sessions)
  return sessions[idx]
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getStudentNotificationPrefs(studentId: string): Promise<NotificationPrefs> {
  // BACKEND SWAP: GET /api/v1/student/notification-prefs
  return _getNotificationPrefs(studentId)
}

export async function updateStudentNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  // BACKEND SWAP: PATCH /api/v1/student/notification-prefs
  _saveNotificationPrefs(prefs)
}

export async function getStudentLmsNotifications(_studentId: string): Promise<LmsNotification[]> {
  // BACKEND SWAP: GET /api/v1/student/notifications
  return getLmsNotifications()
}

export async function markLmsNotificationRead(id: string): Promise<void> {
  // BACKEND SWAP: PATCH /api/v1/student/notifications/:id/read
  const notifications = getLmsNotifications()
  const idx = notifications.findIndex(n => n.id === id)
  if (idx !== -1) {
    notifications[idx] = { ...notifications[idx], read: true }
    saveLmsNotifications(notifications)
  }
}

// ─── Coupons / Payments ───────────────────────────────────────────────────────

export async function getAllCoupons(): Promise<Coupon[]> {
  // BACKEND SWAP: GET /api/v1/admin/coupons
  return getCoupons()
}

export async function adminCreateCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  // BACKEND SWAP: POST /api/v1/admin/coupons
  const coupons = getCoupons()
  const existing = coupons.find(c => c.code.toLowerCase() === payload.code.toLowerCase())
  if (existing) throw new Error('Coupon code already exists.')

  const newCoupon: Coupon = {
    id: `coupon-${Date.now()}`,
    code: payload.code.toUpperCase().trim(),
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxUses: payload.maxUses,
    usedCount: 0,
    productId: payload.productId,
    expiresAt: payload.expiresAt,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  saveCoupons([...coupons, newCoupon])
  return newCoupon
}

export async function adminToggleCoupon(id: string, isActive: boolean): Promise<Coupon> {
  // BACKEND SWAP: PATCH /api/v1/admin/coupons/:id
  const coupons = getCoupons()
  const idx = coupons.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Coupon not found.')
  coupons[idx] = { ...coupons[idx], isActive }
  saveCoupons(coupons)
  return coupons[idx]
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  // BACKEND SWAP: DELETE /api/v1/admin/coupons/:id
  saveCoupons(getCoupons().filter(c => c.id !== id))
}

export async function validateCoupon(
  code: string,
  productId: string,
): Promise<{ valid: boolean; discount: number; type: 'percentage' | 'fixed'; message?: string }> {
  // BACKEND SWAP: POST /api/v1/coupons/validate
  const coupons = getCoupons()
  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase().trim())

  if (!coupon) return { valid: false, discount: 0, type: 'percentage', message: 'Invalid coupon code.' }
  if (!coupon.isActive) return { valid: false, discount: 0, type: 'percentage', message: 'This coupon is no longer active.' }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, discount: 0, type: 'percentage', message: 'This coupon has expired.' }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, discount: 0, type: 'percentage', message: 'This coupon has reached its usage limit.' }
  if (coupon.productId && coupon.productId !== productId) return { valid: false, discount: 0, type: 'percentage', message: 'This coupon does not apply to this product.' }

  return { valid: true, discount: coupon.discountValue, type: coupon.discountType }
}

export async function submitCheckout(
  productId: string,
  _plan: 'upfront' | 'installment',
  _couponCode?: string,
  studentId?: string,
): Promise<{ success: boolean; enrollmentId: string }> {
  // BACKEND SWAP: POST /api/v1/payments/checkout (Stripe + enrollment creation)
  await new Promise(r => setTimeout(r, 1500))

  if (studentId) {
    const classes = getClasses()
    const cls = classes.find(c => c.productId === productId)
    if (cls && !cls.enrolledStudentIds.includes(studentId)) {
      const idx = classes.indexOf(cls)
      classes[idx] = { ...cls, enrolledStudentIds: [...cls.enrolledStudentIds, studentId] }
      saveClasses(classes)
    }
  }

  return { success: true, enrollmentId: `enroll-${Date.now()}` }
}

// ─── Admin — Classes & Enrollment ────────────────────────────────────────────

export async function adminGetClasses(): Promise<LmsClass[]> {
  // BACKEND SWAP: GET /api/v1/admin/classes
  return getClasses()
}

export async function adminCreateClass(payload: CreateClassPayload): Promise<LmsClass> {
  // BACKEND SWAP: POST /api/v1/admin/classes
  const classes = getClasses()
  const products = getProducts()

  const newClass: LmsClass = {
    id: `class-${Date.now()}`,
    productId: payload.productId,
    name: payload.name.trim(),
    description: payload.description?.trim() ?? '',
    teacherId: payload.teacherId,
    defaultDurationMinutes: payload.defaultDurationMinutes,
    enrolledStudentIds: [],
  }

  saveClasses([...classes, newClass])

  const pidx = products.findIndex(p => p.id === payload.productId)
  if (pidx !== -1) {
    products[pidx] = { ...products[pidx], classIds: [...products[pidx].classIds, newClass.id] }
    saveProducts(products)
  }

  const teachers = getTeachers()
  const tidx = teachers.findIndex(t => t.id === payload.teacherId)
  if (tidx !== -1) {
    teachers[tidx] = { ...teachers[tidx], assignedClassIds: [...teachers[tidx].assignedClassIds, newClass.id] }
    saveTeachers(teachers)
  }

  return newClass
}

export async function adminUpdateClass(id: string, payload: Partial<CreateClassPayload>): Promise<LmsClass> {
  // BACKEND SWAP: PATCH /api/v1/admin/classes/:id
  const classes = getClasses()
  const idx = classes.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Class not found.')
  classes[idx] = { ...classes[idx], ...payload }
  saveClasses(classes)
  return classes[idx]
}

export async function adminGetEnrollmentsForClass(classId: string): Promise<StudentEnrollment[]> {
  // BACKEND SWAP: GET /api/v1/admin/classes/:classId/enrollments
  return getEnrollments().filter(e => e.classId === classId)
}

export async function adminEnrollStudent(payload: EnrollStudentPayload): Promise<void> {
  // BACKEND SWAP: POST /api/v1/admin/classes/:classId/enroll
  const enrollments = getEnrollments()
  const existing = enrollments.find(e => e.classId === payload.classId && e.studentId === payload.studentId)
  if (existing) throw new Error('Student is already enrolled in this class.')

  const newEnrollment: StudentEnrollment = {
    studentId: payload.studentId,
    classId: payload.classId,
    enrolledAt: new Date().toISOString(),
    demoExpiresAt: payload.demoExpiresAt ?? undefined,
  }
  saveEnrollments([...enrollments, newEnrollment])

  const classes = getClasses()
  const cidx = classes.findIndex(c => c.id === payload.classId)
  if (cidx !== -1 && !classes[cidx].enrolledStudentIds.includes(payload.studentId)) {
    classes[cidx] = { ...classes[cidx], enrolledStudentIds: [...classes[cidx].enrolledStudentIds, payload.studentId] }
    saveClasses(classes)
  }
}

export async function adminRemoveEnrollment(classId: string, studentId: string): Promise<void> {
  // BACKEND SWAP: DELETE /api/v1/admin/classes/:classId/enrollments/:studentId
  saveEnrollments(getEnrollments().filter(e => !(e.classId === classId && e.studentId === studentId)))

  const classes = getClasses()
  const cidx = classes.findIndex(c => c.id === classId)
  if (cidx !== -1) {
    classes[cidx] = { ...classes[cidx], enrolledStudentIds: classes[cidx].enrolledStudentIds.filter(id => id !== studentId) }
    saveClasses(classes)
  }
}

// ─── Teacher Analytics ────────────────────────────────────────────────────────

export async function getTeacherAnalytics(teacherId: string): Promise<TeacherAnalytics> {
  // BACKEND SWAP: GET /api/v1/teacher/analytics
  const classes = getClasses().filter(c => c.teacherId === teacherId)
  const sessions = getSessions()

  const perSession: SessionAnalytics[] = []

  for (const cls of classes) {
    const completed = sessions.filter(s => s.classId === cls.id && s.status === 'completed')
    for (const s of completed) {
      const attendanceCount = s.attendanceCount ?? null
      const attendancePercent =
        attendanceCount !== null && cls.enrolledStudentIds.length > 0
          ? Math.round((attendanceCount / cls.enrolledStudentIds.length) * 100)
          : null
      perSession.push({
        sessionId: s.id,
        scheduledAt: s.scheduledAt,
        scheduledDuration: s.durationMinutes,
        actualDuration: s.actualDurationMinutes ?? null,
        attendanceCount,
        attendancePercent,
      })
    }
  }

  const totalStudents = new Set(classes.flatMap(c => c.enrolledStudentIds)).size
  const attendanceRates = perSession.filter(s => s.attendancePercent !== null).map(s => s.attendancePercent!)
  const avgAttendanceRate = attendanceRates.length > 0
    ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length)
    : 0

  const durations = perSession.filter(s => s.actualDuration !== null).map(s => s.actualDuration!)
  const avgActualDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  return {
    teacherId,
    totalSessionsCompleted: perSession.length,
    avgAttendanceRate,
    avgActualDuration,
    totalStudentsTaught: totalStudents,
    perSession: perSession.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
  }
}
