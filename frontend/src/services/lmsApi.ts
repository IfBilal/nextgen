/**
 * LMS API service — all LMS data access goes through here.
 * Calls the real Express/Supabase backend via apiRequest().
 * Function signatures and return types are preserved from the mock layer.
 */

import { apiRequest } from './httpClient'

import type {
  Teacher, Editor, Product, LmsClass, LmsSession, Notice, DemoOverride,
  RegisterTeacherPayload, CreateEditorPayload, CreateProductPayload,
  CreateSessionPayload, UpdateSessionPayload, CreateNoticePayload,
  SessionWithClass, ClassWithProduct,
  ChatMessage, AttendanceRecord, RecordedSession, Coupon,
  NotificationPrefs, LmsNotification, TeacherAnalytics,
  CreateCouponPayload, CreateClassPayload, EnrollStudentPayload, StudentEnrollment,
  LmsOrder, TeacherStudentSummary, StudentOrder,
} from '../types/lms'

// ─── Token helpers ────────────────────────────────────────────────────────────
interface StoredSession { accessToken: string; refreshToken: string; expiresAt: number }

function getTokenFor(lsKey: string): string {
  try {
    const raw = localStorage.getItem(lsKey)
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { session?: StoredSession }
    return parsed?.session?.accessToken ?? ''
  } catch { return '' }
}

function getRefreshTokenFor(lsKey: string): string {
  try {
    const raw = localStorage.getItem(lsKey)
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { session?: StoredSession }
    return parsed?.session?.refreshToken ?? ''
  } catch { return '' }
}

function decodeJwtExp(token: string): number {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp ?? 0
  } catch { return 0 }
}

export function isSessionExpired(lsKey: string): boolean {
  try {
    const raw = localStorage.getItem(lsKey)
    if (!raw) return true
    const parsed = JSON.parse(raw) as { session?: { accessToken?: string; expiresAt?: number } }
    const token = parsed?.session?.accessToken
    if (!token) return true
    const exp = decodeJwtExp(token)
    return exp === 0 || Date.now() / 1000 > exp - 60
  } catch { return true }
}

export function storeSession(lsKey: string, accessToken: string, refreshToken: string, expiresIn: number) {
  try {
    const raw = localStorage.getItem(lsKey)
    const existing = raw ? JSON.parse(raw) : {}
    const session: StoredSession = { accessToken, refreshToken, expiresAt: Math.floor(Date.now() / 1000) + expiresIn }
    localStorage.setItem(lsKey, JSON.stringify({ ...existing, session }))
  } catch { /* ignore */ }
}

export async function refreshSession(lsKey: string): Promise<string | null> {
  const refreshToken = getRefreshTokenFor(lsKey)
  if (!refreshToken) return null
  try {
    const res = await apiRequest<{ session: { access_token: string; refresh_token: string; expires_in: number } }>(
      '/auth/refresh',
      { method: 'POST', body: { refreshToken } },
    )
    storeSession(lsKey, res.session.access_token, res.session.refresh_token, res.session.expires_in)
    return res.session.access_token
  } catch { return null }
}

const getStudentToken  = () => getTokenFor('nextgen.student.auth')
const getAdminToken    = () => getTokenFor('nextgen.admin.auth')
const getTeacherToken  = () => getTokenFor('nextgen.teacher.auth')
export const getEditorToken   = () => getTokenFor('nextgen.editor.auth')

