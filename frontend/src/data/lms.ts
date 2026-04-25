/**
 * LMS mock data store — reads/writes to localStorage.
 * Pattern mirrors data/affiliates.ts exactly.
 *
 * BACKEND SWAP: Delete this file and replace all callers with real API calls
 * via lmsApi.ts. The localStorage keys below correspond to future DB tables.
 */

import type {
  Teacher,
  Editor,
  Product,
  LmsClass,
  LmsSession,
  Notice,
  DemoOverride,
  ChatMessage,
  Coupon,
  LmsNotification,
  NotificationPrefs,
  StudentEnrollment,
} from '../types/lms'

// ─── Storage keys ────────────────────────────────────────────────────────────

const KEYS = {
  teachers: 'nextgen.lms.teachers',
  editors: 'nextgen.lms.editors',
  products: 'nextgen.lms.products',
  classes: 'nextgen.lms.classes',
  sessions: 'nextgen.lms.sessions',
  notices: 'nextgen.lms.notices',
  demoOverrides: 'nextgen.lms.demo-overrides',
  teacherPasswords: 'nextgen.lms.teacher-passwords',
  editorPasswords: 'nextgen.lms.editor-passwords',
  chatMessages: 'nextgen.lms.chat-messages',
  coupons: 'nextgen.lms.coupons',
  lmsNotifications: 'nextgen.lms.notifications',
  enrollments: 'nextgen.lms.enrollments',
}

// Passwords stored separately (never in the main records, mirrors real auth separation)
type PasswordStore = Record<string, string>