function bearer(token: string): { headers: Record<string, string> } {
  return { headers: { Authorization: `Bearer ${token}` } }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TeacherLoginResponse {
  teacher: Teacher
  accessToken: string
}

export async function registerTeacher(payload: RegisterTeacherPayload): Promise<TeacherLoginResponse> {
  const res = await apiRequest<{ teacher: Teacher }>('/auth/teacher/register', {
    method: 'POST',
    body: { name: payload.name, email: payload.email, password: payload.password, phone: payload.phone, bio: payload.bio },
  })
  return { teacher: res.teacher, accessToken: '' }
}

export async function loginTeacher(email: string, password: string): Promise<TeacherLoginResponse> {
  const res = await apiRequest<{ teacher: Teacher; session: { access_token: string; refresh_token: string; expires_in: number } }>(
    '/auth/teacher/login',
    { method: 'POST', body: { email, password } },
  )
  storeSession('nextgen.teacher.auth', res.session.access_token, res.session.refresh_token, res.session.expires_in)
  return { teacher: res.teacher, accessToken: res.session.access_token }
}

export interface EditorLoginResponse {
  editor: Editor
  accessToken: string
}

export async function loginEditor(email: string, password: string): Promise<EditorLoginResponse> {
  const res = await apiRequest<{ editor: Editor; session: { access_token: string; refresh_token: string; expires_in: number } }>(
    '/auth/editor/login',
    { method: 'POST', body: { email, password } },
  )
  storeSession('nextgen.editor.auth', res.session.access_token, res.session.refresh_token, res.session.expires_in)
  return { editor: res.editor, accessToken: res.session.access_token }
}

// ─── Teacher queries ──────────────────────────────────────────────────────────

export async function getTeacherById(id: string): Promise<Teacher | null> {
  // No dedicated GET /teacher/:id endpoint — read from stored auth data
  try {
    const raw = localStorage.getItem('nextgen.teacher.auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { teacher?: Teacher }
    if (parsed?.teacher?.id === id) return parsed.teacher
  } catch { /* ignore */ }
  return null
}

export async function getTeacherClasses(_teacherId: string): Promise<ClassWithProduct[]> {
  // GET /api/v1/teacher/classes
  const res = await apiRequest<{ classes: (ClassWithProduct & { enrolledStudentCount?: number })[] }>(
    '/teacher/classes',
    bearer(getTeacherToken()),
  )
  return res.classes.map(c => ({
    ...c,
    enrolledStudentIds: [],
  }))
}

export async function getTeacherSessions(classId: string): Promise<LmsSession[]> {
  // GET /api/v1/teacher/classes/:classId/sessions
  const res = await apiRequest<{ sessions: LmsSession[] }>(
    `/teacher/classes/${classId}/sessions`,
    bearer(getTeacherToken()),
  )
  return res.sessions
}

export async function createSession(payload: CreateSessionPayload): Promise<LmsSession> {
  // POST /api/v1/teacher/sessions
  const res = await apiRequest<{ session: LmsSession }>('/teacher/sessions', {
    method: 'POST',
    body: {
      classId: payload.classId,
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
    },
    ...bearer(getTeacherToken()),
  })
  return res.session
}

export async function updateSession(id: string, payload: UpdateSessionPayload): Promise<LmsSession> {
  // PATCH /api/v1/teacher/sessions/:id
  const res = await apiRequest<{ session: LmsSession }>(`/teacher/sessions/${id}`, {
    method: 'PATCH',
    body: {
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
      changeNote: payload.changeNote,
    },
    ...bearer(getTeacherToken()),
  })
  return res.session
}

export async function startSession(id: string): Promise<LmsSession> {
  // POST /api/v1/teacher/sessions/:id/start
  const res = await apiRequest<{ session: LmsSession }>(`/teacher/sessions/${id}/start`, {
    method: 'POST',
    ...bearer(getTeacherToken()),
  })
  return res.session
}

export async function endSession(id: string): Promise<LmsSession> {
  // POST /api/v1/teacher/sessions/:id/end
  const res = await apiRequest<{ session: LmsSession }>(`/teacher/sessions/${id}/end`, {
    method: 'POST',
    ...bearer(getTeacherToken()),
  })
  return res.session
}

export async function cancelSession(id: string, reason?: string): Promise<void> {
  // PATCH /api/v1/teacher/sessions/:id/cancel
  await apiRequest(`/teacher/sessions/${id}/cancel`, {
    method: 'PATCH',
    body: { reason: reason ?? 'Cancelled by teacher.' },
    ...bearer(getTeacherToken()),
  })
}

export async function markSessionMissed(id: string, reason: string): Promise<LmsSession> {
  // PATCH /api/v1/teacher/sessions/:id/missed
  const res = await apiRequest<{ session: LmsSession }>(`/teacher/sessions/${id}/missed`, {
    method: 'PATCH',
    body: { reason },
    ...bearer(getTeacherToken()),
  })
  return res.session
}

// ─── Notice board ─────────────────────────────────────────────────────────────

export async function getNoticesForClass(classId: string): Promise<Notice[]> {
  // GET /api/v1/teacher/classes/:classId/notices  (teacher)
  // or GET /api/v1/student/classes/:classId/notices (student)
  const teacherToken = getTeacherToken()
  if (teacherToken) {
    const res = await apiRequest<{ notices: Notice[] }>(
      `/teacher/classes/${classId}/notices`,
      bearer(teacherToken),
    )
    return res.notices
  }
  const res = await apiRequest<{ notices: Notice[] }>(
    `/student/classes/${classId}/notices`,
    bearer(getStudentToken()),
  )
  return res.notices
}

export async function createNotice(_teacherId: string, payload: CreateNoticePayload): Promise<Notice> {
  // POST /api/v1/teacher/notices
  const res = await apiRequest<{ notice: Notice }>('/teacher/notices', {
    method: 'POST',
    body: {
      classId: payload.classId,
      title: payload.title,
      content: payload.content,
      type: payload.type,
      fileName: payload.fileName,
    },
    ...bearer(getTeacherToken()),
  })
  return res.notice
}

export async function deleteNotice(id: string): Promise<void> {
  // DELETE /api/v1/teacher/notices/:id
  await apiRequest(`/teacher/notices/${id}`, {
    method: 'DELETE',
    ...bearer(getTeacherToken()),
  })
}

// ─── Admin — Teachers ─────────────────────────────────────────────────────────

export interface StudentSummary {
  id: string
  name: string
  email: string
  phone: string
  registeredAt: string
  enrollments: { classId: string; className: string; enrolledAt: string; demoExpiresAt: string | null }[]
}

export interface EnrollmentOverview {
  classId: string
  productId: string
  accessType: 'full' | 'demo_active' | 'demo_expired'
  demoExpiresAt: string | null
  enrolledAt: string
}

export async function adminGetStudents(): Promise<StudentSummary[]> {
  const res = await apiRequest<{ students: StudentSummary[] }>('/admin/students', bearer(getAdminToken()))
  return res.students
}

export async function adminGetTeachers(): Promise<Teacher[]> {
  // GET /api/v1/admin/teachers
  const res = await apiRequest<{ teachers: Teacher[] }>('/admin/teachers', bearer(getAdminToken()))
  return res.teachers
}

export async function adminApproveTeacher(id: string): Promise<Teacher> {
  // PATCH /api/v1/admin/teachers/:id/approve
  await apiRequest(`/admin/teachers/${id}/approve`, { method: 'PATCH', ...bearer(getAdminToken()) })
  return (await adminGetTeachers()).find(t => t.id === id) ?? { id } as Teacher
}

export async function adminRejectTeacher(id: string): Promise<Teacher> {
  // PATCH /api/v1/admin/teachers/:id/reject
  await apiRequest(`/admin/teachers/${id}/reject`, { method: 'PATCH', ...bearer(getAdminToken()) })
  return (await adminGetTeachers()).find(t => t.id === id) ?? { id } as Teacher
}

export async function adminReinstateTeacher(id: string): Promise<Teacher> {
  // PATCH /api/v1/admin/teachers/:id/reinstate
  await apiRequest(`/admin/teachers/${id}/reinstate`, { method: 'PATCH', ...bearer(getAdminToken()) })
  return (await adminGetTeachers()).find(t => t.id === id) ?? { id } as Teacher
}

// ─── Admin — Editors ──────────────────────────────────────────────────────────

export async function adminGetEditors(): Promise<Editor[]> {
  // GET /api/v1/admin/editors
  const res = await apiRequest<{ editors: Editor[] }>('/admin/editors', bearer(getAdminToken()))
  return res.editors
}

export async function adminCreateEditor(payload: CreateEditorPayload): Promise<Editor> {
  // POST /api/v1/admin/editors
  const res = await apiRequest<{ editor: Editor }>('/admin/editors', {
    method: 'POST',
    body: { name: payload.name, email: payload.email, password: payload.password },
    ...bearer(getAdminToken()),
  })
  return res.editor
}

export async function adminDeleteEditor(id: string): Promise<void> {
  // DELETE /api/v1/admin/editors/:id
  await apiRequest<{ success: boolean }>(`/admin/editors/${id}`, {
    method: 'DELETE',
    ...bearer(getAdminToken()),
  })
}

// ─── Admin — Products ─────────────────────────────────────────────────────────

export async function adminGetProducts(): Promise<Product[]> {
  // GET /api/v1/admin/products
  const res = await apiRequest<{ products: Product[] }>('/admin/products', bearer(getAdminToken()))
  return res.products
}

export async function adminCreateProduct(payload: CreateProductPayload): Promise<Product> {
  // POST /api/v1/admin/products
  const res = await apiRequest<{ product: Product }>('/admin/products', {
    method: 'POST',
    body: payload,
    ...bearer(getAdminToken()),
  })
  return res.product
}

export async function adminUpdateProduct(id: string, payload: Partial<CreateProductPayload>): Promise<Product> {
  // PATCH /api/v1/admin/products/:id
  const res = await apiRequest<{ product: Product }>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: payload,
    ...bearer(getAdminToken()),
  })
  return res.product
}

export async function adminDeleteProduct(id: string): Promise<void> {
  // DELETE /api/v1/admin/products/:id
  await apiRequest(`/admin/products/${id}`, { method: 'DELETE', ...bearer(getAdminToken()) })
}

// ─── Admin — Sessions (platform-wide) ─────────────────────────────────────────

export async function adminGetAllSessions(): Promise<SessionWithClass[]> {
  // GET /api/v1/admin/sessions
  const res = await apiRequest<{ sessions: SessionWithClass[] }>('/admin/sessions', bearer(getAdminToken()))
  return res.sessions
}

export async function adminUpdateSession(id: string, payload: UpdateSessionPayload): Promise<LmsSession> {
  // PATCH /api/v1/admin/sessions/:id
  const res = await apiRequest<{ session: LmsSession }>(`/admin/sessions/${id}`, {
    method: 'PATCH',
    body: {
      scheduledAt: payload.scheduledAt,
      durationMinutes: payload.durationMinutes,
      changeNote: payload.changeNote,
    },
    ...bearer(getAdminToken()),
  })
  return res.session
}

export async function adminRegenerateZoom(id: string): Promise<{ joinUrl: string; startUrl: string }> {
  // POST /api/v1/admin/sessions/:id/regenerate-zoom
  const res = await apiRequest<{ joinUrl: string; startUrl: string }>(`/admin/sessions/${id}/regenerate-zoom`, {
    method: 'POST',
    ...bearer(getAdminToken()),
  })
  return res
}