function readPasswordStore(key: string): PasswordStore {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writePasswordStore(key: string, store: PasswordStore) {
  localStorage.setItem(key, JSON.stringify(store))
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

function load<T>(key: string, getDefaults: () => T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      const defaults = getDefaults()
      localStorage.setItem(key, JSON.stringify(defaults))
      return defaults
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : getDefaults()
  } catch {
    return getDefaults()
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Seed data ───────────────────────────────────────────────────────────────

function seedTeachers(): Teacher[] {
  return [
    {
      id: 'teacher-001',
      name: 'Dr. James Carter',
      email: 'james@teacher.com',
      phone: '+1-555-0101',
      bio: 'Board-certified internist with 12 years of USMLE Step 1 & 2 tutoring experience. Former faculty at Johns Hopkins.',
      status: 'approved',
      registeredAt: '2026-01-10T09:00:00Z',
      assignedClassIds: ['class-001'],
    },
    {
      id: 'teacher-002',
      name: 'Dr. Priya Sharma',
      email: 'priya@teacher.com',
      phone: '+1-555-0202',
      bio: 'Pathology resident with a passion for teaching. Specializes in high-yield Step 1 topics.',
      status: 'pending',
      registeredAt: '2026-04-20T11:00:00Z',
      assignedClassIds: [],
    },
  ]
}

function seedEditors(): Editor[] {
  return [
    {
      id: 'editor-001',
      name: 'Ali Hassan',
      email: 'ali@editor.com',
      createdAt: '2026-01-05T08:00:00Z',
      createdByAdminId: 'admin-001',
    },
  ]
}

function seedProducts(): Product[] {
  return [
    {
      id: 'product-001',
      name: 'USMLE Step 1 Online Sessions',
      description: 'Comprehensive live session program covering all high-yield Step 1 topics with expert tutors, recorded sessions, and personalized feedback.',
      upfrontPrice: 299,
      installmentAmount: 99,
      installmentMonths: 3,
      isActive: true,
      classIds: ['class-001'],
      createdAt: '2026-01-01T00:00:00Z',
    },
  ]
}

function seedClasses(): LmsClass[] {
  return [
    {
      id: 'class-001',
      productId: 'product-001',
      name: 'Step 1 Intensive Cohort',
      description: 'Twice-weekly live sessions covering Biochemistry, Physiology, and Pathology. Small group format for maximum interaction.',
      teacherId: 'teacher-001',
      defaultDurationMinutes: 90,
      enrolledStudentIds: ['student-mock-001', 'student-mock-002', 'student-mock-003'],
    },
  ]
}

function seedSessions(): LmsSession[] {
  const now = new Date()

  // Completed session: yesterday at 10 AM
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(10, 0, 0, 0)

  // Live session: started 20 minutes ago
  const liveStart = new Date(now)
  liveStart.setMinutes(liveStart.getMinutes() - 20)

  // Scheduled session: tomorrow at 10 AM
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  return [
    {
      id: 'session-001',
      classId: 'class-001',
      scheduledAt: yesterday.toISOString(),
      durationMinutes: 90,
      status: 'completed',
      meetingLink: 'https://zoom.us/j/mock-session-001',
      recordingUrl: 'https://recordings.mock/session-001',
      attendanceCount: 3,
      actualDurationMinutes: 87,
      createdAt: yesterday.toISOString(),
    },
    {
      id: 'session-002',
      classId: 'class-001',
      scheduledAt: liveStart.toISOString(),
      durationMinutes: 90,
      status: 'live',
      meetingLink: 'https://zoom.us/j/mock-session-002',
      attendanceCount: 2,
      createdAt: liveStart.toISOString(),
    },
    {
      id: 'session-003',
      classId: 'class-001',
      scheduledAt: tomorrow.toISOString(),
      durationMinutes: 90,
      status: 'scheduled',
      meetingLink: 'https://zoom.us/j/mock-session-003',
      createdAt: new Date().toISOString(),
    },
  ]
}

function seedNotices(): Notice[] {
  return [
    {
      id: 'notice-001',
      classId: 'class-001',
      teacherId: 'teacher-001',
      title: 'Welcome to Step 1 Intensive — please review the syllabus',
      content: 'Welcome everyone! Please review the attached syllabus before our first session. We will cover Biochemistry weeks 1-3.',
      type: 'announcement',
      createdAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'notice-002',
      classId: 'class-001',
      teacherId: 'teacher-001',
      title: 'Week 1 Study Guide',
      content: 'High-yield summary notes for Biochemistry: Amino acids, Enzymes, and Metabolism.',
      type: 'pdf',
      fileName: 'Week1-StudyGuide.pdf',
      createdAt: '2026-01-12T09:00:00Z',
    },
  ]
}

// ─── Teachers ─────────────────────────────────────────────────────────────────

export function getTeachers(): Teacher[] {
  return load(KEYS.teachers, seedTeachers)
}

export function saveTeachers(teachers: Teacher[]) {
  save(KEYS.teachers, teachers)
}

export function getTeacherPassword(teacherId: string): string | undefined {
  const store = readPasswordStore(KEYS.teacherPasswords)
  // seed default passwords on first access
  if (!store['teacher-001']) {
    store['teacher-001'] = 'teacher123'
    store['teacher-002'] = 'teacher123'
    writePasswordStore(KEYS.teacherPasswords, store)
  }
  return readPasswordStore(KEYS.teacherPasswords)[teacherId]
}

export function setTeacherPassword(teacherId: string, password: string) {
  const store = readPasswordStore(KEYS.teacherPasswords)
  store[teacherId] = password
  writePasswordStore(KEYS.teacherPasswords, store)
}

// ─── Editors ──────────────────────────────────────────────────────────────────

export function getEditors(): Editor[] {
  return load(KEYS.editors, seedEditors)
}

export function saveEditors(editors: Editor[]) {
  save(KEYS.editors, editors)
}

export function getEditorPassword(editorId: string): string | undefined {
  const store = readPasswordStore(KEYS.editorPasswords)
  if (!store['editor-001']) {
    store['editor-001'] = 'editor123'
    writePasswordStore(KEYS.editorPasswords, store)
  }
  return readPasswordStore(KEYS.editorPasswords)[editorId]
}

export function setEditorPassword(editorId: string, password: string) {
  const store = readPasswordStore(KEYS.editorPasswords)
  store[editorId] = password
  writePasswordStore(KEYS.editorPasswords, store)
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function getProducts(): Product[] {
  return load(KEYS.products, seedProducts)
}

export function saveProducts(products: Product[]) {
  save(KEYS.products, products)
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export function getClasses(): LmsClass[] {
  return load(KEYS.classes, seedClasses)
}

export function saveClasses(classes: LmsClass[]) {
  save(KEYS.classes, classes)
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function getSessions(): LmsSession[] {
  return load(KEYS.sessions, seedSessions)
}

export function saveSessions(sessions: LmsSession[]) {
  save(KEYS.sessions, sessions)
}

// ─── Notices ──────────────────────────────────────────────────────────────────

export function getNotices(): Notice[] {
  return load(KEYS.notices, seedNotices)
}

export function saveNotices(notices: Notice[]) {
  save(KEYS.notices, notices)
}

// ─── Demo Overrides ───────────────────────────────────────────────────────────

export function getDemoOverrides(): DemoOverride[] {
  return load(KEYS.demoOverrides, () => [])
}

export function saveDemoOverrides(overrides: DemoOverride[]) {
  save(KEYS.demoOverrides, overrides)
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

function seedChatMessages(): ChatMessage[] {
  return [
    {
      id: 'msg-001',
      classId: 'class-001',
      studentId: 'student-mock-001',
      senderRole: 'student',
      text: "Hi Dr. Carter! I had a question about the enzyme kinetics from last session. Could you clarify the difference between competitive and non-competitive inhibition?",
      sentAt: '2026-04-22T10:05:00Z',
      read: true,
    },
    {
      id: 'msg-002',
      classId: 'class-001',
      studentId: 'student-mock-001',
      senderRole: 'teacher',
      text: "Great question! Competitive inhibition increases apparent Km but Vmax stays the same — adding more substrate overcomes it. Non-competitive inhibition decreases Vmax but doesn't change Km. Competitive inhibitors compete for the active site; non-competitive ones bind elsewhere.",
      sentAt: '2026-04-22T10:12:00Z',
      read: true,
    },
    {
      id: 'msg-003',
      classId: 'class-001',
      studentId: 'student-mock-001',
      senderRole: 'student',
      text: "That makes sense! So for USMLE: competitive = same Vmax, higher Km. Non-competitive = lower Vmax, same Km?",
      sentAt: '2026-04-22T10:18:00Z',
      read: true,
    },
    {
      id: 'msg-004',
      classId: 'class-001',
      studentId: 'student-mock-001',
      senderRole: 'teacher',
      text: "Exactly! That's the high-yield way to remember it. Uncompetitive inhibition (less common on Step 1) decreases BOTH Vmax and Km. I'll include this in tomorrow's session summary.",
      sentAt: '2026-04-22T10:20:00Z',
      read: false,
    },
  ]
}

export function getChatMessages(): ChatMessage[] {
  return load(KEYS.chatMessages, seedChatMessages)
}

export function saveChatMessages(messages: ChatMessage[]) {
  save(KEYS.chatMessages, messages)
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

function seedCoupons(): Coupon[] {
  return [
    {
      id: 'coupon-001',
      code: 'STEP1SAVE20',
      discountType: 'percentage',
      discountValue: 20,
      maxUses: 100,
      usedCount: 23,
      productId: null,
      expiresAt: '2026-12-31T23:59:59Z',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'coupon-002',
      code: 'WELCOME50',
      discountType: 'fixed',
      discountValue: 50,
      maxUses: 50,
      usedCount: 50,
      productId: 'product-001',
      expiresAt: '2026-03-31T23:59:59Z',
      isActive: false,
      createdAt: '2026-01-15T00:00:00Z',
    },
  ]
}

export function getCoupons(): Coupon[] {
  return load(KEYS.coupons, seedCoupons)
}

export function saveCoupons(coupons: Coupon[]) {
  save(KEYS.coupons, coupons)
}

// ─── LMS Notifications ────────────────────────────────────────────────────────

function seedLmsNotifications(): LmsNotification[] {
  return [
    {
      id: 'lmsn-001',
      type: 'session_starting',
      message: 'Your session starts in 30 min — Step 1 Intensive Cohort',
      classId: 'class-001',
      read: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'lmsn-002',
      type: 'notice_posted',
      message: 'New notice posted — Week 1 Study Guide',
      classId: 'class-001',
      read: true,
      createdAt: '2026-01-12T09:05:00Z',
    },
    {
      id: 'lmsn-003',
      type: 'demo_expiring',
      message: 'Your demo access expires in 2 days — enroll to keep access',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

export function getLmsNotifications(): LmsNotification[] {
  return load(KEYS.lmsNotifications, seedLmsNotifications)
}

export function saveLmsNotifications(notifications: LmsNotification[]) {
  save(KEYS.lmsNotifications, notifications)
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

function seedEnrollments(): StudentEnrollment[] {
  return [
    { studentId: 'student-mock-001', classId: 'class-001', enrolledAt: '2026-01-15T00:00:00Z' },
    { studentId: 'student-mock-002', classId: 'class-001', enrolledAt: '2026-01-17T00:00:00Z', demoExpiresAt: '2026-05-01T00:00:00Z' },
    { studentId: 'student-mock-003', classId: 'class-001', enrolledAt: '2026-01-20T00:00:00Z', demoExpiresAt: '2026-04-25T00:00:00Z' },
  ]
}

export function getEnrollments(): StudentEnrollment[] {
  return load(KEYS.enrollments, seedEnrollments)
}

export function saveEnrollments(enrollments: StudentEnrollment[]) {
  save(KEYS.enrollments, enrollments)
}

// ─── Notification Prefs ───────────────────────────────────────────────────────

export function getNotificationPrefs(studentId: string): NotificationPrefs {
  try {
    const raw = localStorage.getItem(`nextgen.lms.notification-prefs.${studentId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    studentId,
    emailEnabled: true,
    pushEnabled: false,
    sessionReminder: true,
    sessionStarted: true,
    sessionRescheduled: true,
    noticePosted: true,
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(`nextgen.lms.notification-prefs.${prefs.studentId}`, JSON.stringify(prefs))
}