export async function adminCancelSession(id: string): Promise<void> {
  // PATCH /api/v1/admin/sessions/:id/cancel
  await apiRequest(`/admin/sessions/${id}/cancel`, { method: 'PATCH', ...bearer(getAdminToken()) })
}

// ─── Editor queries ───────────────────────────────────────────────────────────

export async function editorGetTeachers(): Promise<Teacher[]> {
  const res = await apiRequest<{ teachers: Teacher[] }>('/editor/teachers', bearer(getEditorToken()))
  return res.teachers
}

export async function editorApproveTeacher(id: string): Promise<void> {
  await apiRequest(`/editor/teachers/${id}/approve`, { method: 'PATCH', ...bearer(getEditorToken()) })
}

export async function editorRejectTeacher(id: string): Promise<void> {
  await apiRequest(`/editor/teachers/${id}/reject`, { method: 'PATCH', ...bearer(getEditorToken()) })
}

export async function editorGetProducts(): Promise<Product[]> {
  const res = await apiRequest<{ products: Product[] }>('/editor/products', bearer(getEditorToken()))
  return res.products
}

export async function editorGetSessions(): Promise<SessionWithClass[]> {
  const res = await apiRequest<{ sessions: SessionWithClass[] }>('/editor/sessions', bearer(getEditorToken()))
  return res.sessions
}

export async function editorUpdateSession(id: string, payload: UpdateSessionPayload): Promise<LmsSession> {
  const res = await apiRequest<{ session: LmsSession }>(`/editor/sessions/${id}`, {
    method: 'PATCH', body: payload, ...bearer(getEditorToken()),
  })
  return res.session
}

export async function editorCancelSession(id: string): Promise<void> {
  await apiRequest(`/editor/sessions/${id}/cancel`, { method: 'PATCH', ...bearer(getEditorToken()) })
}

export async function editorGetClassesWithProducts(): Promise<ClassWithProduct[]> {
  const res = await apiRequest<{ classes: ClassWithProduct[] }>('/editor/classes', bearer(getEditorToken()))
  return res.classes
}

export async function editorGetChatMessages(classId: string): Promise<ChatMessage[]> {
  const res = await apiRequest<{ messages: ChatMessage[] }>(
    `/editor/chat?classId=${encodeURIComponent(classId)}`,
    bearer(getEditorToken()),
  )
  return res.messages
}

// ─── Community ────────────────────────────────────────────────────────────────

export interface CommunityMessage {
  id: string
  authorId: string
  authorName: string
  authorRole: 'student' | 'admin'
  text: string
  createdAt: string
}

export type CommunityMode = 'open' | 'readonly'

function getCommunityToken(): string {
  return getStudentToken() || getAdminToken()
}

export async function communityGetSettings(): Promise<CommunityMode> {
  const res = await apiRequest<{ mode: CommunityMode }>('/community/settings', bearer(getCommunityToken()))
  return res.mode
}

export async function communityGetMessages(): Promise<CommunityMessage[]> {
  const res = await apiRequest<{ messages: CommunityMessage[] }>('/community/messages', bearer(getCommunityToken()))
  return res.messages
}

export async function communityPostMessage(text: string): Promise<CommunityMessage> {
  const res = await apiRequest<{ message: CommunityMessage }>('/community/messages', {
    method: 'POST',
    body: { text },
    ...bearer(getCommunityToken()),
  })
  return res.message
}

export async function adminPostCommunityMessage(text: string): Promise<CommunityMessage> {
  const res = await apiRequest<{ message: CommunityMessage }>('/community/messages', {
    method: 'POST',
    body: { text },
    ...bearer(getAdminToken()),
  })
  return res.message
}

export async function adminDeleteCommunityMessage(id: string): Promise<void> {
  await apiRequest(`/community/messages/${id}`, { method: 'DELETE', ...bearer(getAdminToken()) })
}

export async function adminUpdateCommunityMode(mode: CommunityMode): Promise<void> {
  await apiRequest('/community/settings', { method: 'PUT', body: { mode }, ...bearer(getAdminToken()) })
}

export async function adminCommunityGetMessages(): Promise<CommunityMessage[]> {
  const res = await apiRequest<{ messages: CommunityMessage[] }>('/community/messages', bearer(getAdminToken()))
  return res.messages
}

export async function adminCommunityGetSettings(): Promise<CommunityMode> {
  const res = await apiRequest<{ mode: CommunityMode }>('/community/settings', bearer(getAdminToken()))
  return res.mode
}

// ─── Admin — Demo overrides ───────────────────────────────────────────────────

export async function adminGetDemoOverrides(): Promise<DemoOverride[]> {
  // GET /api/v1/admin/demo-overrides
  const res = await apiRequest<{ overrides: DemoOverride[] }>('/admin/demo-overrides', bearer(getAdminToken()))
  return res.overrides
}

export async function adminSetDemoOverride(
  studentId: string,
  _studentName: string,
  _studentEmail: string,
  action: { type: 'extend'; days: number } | { type: 'full_access' } | { type: 'reset' },
): Promise<DemoOverride> {
  // PATCH /api/v1/admin/students/:id/demo-override
  const res = await apiRequest<{ override: DemoOverride }>(`/admin/students/${studentId}/demo-override`, {
    method: 'PATCH',
    body: action,
    ...bearer(getAdminToken()),
  })
  return res.override
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
  // GET /api/v1/programs
  const res = await apiRequest<{ programs: ProgramListing[] }>('/programs')
  return res.programs
}

export interface ProgramDetail {
  productId: string
  name: string
  description: string
  upfrontPrice: number
  installmentAmount: number
  installmentMonths: number
  teacherName: string
  teacherId: string | null
  teacherBio: string
  classId: string | null
  sessions: { id: string; scheduledAt: string; durationMinutes: number; status: string }[]
  enrolledCount: number
  sessionCount: number
}

export async function getProgramById(productId: string): Promise<ProgramDetail | null> {
  // GET /api/v1/programs/:productId
  try {
    const res = await apiRequest<{ program: ProgramDetail }>(`/programs/${productId}`)
    return res.program
  } catch { return null }
}

export interface ClassOption {
  classId: string
  name: string
  description: string
  teacherName: string
  enrolledCount: number
}

export async function getClassesForProduct(productId: string): Promise<ClassOption[]> {
  try {
    const res = await apiRequest<{ classes: ClassOption[] }>(`/programs/${productId}/classes`)
    return res.classes
  } catch { return [] }
}

export async function studentGetEnrolledClasses(_studentId: string): Promise<ClassWithProduct[]> {
  // GET /api/v1/student/classes
  const res = await apiRequest<{ classes: (ClassWithProduct & { enrolledAt?: string; demoExpiresAt?: string })[] }>(
    '/student/classes',
    bearer(getStudentToken()),
  )
  return res.classes.map(c => ({
    ...c,
    enrolledStudentIds: [],
  }))
}

export async function studentGetSessionsForClass(classId: string): Promise<LmsSession[]> {
  // GET /api/v1/student/classes/:classId/sessions
  const res = await apiRequest<{ sessions: LmsSession[] }>(
    `/student/classes/${classId}/sessions`,
    bearer(getStudentToken()),
  )
  return res.sessions
}

export async function studentJoinSession(sessionId: string): Promise<string | null> {
  // POST /api/v1/student/sessions/:sessionId/join — marks attendance and returns join URL
  try {
    const res = await apiRequest<{ joinUrl: string }>(
      `/student/sessions/${sessionId}/join`,
      { method: 'POST', ...bearer(getStudentToken()) },
    )
    return res.joinUrl
  } catch { return null }
}

// ─── Shared utils ─────────────────────────────────────────────────────────────

export function generateMeetingLink(_classId: string): string {
  return ''
}

export async function getClassById(classId: string): Promise<LmsClass | null> {
  // GET /api/v1/teacher/classes/:classId
  try {
    const res = await apiRequest<{ class: LmsClass }>(`/teacher/classes/${classId}`, bearer(getTeacherToken()))
    return { ...res.class, enrolledStudentIds: [] }
  } catch { return null }
}

export async function studentGetClassById(classId: string): Promise<LmsClass | null> {
  // GET /api/v1/student/classes/:classId
  try {
    const res = await apiRequest<{ class: LmsClass }>(`/student/classes/${classId}`, bearer(getStudentToken()))
    return { ...res.class, enrolledStudentIds: [] }
  } catch { return null }
}

export async function getAllClassesWithProducts(): Promise<ClassWithProduct[]> {
  // GET /api/v1/admin/classes
  const res = await apiRequest<{ classes: ClassWithProduct[] }>('/admin/classes', bearer(getAdminToken()))
  return res.classes
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function getGroupChatMessages(classId: string, role: 'teacher' | 'student' | 'admin' = 'teacher'): Promise<ChatMessage[]> {
  const token = role === 'student' ? getStudentToken() : role === 'admin' ? getAdminToken() : getTeacherToken()
  const res = await apiRequest<{ messages: ChatMessage[] }>(
    `/chat/group?classId=${encodeURIComponent(classId)}`,
    bearer(token),
  )
  return res.messages
}

export async function sendGroupChatMessage(
  classId: string,
  _senderId: string,
  _senderName: string,
  senderRole: 'student' | 'teacher',
  text: string,
): Promise<ChatMessage> {
  // POST /api/v1/chat/group — senderName is resolved server-side from auth token
  const token = senderRole === 'teacher' ? getTeacherToken() : getStudentToken()
  const res = await apiRequest<{ message: ChatMessage }>('/chat/group', {
    method: 'POST',
    body: { classId, text },
    ...bearer(token),
  })
  return res.message
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  // DELETE /api/v1/chat/messages/:id (admin only)
  await apiRequest(`/chat/messages/${messageId}`, { method: 'DELETE', ...bearer(getAdminToken()) })
}

// Legacy aliases
export const getChatMessagesForClass = getGroupChatMessages.bind(null)
export const getAllChatThreads = getGroupChatMessages.bind(null)
export async function sendChatMessage(classId: string, _studentId: string, senderRole: 'student' | 'teacher', text: string): Promise<ChatMessage> {
  return sendGroupChatMessage(classId, _studentId, senderRole === 'teacher' ? 'Teacher' : 'Student', senderRole, text)
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendanceForClass(classId: string, _studentId: string): Promise<AttendanceRecord[]> {
  // GET /api/v1/student/classes/:classId/attendance
  const res = await apiRequest<{ records: AttendanceRecord[] }>(
    `/student/classes/${classId}/attendance`,
    bearer(getStudentToken()),
  )
  return res.records
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export async function getRecordingsForClass(classId: string): Promise<RecordedSession[]> {
  // GET /api/v1/student/classes/:classId/recordings
  const res = await apiRequest<{ recordings: RecordedSession[] }>(
    `/student/classes/${classId}/recordings`,
    bearer(getStudentToken()),
  )
  return res.recordings
}

export async function updateSessionRecording(sessionId: string, url: string): Promise<LmsSession> {
  // PATCH /api/v1/teacher/sessions/:id/recording
  const res = await apiRequest<{ session: LmsSession }>(`/teacher/sessions/${sessionId}/recording`, {
    method: 'PATCH',
    body: { url },
    ...bearer(getTeacherToken()),
  })
  return res.session
}

export async function adminRemoveSessionRecording(sessionId: string): Promise<LmsSession> {
  const res = await apiRequest<{ session: LmsSession }>(`/admin/sessions/${sessionId}/recording`, {
    method: 'DELETE',
    ...bearer(getAdminToken()),
  })
  return res.session
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getStudentNotificationPrefs(_studentId: string): Promise<NotificationPrefs> {
  // GET /api/v1/student/notification-prefs
  const res = await apiRequest<{ prefs: NotificationPrefs }>('/student/notification-prefs', bearer(getStudentToken()))
  return res.prefs
}

export async function updateStudentNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  // PATCH /api/v1/student/notification-prefs
  await apiRequest('/student/notification-prefs', {
    method: 'PATCH',
    body: {
      emailEnabled:       prefs.emailEnabled,
      pushEnabled:        prefs.pushEnabled,
      sessionReminder:    prefs.sessionReminder,
      sessionStarted:     prefs.sessionStarted,
      sessionRescheduled: prefs.sessionRescheduled,
      noticePosted:       prefs.noticePosted,
    },
    ...bearer(getStudentToken()),
  })
}

export async function getStudentOrders(): Promise<StudentOrder[]> {
  // GET /api/v1/student/orders
  const res = await apiRequest<{ orders: StudentOrder[] }>('/student/orders', bearer(getStudentToken()))
  return res.orders
}

export async function cancelStudentOrder(orderId: string): Promise<{ accessUntil: string }> {
  // POST /api/v1/student/orders/:orderId/cancel
  const res = await apiRequest<{ accessUntil: string }>(`/student/orders/${orderId}/cancel`, {
    method: 'POST',
    ...bearer(getStudentToken()),
  })
  return res
}

export async function getStudentLmsNotifications(_studentId: string): Promise<LmsNotification[]> {
  // GET /api/v1/student/notifications
  const res = await apiRequest<{ notifications: LmsNotification[] }>('/student/notifications', bearer(getStudentToken()))
  return res.notifications
}

export async function markLmsNotificationRead(id: string): Promise<void> {
  // PATCH /api/v1/student/notifications/:id/read
  await apiRequest(`/student/notifications/${id}/read`, { method: 'PATCH', ...bearer(getStudentToken()) })
}

// ─── Coupons / Payments ───────────────────────────────────────────────────────

export async function getAllCoupons(): Promise<Coupon[]> {
  // GET /api/v1/admin/coupons
  const res = await apiRequest<{ coupons: (Omit<Coupon, 'maxUses'> & { maxUses: number | null })[] }>(
    '/admin/coupons',
    bearer(getAdminToken()),
  )
  return res.coupons.map(c => ({ ...c, maxUses: c.maxUses ?? 0 }))
}

export async function adminCreateCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  // POST /api/v1/admin/coupons
  const res = await apiRequest<{ coupon: Omit<Coupon, 'maxUses'> & { maxUses: number | null } }>('/admin/coupons', {
    method: 'POST',
    body: {
      code: payload.code,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      maxUses: payload.maxUses === 0 ? undefined : payload.maxUses,
      productId: payload.productId ?? undefined,
      expiresAt: payload.expiresAt ?? undefined,
    },
    ...bearer(getAdminToken()),
  })
  return { ...res.coupon, maxUses: res.coupon.maxUses ?? 0 }
}

export async function adminToggleCoupon(id: string, isActive: boolean): Promise<Coupon> {
  // PATCH /api/v1/admin/coupons/:id
  const res = await apiRequest<{ coupon: Omit<Coupon, 'maxUses'> & { maxUses: number | null } }>(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: { isActive },
    ...bearer(getAdminToken()),
  })
  return { ...res.coupon, maxUses: res.coupon.maxUses ?? 0 }
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  // DELETE /api/v1/admin/coupons/:id
  await apiRequest(`/admin/coupons/${id}`, { method: 'DELETE', ...bearer(getAdminToken()) })
}

export async function validateCoupon(
  code: string,
  productId: string,
): Promise<{ valid: boolean; discount: number; type: 'percentage' | 'fixed'; message?: string }> {
  // POST /api/v1/coupons/validate
  const res = await apiRequest<{ valid: boolean; discount?: number; type?: 'percentage' | 'fixed'; message?: string }>(
    '/coupons/validate',
    { method: 'POST', body: { code, productId } },
  )
  return {
    valid: res.valid,
    discount: res.discount ?? 0,
    type: res.type ?? 'percentage',
    message: res.message,
  }
}

export async function submitCheckout(
  productId: string,
  plan: 'upfront' | 'installment',
  couponCode?: string,
  _studentId?: string,
  classId?: string,
): Promise<{ success: boolean; enrollmentId: string; clientSecret?: string; orderId: string }> {
  const res = await apiRequest<{ clientSecret: string; orderId: string; enrolled: boolean }>(
    '/payments/checkout',
    {
      method: 'POST',
      body: { productId, plan, couponCode, classId },
      ...bearer(getStudentToken()),
    },
  )
  return { success: true, enrollmentId: res.orderId, clientSecret: res.clientSecret, orderId: res.orderId }
}

// ─── Admin — Classes & Enrollment ─────────────────────────────────────────────

export async function adminGetClasses(): Promise<LmsClass[]> {
  // GET /api/v1/admin/classes
  const res = await apiRequest<{ classes: LmsClass[] }>('/admin/classes', bearer(getAdminToken()))
  return res.classes
}

export async function adminCreateClass(payload: CreateClassPayload): Promise<LmsClass> {
  // POST /api/v1/admin/classes
  const res = await apiRequest<{ class: LmsClass }>('/admin/classes', {
    method: 'POST',
    body: payload,
    ...bearer(getAdminToken()),
  })
  return res.class
}

export async function adminUpdateClass(id: string, payload: Partial<CreateClassPayload>): Promise<LmsClass> {
  // PATCH /api/v1/admin/classes/:id
  const res = await apiRequest<{ class: LmsClass }>(`/admin/classes/${id}`, {
    method: 'PATCH',
    body: payload,
    ...bearer(getAdminToken()),
  })
  return res.class
}

export async function adminGetEnrollmentsForClass(classId: string): Promise<StudentEnrollment[]> {
  // GET /api/v1/admin/classes/:classId/enrollments
  const res = await apiRequest<{ enrollments: (StudentEnrollment & { studentName?: string; studentEmail?: string; accessType?: string })[] }>(
    `/admin/classes/${classId}/enrollments`,
    bearer(getAdminToken()),
  )
  return res.enrollments
}

export async function adminEnrollStudent(payload: EnrollStudentPayload): Promise<void> {
  // POST /api/v1/admin/classes/:classId/enroll
  let accessType: 'full' | 'demo'
  let demoDays: number | undefined

  if (payload.demoExpiresAt === null) {
    accessType = 'full'
  } else {
    accessType = 'demo'
    const expiresMs = new Date(payload.demoExpiresAt).getTime() - Date.now()
    demoDays = Math.max(1, Math.round(expiresMs / (1000 * 60 * 60 * 24)))
  }

  await apiRequest(`/admin/classes/${payload.classId}/enroll`, {
    method: 'POST',
    body: { studentId: payload.studentId, accessType, demoDays },
    ...bearer(getAdminToken()),
  })
}

export async function adminRemoveEnrollment(classId: string, studentId: string): Promise<void> {
  await apiRequest(`/admin/classes/${classId}/enrollments/${studentId}`, {
    method: 'DELETE',
    ...bearer(getAdminToken()),
  })
}

type EnrollmentOverrideAction =
  | { type: 'extend'; days: number }
  | { type: 'full_access' }
  | { type: 'revoke' }

export async function adminUpdateEnrollment(classId: string, studentId: string, action: EnrollmentOverrideAction): Promise<void> {
  await apiRequest(`/admin/classes/${classId}/enrollments/${studentId}`, {
    method: 'PATCH',
    body: action,
    ...bearer(getAdminToken()),
  })
}

// ─── Teacher Analytics ────────────────────────────────────────────────────────

export async function getTeacherAnalytics(_teacherId: string): Promise<TeacherAnalytics> {
  // GET /api/v1/teacher/analytics
  const res = await apiRequest<{ analytics: TeacherAnalytics }>('/teacher/analytics', bearer(getTeacherToken()))
  return res.analytics
}

export async function adminGetOrders(): Promise<LmsOrder[]> {
  // GET /api/v1/admin/orders
  const res = await apiRequest<{ orders: LmsOrder[] }>('/admin/orders', bearer(getAdminToken()))
  return res.orders
}

export async function adminRefundOrder(orderId: string): Promise<void> {
  // POST /api/v1/admin/orders/:orderId/refund
  await apiRequest(`/admin/orders/${orderId}/refund`, { method: 'POST', ...bearer(getAdminToken()) })
}

export async function studentGetEnrollmentOverview(): Promise<EnrollmentOverview[]> {
  // GET /api/v1/student/enrollment-overview
  const res = await apiRequest<{ enrollments: EnrollmentOverview[] }>(
    '/student/enrollment-overview',
    bearer(getStudentToken()),
  )
  return res.enrollments
}

export async function startDemoEnrollment(productId: string): Promise<{ classId: string; demoExpiresAt: string }> {
  // POST /api/v1/student/programs/:productId/demo
  const res = await apiRequest<{ classId: string; demoExpiresAt: string }>(
    `/student/programs/${productId}/demo`,
    { method: 'POST', ...bearer(getStudentToken()) },
  )
  return res
}

export async function teacherGetClassStudents(classId: string): Promise<TeacherStudentSummary[]> {
  // GET /api/v1/teacher/classes/:classId/students
  const res = await apiRequest<{ students: TeacherStudentSummary[] }>(
    `/teacher/classes/${classId}/students`,
    bearer(getTeacherToken()),
  )
  return res.students
}
