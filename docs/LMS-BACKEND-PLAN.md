# LMS Backend Plan — First Half

## Table of Contents
1. [Overview & User Flows](#1-overview--user-flows)
2. [Database Schema](#2-database-schema)
3. [Row Level Security (RLS)](#3-row-level-security-rls)
4. [Backend File Structure](#4-backend-file-structure)
5. [Changes to Existing Backend Files](#5-changes-to-existing-backend-files)
6. [New Backend Route Files](#6-new-backend-route-files)
7. [Every Endpoint — Request & Response](#7-every-endpoint--request--response)
8. [Zoom API Integration](#8-zoom-api-integration)
9. [Frontend ↔ Backend Connection Guide](#9-frontend--backend-connection-guide)
10. [Frontend File Reference](#10-frontend-file-reference)
11. [Step-by-Step Implementation Order](#11-step-by-step-implementation-order)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Overview & User Flows

The LMS system revolves around **Products → Classes → Sessions**. A product is a program (e.g. "USMLE Step 1 Online Sessions"). A class is a cohort of students enrolled in that product, led by a teacher. Sessions are individual live Zoom meetings within a class.

### Admin
- Full system access
- Approves/rejects/suspends teachers after they register
- Creates editors (no public registration for editors)
- Manages products (create, edit, toggle active/inactive, delete)
- Views all sessions across all classes with override ability
- Controls demo access per student (extend days, grant full access, reset)

### Editor
- Created by admin only — no self-registration
- Can approve/reject pending teachers
- Views and manages all sessions across all classes
- Accesses supervision panel (chat monitoring — shell in first half, live in second half)

### Teacher
- Registers publicly → status starts as `pending`
- Redirected to a pending screen after login until admin/editor approves
- Once approved: manages their assigned classes and sessions
- Creates/edits/cancels sessions (edit requires a change note)
- Checks in to start a session (flips status to `live`)
- Ends sessions (flips to `completed`)
- Posts notices (announcements and PDF references) to their classes

### Student
- Enrolled in classes by admin (payment flow is second half)
- Sees their enrolled classes with countdown timers to next session
- Joins live sessions via Zoom link (link only shown when session is `live`)
- Reads class notice board

---

## 2. Database Schema

Run **Migration 004** in the Supabase SQL Editor. All tables are prefixed `lms_` to avoid conflicts.

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 004 — LMS Tables
-- Run in Supabase SQL Editor after migrations 001, 002, 003
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Teacher profiles ────────────────────────────────────────────────────────
-- One row per teacher. References profiles(id) for name/email/auth.
CREATE TABLE IF NOT EXISTS lms_teacher_profiles (
  id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone      TEXT NOT NULL DEFAULT '',
  bio        TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT teacher_status_values CHECK (status IN ('pending', 'approved', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Editor profiles ─────────────────────────────────────────────────────────
-- One row per editor. Editors are created by admins only.
CREATE TABLE IF NOT EXISTS lms_editor_profiles (
  id                   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_admin_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Products ────────────────────────────────────────────────────────────────
-- Each product is a program offering (e.g. "USMLE Step 1 Online Sessions").
CREATE TABLE IF NOT EXISTS lms_products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  upfront_price      NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CONSTRAINT upfront_price_non_negative CHECK (upfront_price >= 0),
  installment_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CONSTRAINT installment_amount_non_negative CHECK (installment_amount >= 0),
  installment_months INTEGER NOT NULL DEFAULT 0
    CONSTRAINT installment_months_non_negative CHECK (installment_months >= 0),
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Classes ─────────────────────────────────────────────────────────────────
-- A class is a cohort of students for a product, assigned to one teacher.
-- ON DELETE RESTRICT on product_id and teacher_id prevents accidental deletion
-- of products/teachers that still have classes.
CREATE TABLE IF NOT EXISTS lms_classes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               UUID NOT NULL REFERENCES lms_products(id) ON DELETE RESTRICT,
  name                     TEXT NOT NULL,
  description              TEXT NOT NULL DEFAULT '',
  teacher_id               UUID NOT NULL REFERENCES lms_teacher_profiles(id) ON DELETE RESTRICT,
  default_duration_minutes INTEGER NOT NULL DEFAULT 90
    CONSTRAINT duration_min CHECK (default_duration_minutes >= 15),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Sessions ────────────────────────────────────────────────────────────────
-- One session = one live Zoom meeting for a class.
CREATE TABLE IF NOT EXISTS lms_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                UUID NOT NULL REFERENCES lms_classes(id) ON DELETE CASCADE,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  duration_minutes        INTEGER NOT NULL DEFAULT 90
    CONSTRAINT session_duration_min CHECK (duration_minutes >= 15),
  status                  TEXT NOT NULL DEFAULT 'scheduled'
    CONSTRAINT session_status_values CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  meeting_link            TEXT NOT NULL DEFAULT '',  -- populated by Zoom API on creation
  recording_url           TEXT,                      -- populated after session ends
  attendance_count        INTEGER,                   -- populated when session ends
  actual_duration_minutes INTEGER,                   -- computed from started_at/ended_at
  change_note             TEXT,                      -- required if any field edited after creation
  started_at              TIMESTAMPTZ,               -- set when teacher checks in
  ended_at                TIMESTAMPTZ,               -- set when teacher or admin ends session
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notices ─────────────────────────────────────────────────────────────────
-- Announcements and PDF references posted to a class notice board.
CREATE TABLE IF NOT EXISTS lms_notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   UUID NOT NULL REFERENCES lms_classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES lms_teacher_profiles(id) ON DELETE SET NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL
    CONSTRAINT notice_type_values CHECK (type IN ('announcement', 'pdf')),
  file_name  TEXT,       -- display name of the attached file (UI only in first half)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Enrollments ─────────────────────────────────────────────────────────────
-- Links a student to a class. One row per student per class.
-- demo_expires_at = NULL means full (paid) access.
-- demo_expires_at = past timestamp means demo has expired.
-- demo_expires_at = future timestamp means demo still active.
CREATE TABLE IF NOT EXISTS lms_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES lms_classes(id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  demo_expires_at TIMESTAMPTZ,
  CONSTRAINT enrollment_unique UNIQUE (student_id, class_id)
);

-- ─── Demo Overrides ──────────────────────────────────────────────────────────
-- Admin-controlled demo access per student.
-- One row per student (upserted on each override action).
-- This controls the demo_expires_at on ALL of that student's enrollments.
CREATE TABLE IF NOT EXISTS lms_demo_overrides (
  student_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  demo_expires_at        TIMESTAMPTZ,  -- NULL = full access; past timestamp = expired
  overridden_by_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  overridden_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lms_classes_product     ON lms_classes(product_id);
CREATE INDEX IF NOT EXISTS idx_lms_classes_teacher     ON lms_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lms_sessions_class      ON lms_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_lms_sessions_status     ON lms_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lms_sessions_scheduled  ON lms_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lms_notices_class       ON lms_notices(class_id);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_student ON lms_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_class   ON lms_enrollments(class_id);
```

### Table Relationships

```
profiles (role = 'teacher')
    ↓ 1:1
lms_teacher_profiles (status: pending → approved → suspended)
    ↓ 1:many
lms_classes
    ↓ 1:many
lms_sessions        ← one row per live Zoom session
lms_notices         ← announcements and PDF refs

profiles (role = 'editor')
    ↓ 1:1
lms_editor_profiles

lms_products
    ↓ 1:many
lms_classes

profiles (role = 'student')
    ↓ via lms_enrollments (many:many with lms_classes)
lms_classes
    ↓
lms_demo_overrides  ← admin-set demo expiry per student (latest override only)
```

---

## 3. Row Level Security (RLS)

```sql
-- Enable RLS on all LMS tables
ALTER TABLE lms_teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_editor_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_notices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_enrollments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_demo_overrides   ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS — all backend endpoints use supabaseServiceClient.
-- Policies below apply only if direct Supabase client queries are ever used.

-- lms_teacher_profiles: teacher reads own row
CREATE POLICY "Teacher reads own profile" ON lms_teacher_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role full access on lms_teacher_profiles" ON lms_teacher_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- lms_editor_profiles: editor reads own row
CREATE POLICY "Editor reads own profile" ON lms_editor_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role full access on lms_editor_profiles" ON lms_editor_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- lms_products: public read (homepage uses products), service role writes
CREATE POLICY "Anyone can read active products" ON lms_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access on lms_products" ON lms_products
  FOR ALL USING (auth.role() = 'service_role');

-- lms_classes: teacher reads own classes; students read enrolled classes
CREATE POLICY "Teacher reads own classes" ON lms_classes
  FOR SELECT USING (
    teacher_id = auth.uid()
  );

CREATE POLICY "Student reads enrolled classes" ON lms_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_enrollments
      WHERE lms_enrollments.class_id = lms_classes.id
        AND lms_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on lms_classes" ON lms_classes
  FOR ALL USING (auth.role() = 'service_role');

-- lms_sessions: teacher sees sessions in their classes; student sees sessions in enrolled classes
CREATE POLICY "Teacher reads own class sessions" ON lms_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_classes
      WHERE lms_classes.id = lms_sessions.class_id
        AND lms_classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Student reads enrolled class sessions" ON lms_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_enrollments
      WHERE lms_enrollments.class_id = lms_sessions.class_id
        AND lms_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on lms_sessions" ON lms_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- lms_notices: same pattern as sessions
CREATE POLICY "Teacher reads own class notices" ON lms_notices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_classes
      WHERE lms_classes.id = lms_notices.class_id
        AND lms_classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Student reads enrolled class notices" ON lms_notices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_enrollments
      WHERE lms_enrollments.class_id = lms_notices.class_id
        AND lms_enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on lms_notices" ON lms_notices
  FOR ALL USING (auth.role() = 'service_role');

-- lms_enrollments: student reads own enrollments
CREATE POLICY "Student reads own enrollments" ON lms_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Service role full access on lms_enrollments" ON lms_enrollments
  FOR ALL USING (auth.role() = 'service_role');

-- lms_demo_overrides: admin only via service role
CREATE POLICY "Service role full access on lms_demo_overrides" ON lms_demo_overrides
  FOR ALL USING (auth.role() = 'service_role');
```

> All backend routes use `supabaseServiceClient` (service role key) which bypasses RLS entirely. These policies are a safety net for any future direct frontend queries.

---

## 4. Backend File Structure

```
backend/src/
├── config/
│   └── env.ts                   ← MODIFY: add 'teacher', 'editor' to ROLE_TYPES
├── types/
│   └── express.d.ts             ← no change needed (imports RoleType from env.ts)
├── routes/
│   ├── auth.ts                  ← MODIFY: add teacher register/login, editor login
│   ├── lmsAdmin.ts              ← CREATE: admin LMS management
│   ├── lmsTeacher.ts            ← CREATE: teacher portal
│   ├── lmsEditor.ts             ← CREATE: editor portal
│   ├── lmsStudent.ts            ← CREATE: student LMS portal
│   └── lmsPublic.ts             ← CREATE: public products/classes listing
├── lib/
│   └── zoom.ts                  ← CREATE: Zoom API helper
├── app.ts                       ← MODIFY: mount 5 new routers
└── sql/
    └── 004_lms.sql              ← CREATE: migration file (SQL from Section 2)
```

---

## 5. Changes to Existing Backend Files

### `backend/src/config/env.ts`

Add `'teacher'` and `'editor'` to the `ROLE_TYPES` array:

```typescript
// BEFORE:
export const ROLE_TYPES = ['student', 'admin', 'affiliate'] as const

// AFTER:
export const ROLE_TYPES = ['student', 'admin', 'affiliate', 'teacher', 'editor'] as const
```

This makes `RoleType = 'student' | 'admin' | 'affiliate' | 'teacher' | 'editor'` and allows `requireRole('teacher')` and `requireRole('editor')` middleware to work.

---

### `backend/src/app.ts`

Import and mount the 5 new routers:

```typescript
import { lmsAdminRouter }   from './routes/lmsAdmin.js'
import { lmsTeacherRouter } from './routes/lmsTeacher.js'
import { lmsEditorRouter }  from './routes/lmsEditor.js'
import { lmsStudentRouter } from './routes/lmsStudent.js'
import { lmsPublicRouter }  from './routes/lmsPublic.js'

// Add inside createApp(), after existing routers:
app.use('/api/v1', lmsPublicRouter)   // no auth — products listing for homepage
app.use('/api/v1', lmsAdminRouter)
app.use('/api/v1', lmsTeacherRouter)
app.use('/api/v1', lmsEditorRouter)
app.use('/api/v1', lmsStudentRouter)
```

---

### `backend/src/routes/auth.ts`

Add three new endpoints — teacher register, teacher login, and editor login.

**Teacher Register:**
```typescript
const teacherRegisterSchema = z.object({
  fullName:  z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(8),
  phone:     z.string().min(5),
  bio:       z.string().min(10).max(300),
})

authRouter.post('/auth/teacher/register', async (req, res, next) => {
  try {
    const parsed = teacherRegisterSchema.parse(req.body)
    const normalizedEmail = parsed.email.trim().toLowerCase()

    // Create auth user via service role (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseServiceClient.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.fullName },
    })

    if (authError || !authData.user) {
      throw new HttpError(400, 'CREATE_USER_FAILED', authError?.message ?? 'Failed to create user')
    }

    const userId = authData.user.id

    // Insert into profiles with role = 'teacher'
    const { error: profileError } = await supabaseServiceClient
      .from('profiles')
      .insert({ id: userId, email: normalizedEmail, full_name: parsed.fullName, role: 'teacher' })

    if (profileError) {
      await supabaseServiceClient.auth.admin.deleteUser(userId)
      throw new HttpError(500, 'PROFILE_CREATE_FAILED', profileError.message)
    }

    // Insert into lms_teacher_profiles with status = 'pending'
    const { error: teacherError } = await supabaseServiceClient
      .from('lms_teacher_profiles')
      .insert({ id: userId, phone: parsed.phone, bio: parsed.bio, status: 'pending' })

    if (teacherError) {
      await supabaseServiceClient.auth.admin.deleteUser(userId)
      throw new HttpError(500, 'TEACHER_PROFILE_FAILED', teacherError.message)
    }

    return res.status(201).json({
      teacher: {
        id: userId,
        name: parsed.fullName,
        email: normalizedEmail,
        phone: parsed.phone,
        bio: parsed.bio,
        status: 'pending',
        registeredAt: new Date().toISOString(),
        assignedClassIds: [],
      },
    })
  } catch (err) {
    return next(err)
  }
})
```

**Teacher Login:**
```typescript
const teacherLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/auth/teacher/login', async (req, res, next) => {
  try {
    const parsed = teacherLoginSchema.parse(req.body)

    const { data, error } = await supabaseAnonClient.auth.signInWithPassword({
      email: parsed.email.trim().toLowerCase(),
      password: parsed.password,
    })

    if (error || !data.user || !data.session) {
      throw new HttpError(401, 'LOGIN_FAILED', 'Invalid email or password')
    }

    // Verify role and fetch teacher profile
    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', data.user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      throw new HttpError(403, 'ROLE_MISMATCH', 'This account is not a teacher account')
    }

    const { data: teacherProfile } = await supabaseServiceClient
      .from('lms_teacher_profiles')
      .select('phone, bio, status, created_at')
      .eq('id', data.user.id)
      .single()

    if (!teacherProfile) {
      throw new HttpError(500, 'TEACHER_DATA_MISSING', 'Teacher profile not found')
    }

    if (teacherProfile.status === 'suspended') {
      throw new HttpError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Contact support.')
    }

    // Fetch assigned class IDs
    const { data: classes } = await supabaseServiceClient
      .from('lms_classes')
      .select('id')
      .eq('teacher_id', data.user.id)

    return res.status(200).json({
      teacher: {
        id: data.user.id,
        name: profile.full_name,
        email: profile.email,
        phone: teacherProfile.phone,
        bio: teacherProfile.bio,
        status: teacherProfile.status,  // 'pending' or 'approved'
        registeredAt: teacherProfile.created_at,
        assignedClassIds: (classes ?? []).map(c => c.id),
      },
      session: data.session,
    })
  } catch (err) {
    return next(err)
  }
})
```

**Editor Login:**
```typescript
authRouter.post('/auth/editor/login', async (req, res, next) => {
  try {
    const parsed = teacherLoginSchema.parse(req.body)  // same schema: email + password

    const { data, error } = await supabaseAnonClient.auth.signInWithPassword({
      email: parsed.email.trim().toLowerCase(),
      password: parsed.password,
    })

    if (error || !data.user || !data.session) {
      throw new HttpError(401, 'LOGIN_FAILED', 'Invalid email or password')
    }

    const { data: profile } = await supabaseServiceClient
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', data.user.id)
      .single()

    if (!profile || profile.role !== 'editor') {
      throw new HttpError(403, 'ROLE_MISMATCH', 'This account is not an editor account')
    }

    const { data: editorProfile } = await supabaseServiceClient
      .from('lms_editor_profiles')
      .select('created_by_admin_id, created_at')
      .eq('id', data.user.id)
      .single()

    if (!editorProfile) {
      throw new HttpError(500, 'EDITOR_DATA_MISSING', 'Editor profile not found')
    }

    return res.status(200).json({
      editor: {
        id: data.user.id,
        name: profile.full_name,
        email: profile.email,
        createdAt: editorProfile.created_at,
        createdByAdminId: editorProfile.created_by_admin_id,
      },
      session: data.session,
    })
  } catch (err) {
    return next(err)
  }
})
```

---

## 6. New Backend Route Files

### `backend/src/lib/zoom.ts`

Handles Zoom meeting creation. In first half, uses a placeholder. When Zoom OAuth credentials are available, swap the placeholder with the real API call (documented below).

```typescript
// ZOOM API SWAP: Replace generateMeetingLink() body with the real Zoom API call.
// Zoom docs: https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate
// Auth: Server-to-Server OAuth app (Account Credentials grant)
//   1. Create a Server-to-Server OAuth app in Zoom Marketplace
//   2. Get Account ID, Client ID, Client Secret
//   3. Exchange for access token: POST https://zoom.us/oauth/token?grant_type=account_credentials&account_id=...
//   4. Use token in Authorization: Bearer <token>

export async function generateZoomMeetingLink(
  topic: string,
  scheduledAt: string,
  durationMinutes: number
): Promise<string> {
  // ── PLACEHOLDER (first half — no Zoom credentials needed yet) ────────────
  const id = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000
  return `https://zoom.us/j/${id}`

  // ── REAL IMPLEMENTATION (swap in when Zoom app is set up) ────────────────
  // const tokenRes = await fetch(
  //   `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
  //       'Content-Type': 'application/x-www-form-urlencoded',
  //     },
  //   }
  // )
  // const { access_token } = await tokenRes.json()
  //
  // const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     topic,
  //     type: 2,                          // scheduled meeting
  //     start_time: scheduledAt,          // ISO 8601
  //     duration: durationMinutes,
  //     settings: { join_before_host: false, waiting_room: true },
  //   }),
  // })
  // const meeting = await meetingRes.json()
  // return meeting.join_url
}
```

---

### `backend/src/routes/lmsAdmin.ts`

All admin LMS management. Every endpoint requires admin role.

```typescript
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { generateZoomMeetingLink } from '../lib/zoom.js'

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
    .select('phone, bio, status, created_at')
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

// ─── POST /api/v1/admin/editors ──────────────────────────────────────────────
const createEditorSchema = z.object({
  fullName: z.string().min(2),
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
        user_metadata: { full_name: parsed.fullName },
      })

      if (authError || !authData.user) {
        throw new HttpError(400, 'CREATE_USER_FAILED', authError?.message ?? 'Failed to create user')
      }

      const userId = authData.user.id

      const { error: profileError } = await supabaseServiceClient
        .from('profiles')
        .insert({ id: userId, email: normalizedEmail, full_name: parsed.fullName, role: 'editor' })

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
        editor: {
          id: userId,
          name: parsed.fullName,
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
          createdByAdminId: adminId,
        },
      })
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

      // Count enrolled students per product via classes
      const productIds = (data ?? []).map(p => p.id)
      const { data: classes } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, product_id')
        .in('product_id', productIds)

      const classIdsByProduct: Record<string, string[]> = {}
      ;(classes ?? []).forEach(c => {
        if (!classIdsByProduct[c.product_id]) classIdsByProduct[c.product_id] = []
        classIdsByProduct[c.product_id].push(c.id)
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
  name:               z.string().min(2),
  description:        z.string().min(1),
  upfrontPrice:       z.number().min(0),
  installmentAmount:  z.number().min(0),
  installmentMonths:  z.number().int().min(0),
  isActive:           z.boolean().default(true),
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
          id: data.id,
          name: data.name,
          description: data.description,
          upfrontPrice: Number(data.upfront_price),
          installmentAmount: Number(data.installment_amount),
          installmentMonths: data.installment_months,
          isActive: data.is_active,
          classIds: [],
          enrolledStudentCount: 0,
          createdAt: data.created_at,
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
        .from('lms_products')
        .update(updates)
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Product updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/admin/products/:id ──────────────────────────────────────
lmsAdminRouter.delete('/admin/products/:id', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Guard: cannot delete if classes exist for this product
      const { count } = await supabaseServiceClient
        .from('lms_classes')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', req.params.id)

      if ((count ?? 0) > 0) {
        throw new HttpError(409, 'HAS_CLASSES', 'Cannot delete a product that has active classes.')
      }

      const { error } = await supabaseServiceClient
        .from('lms_products')
        .delete()
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Product deleted.' })
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

      // Enrich with teacher name
      const teacherIds = [...new Set((data ?? []).map(s => (s.lms_classes as any).lms_teacher_profiles?.id).filter(Boolean))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds)

      const nameMap: Record<string, string> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })

      const result = (data ?? []).map(s => ({
        id: s.id,
        classId: s.class_id,
        className: (s.lms_classes as any).name,
        teacherId: (s.lms_classes as any).lms_teacher_profiles?.id,
        teacherName: nameMap[(s.lms_classes as any).lms_teacher_profiles?.id] ?? '',
        productName: (s.lms_classes as any).lms_products?.name ?? '',
        scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes,
        status: s.status,
        meetingLink: s.meeting_link,
        attendanceCount: s.attendance_count,
        actualDurationMinutes: s.actual_duration_minutes,
        changeNote: s.change_note,
        recordingUrl: s.recording_url,
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
      if (parsed.scheduledAt)     updates.scheduled_at = parsed.scheduledAt
      if (parsed.durationMinutes) updates.duration_minutes = parsed.durationMinutes

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update(updates)
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Session updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/admin/sessions/:id/cancel ─────────────────────────────────
lmsAdminRouter.patch('/admin/sessions/:id/cancel', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .in('status', ['scheduled', 'live'])  // can only cancel scheduled or live sessions

      if (error) throw new HttpError(500, 'CANCEL_FAILED', error.message)
      return res.status(200).json({ message: 'Session cancelled.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/admin/demo-overrides ────────────────────────────────────────
lmsAdminRouter.get('/admin/demo-overrides', authenticateRequest, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_demo_overrides')
        .select(`
          student_id, demo_expires_at, overridden_by_admin_id, overridden_at,
          profiles!student_id(full_name, email)
        `)
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

      // Upsert demo override record
      const { error } = await supabaseServiceClient
        .from('lms_demo_overrides')
        .upsert({
          student_id: studentId,
          demo_expires_at: demoExpiresAt,
          overridden_by_admin_id: adminId,
          overridden_at: new Date().toISOString(),
        }, { onConflict: 'student_id' })

      if (error) throw new HttpError(500, 'OVERRIDE_FAILED', error.message)

      // Also update all enrollments for this student
      await supabaseServiceClient
        .from('lms_enrollments')
        .update({ demo_expires_at: demoExpiresAt })
        .eq('student_id', studentId)

      return res.status(200).json({
        override: { studentId, demoExpiresAt, overriddenByAdminId: adminId, overriddenAt: new Date().toISOString() },
      })
    } catch (err) { return next(err) }
  }
)
```

---

### `backend/src/routes/lmsTeacher.ts`

Teacher portal — classes, sessions, notices. Every endpoint requires teacher role.

```typescript
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'
import { generateZoomMeetingLink } from '../lib/zoom.js'

export const lmsTeacherRouter = Router()

// ─── GET /api/v1/teacher/classes ─────────────────────────────────────────────
lmsTeacherRouter.get('/teacher/classes', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: classes, error } = await supabaseServiceClient
        .from('lms_classes')
        .select(`
          id, name, description, default_duration_minutes, created_at,
          lms_products!inner(id, name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      // Get enrolled student counts
      const classIds = (classes ?? []).map(c => c.id)
      const { data: enrollments } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id')
        .in('class_id', classIds)

      const enrollCountByClass: Record<string, number> = {}
      ;(enrollments ?? []).forEach(e => {
        enrollCountByClass[e.class_id] = (enrollCountByClass[e.class_id] ?? 0) + 1
      })

      // Get next session per class
      const { data: sessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, meeting_link')
        .in('class_id', classIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })

      const nextSessionByClass: Record<string, typeof sessions[0]> = {}
      ;(sessions ?? []).forEach(s => {
        if (!nextSessionByClass[s.class_id]) nextSessionByClass[s.class_id] = s
      })

      const result = (classes ?? []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        productId: (c.lms_products as any).id,
        productName: (c.lms_products as any).name,
        teacherId,
        defaultDurationMinutes: c.default_duration_minutes,
        enrolledStudentCount: enrollCountByClass[c.id] ?? 0,
        nextSession: nextSessionByClass[c.id] ?? null,
        createdAt: c.created_at,
      }))

      return res.status(200).json({ classes: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId/sessions ───────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId/sessions', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      // Verify teacher owns this class
      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', req.params.classId)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select('*')
        .eq('class_id', req.params.classId)
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)
      return res.status(200).json({ sessions: data ?? [] })
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

      // Verify teacher owns the class
      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id, name')
        .eq('id', parsed.classId)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      // Generate Zoom meeting link
      const meetingLink = await generateZoomMeetingLink(cls.name, parsed.scheduledAt, parsed.durationMinutes)

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .insert({
          class_id: parsed.classId,
          scheduled_at: parsed.scheduledAt,
          duration_minutes: parsed.durationMinutes,
          meeting_link: meetingLink,
          status: 'scheduled',
        })
        .select()
        .single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)
      return res.status(201).json({ session: data })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id ──────────────────────────────────────
const updateSessionSchema = z.object({
  scheduledAt:     z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(300).optional(),
  notes:           z.string().optional(),
  changeNote:      z.string().min(1),  // required on every edit
})

lmsTeacherRouter.patch('/teacher/sessions/:id', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSessionSchema.parse(req.body)
      const teacherId = req.auth!.userId

      // Verify teacher owns the session's class
      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('class_id, status')
        .eq('id', req.params.id)
        .single()

      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status === 'completed' || session.status === 'cancelled') {
        throw new HttpError(400, 'UNEDITABLE', 'Cannot edit a completed or cancelled session.')
      }

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', session.class_id)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const updates: Record<string, unknown> = { change_note: parsed.changeNote, updated_at: new Date().toISOString() }
      if (parsed.scheduledAt)     updates.scheduled_at = parsed.scheduledAt
      if (parsed.durationMinutes) updates.duration_minutes = parsed.durationMinutes

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update(updates)
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Session updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/sessions/:id/start ─────────────────────────────────
// Teacher checks in — flips status to 'live'.
lmsTeacherRouter.post('/teacher/sessions/:id/start', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('class_id, status')
        .eq('id', req.params.id)
        .single()

      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'scheduled') throw new HttpError(400, 'INVALID_STATUS', 'Session is not in scheduled state.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', session.class_id)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'live', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)

      // TODO (second half): trigger push notification + email + WhatsApp to enrolled students

      return res.status(200).json({ message: 'Session started. Students will be notified.' })
    } catch (err) { return next(err) }
  }
)

// ─── POST /api/v1/teacher/sessions/:id/end ───────────────────────────────────
// Teacher ends session — flips to 'completed', computes actual duration.
lmsTeacherRouter.post('/teacher/sessions/:id/end', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('class_id, status, started_at')
        .eq('id', req.params.id)
        .single()

      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'live') throw new HttpError(400, 'INVALID_STATUS', 'Session is not live.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', session.class_id)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const endedAt = new Date()
      const actualMinutes = session.started_at
        ? Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 60000)
        : null

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({
          status: 'completed',
          ended_at: endedAt.toISOString(),
          actual_duration_minutes: actualMinutes,
          updated_at: endedAt.toISOString(),
        })
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Session ended.', actualDurationMinutes: actualMinutes })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/teacher/sessions/:id/cancel ───────────────────────────────
lmsTeacherRouter.patch('/teacher/sessions/:id/cancel', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: session } = await supabaseServiceClient
        .from('lms_sessions')
        .select('class_id, status')
        .eq('id', req.params.id)
        .single()

      if (!session) throw new HttpError(404, 'NOT_FOUND', 'Session not found.')
      if (session.status !== 'scheduled') throw new HttpError(400, 'INVALID_STATUS', 'Only scheduled sessions can be cancelled.')

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', session.class_id)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This session does not belong to your class.')

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'CANCEL_FAILED', error.message)
      return res.status(200).json({ message: 'Session cancelled.' })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/teacher/classes/:classId/notices ────────────────────────────
lmsTeacherRouter.get('/teacher/classes/:classId/notices', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      const { data: cls } = await supabaseServiceClient
        .from('lms_classes')
        .select('id')
        .eq('id', req.params.classId)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .select('*')
        .eq('class_id', req.params.classId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)
      return res.status(200).json({ notices: data ?? [] })
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
        .from('lms_classes')
        .select('id')
        .eq('id', parsed.classId)
        .eq('teacher_id', teacherId)
        .single()

      if (!cls) throw new HttpError(403, 'FORBIDDEN', 'This class does not belong to you.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .insert({
          class_id: parsed.classId,
          teacher_id: teacherId,
          title: parsed.title,
          content: parsed.content,
          type: parsed.type,
          file_name: parsed.fileName ?? null,
        })
        .select()
        .single()

      if (error) throw new HttpError(500, 'CREATE_FAILED', error.message)
      return res.status(201).json({ notice: data })
    } catch (err) { return next(err) }
  }
)

// ─── DELETE /api/v1/teacher/notices/:id ──────────────────────────────────────
lmsTeacherRouter.delete('/teacher/notices/:id', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.auth!.userId

      // Verify teacher owns this notice
      const { data: notice } = await supabaseServiceClient
        .from('lms_notices')
        .select('teacher_id')
        .eq('id', req.params.id)
        .single()

      if (!notice) throw new HttpError(404, 'NOT_FOUND', 'Notice not found.')
      if (notice.teacher_id !== teacherId) throw new HttpError(403, 'FORBIDDEN', 'This notice does not belong to you.')

      const { error } = await supabaseServiceClient
        .from('lms_notices')
        .delete()
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'DELETE_FAILED', error.message)
      return res.status(200).json({ message: 'Notice deleted.' })
    } catch (err) { return next(err) }
  }
)
```

---

### `backend/src/routes/lmsEditor.ts`

Editor portal — same powers as admin for sessions and teacher approval, but scoped to LMS only. No product management (admin only).

```typescript
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'

export const lmsEditorRouter = Router()

// Editor shares many endpoints with admin. Rather than duplicating, both admin
// and editor are checked with a helper middleware that accepts either role.
function requireAdminOrEditor(req: Request, res: Response, next: NextFunction) {
  const role = req.auth?.role
  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin or editor required.' } })
  }
  return next()
}

// ─── GET /api/v1/editor/teachers ─────────────────────────────────────────────
// Editor can view and approve/reject teachers (same as admin).
lmsEditorRouter.get('/editor/teachers', authenticateRequest, requireRole('editor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data: teachers } = await supabaseServiceClient
        .from('lms_teacher_profiles')
        .select('id, status, phone, bio, created_at, profiles!inner(full_name, email)')
        .order('created_at', { ascending: false })

      const result = (teachers ?? []).map(t => ({
        id: t.id,
        name: (t.profiles as any).full_name,
        email: (t.profiles as any).email,
        phone: t.phone,
        bio: t.bio,
        status: t.status,
        registeredAt: t.created_at,
      }))

      return res.status(200).json({ teachers: result })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/editor/teachers/:id/approve ───────────────────────────────
lmsEditorRouter.patch('/editor/teachers/:id/approve', authenticateRequest, requireRole('editor'),
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

// ─── PATCH /api/v1/editor/teachers/:id/reject ────────────────────────────────
lmsEditorRouter.patch('/editor/teachers/:id/reject', authenticateRequest, requireRole('editor'),
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

// ─── GET /api/v1/editor/sessions ─────────────────────────────────────────────
// Editor sees all sessions across all classes (same data as admin).
// Reuse the same DB query — just a different route prefix and role check.
lmsEditorRouter.get('/editor/sessions', authenticateRequest, requireRole('editor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select(`
          *,
          lms_classes!inner(
            id, name,
            lms_teacher_profiles!inner(id),
            lms_products:lms_classes_product_id_fkey(name)
          )
        `)
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const teacherIds = [...new Set((data ?? []).map(s => (s.lms_classes as any).lms_teacher_profiles?.id).filter(Boolean))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds)

      const nameMap: Record<string, string> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })

      const result = (data ?? []).map(s => ({
        id: s.id,
        classId: s.class_id,
        className: (s.lms_classes as any).name,
        teacherName: nameMap[(s.lms_classes as any).lms_teacher_profiles?.id] ?? '',
        productName: (s.lms_classes as any).lms_products?.name ?? '',
        scheduledAt: s.scheduled_at,
        durationMinutes: s.duration_minutes,
        status: s.status,
        attendanceCount: s.attendance_count,
        changeNote: s.change_note,
      }))

      return res.status(200).json({ sessions: result })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/editor/sessions/:id ───────────────────────────────────────
const updateSessionSchema = z.object({
  scheduledAt:     z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).optional(),
  changeNote:      z.string().min(1),
})

lmsEditorRouter.patch('/editor/sessions/:id', authenticateRequest, requireRole('editor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSessionSchema.parse(req.body)
      const updates: Record<string, unknown> = { change_note: parsed.changeNote, updated_at: new Date().toISOString() }
      if (parsed.scheduledAt)     updates.scheduled_at = parsed.scheduledAt
      if (parsed.durationMinutes) updates.duration_minutes = parsed.durationMinutes

      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update(updates)
        .eq('id', req.params.id)

      if (error) throw new HttpError(500, 'UPDATE_FAILED', error.message)
      return res.status(200).json({ message: 'Session updated.' })
    } catch (err) { return next(err) }
  }
)

// ─── PATCH /api/v1/editor/sessions/:id/cancel ────────────────────────────────
lmsEditorRouter.patch('/editor/sessions/:id/cancel', authenticateRequest, requireRole('editor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await supabaseServiceClient
        .from('lms_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .in('status', ['scheduled', 'live'])

      if (error) throw new HttpError(500, 'CANCEL_FAILED', error.message)
      return res.status(200).json({ message: 'Session cancelled.' })
    } catch (err) { return next(err) }
  }
)
```

---

### `backend/src/routes/lmsStudent.ts`

Student LMS portal — enrolled classes, sessions, notices.

```typescript
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { HttpError } from '../lib/httpError.js'
import { authenticateRequest, requireRole } from '../middleware/authenticate.js'
import { supabaseServiceClient } from '../lib/supabase.js'

export const lmsStudentRouter = Router()

// ─── GET /api/v1/student/classes ─────────────────────────────────────────────
// Returns all classes the student is enrolled in, enriched with next session.
lmsStudentRouter.get('/student/classes', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollments, error } = await supabaseServiceClient
        .from('lms_enrollments')
        .select(`
          class_id, enrolled_at, demo_expires_at,
          lms_classes!inner(
            id, name, description, default_duration_minutes,
            lms_products!inner(id, name),
            lms_teacher_profiles!inner(id)
          )
        `)
        .eq('student_id', studentId)

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const classIds = (enrollments ?? []).map(e => e.class_id)

      // Get next session per class
      const { data: sessions } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, meeting_link')
        .in('class_id', classIds)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })

      const nextSessionByClass: Record<string, typeof sessions[0]> = {}
      ;(sessions ?? []).forEach(s => {
        if (!nextSessionByClass[s.class_id]) nextSessionByClass[s.class_id] = s
      })

      // Get teacher names
      const teacherIds = [...new Set((enrollments ?? []).map(e => (e.lms_classes as any).lms_teacher_profiles?.id).filter(Boolean))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds)

      const nameMap: Record<string, string> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })

      const result = (enrollments ?? []).map(e => {
        const cls = e.lms_classes as any
        const teacherName = nameMap[cls.lms_teacher_profiles?.id] ?? ''
        return {
          id: cls.id,
          name: cls.name,
          description: cls.description,
          productId: cls.lms_products?.id,
          productName: cls.lms_products?.name ?? '',
          teacherName,
          defaultDurationMinutes: cls.default_duration_minutes,
          nextSession: nextSessionByClass[e.class_id] ?? null,
          enrolledAt: e.enrolled_at,
          demoExpiresAt: e.demo_expires_at,
        }
      })

      return res.status(200).json({ classes: result })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId ────────────────────────────────────
lmsStudentRouter.get('/student/classes/:classId', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      // Verify enrollment
      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('class_id', req.params.classId)
        .single()

      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data: cls, error } = await supabaseServiceClient
        .from('lms_classes')
        .select(`
          id, name, description, default_duration_minutes,
          lms_products!inner(name),
          lms_teacher_profiles!inner(id)
        `)
        .eq('id', req.params.classId)
        .single()

      if (error || !cls) throw new HttpError(404, 'NOT_FOUND', 'Class not found.')

      const { data: profile } = await supabaseServiceClient
        .from('profiles')
        .select('full_name')
        .eq('id', (cls.lms_teacher_profiles as any).id)
        .single()

      return res.status(200).json({
        class: {
          id: cls.id,
          name: cls.name,
          description: cls.description,
          productName: (cls.lms_products as any).name,
          teacherName: profile?.full_name ?? '',
          defaultDurationMinutes: cls.default_duration_minutes,
        },
      })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/sessions ───────────────────────────
lmsStudentRouter.get('/student/classes/:classId/sessions', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('class_id', req.params.classId)
        .single()

      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data, error } = await supabaseServiceClient
        .from('lms_sessions')
        .select('id, class_id, scheduled_at, duration_minutes, status, meeting_link')
        .eq('class_id', req.params.classId)
        .neq('status', 'cancelled')
        .order('scheduled_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      // Privacy: only expose meeting_link when session is live
      const sessions = (data ?? []).map(s => ({
        ...s,
        meetingLink: s.status === 'live' ? s.meeting_link : null,
      }))

      return res.status(200).json({ sessions })
    } catch (err) { return next(err) }
  }
)

// ─── GET /api/v1/student/classes/:classId/notices ────────────────────────────
lmsStudentRouter.get('/student/classes/:classId/notices', authenticateRequest, requireRole('student'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.auth!.userId

      const { data: enrollment } = await supabaseServiceClient
        .from('lms_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('class_id', req.params.classId)
        .single()

      if (!enrollment) throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')

      const { data, error } = await supabaseServiceClient
        .from('lms_notices')
        .select('id, class_id, title, content, type, file_name, created_at')
        .eq('class_id', req.params.classId)
        .order('created_at', { ascending: false })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)
      return res.status(200).json({ notices: data ?? [] })
    } catch (err) { return next(err) }
  }
)
```

---

### `backend/src/routes/lmsPublic.ts`

No auth required. Used by the public homepage to display products.

```typescript
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { HttpError } from '../lib/httpError.js'
import { supabaseServiceClient } from '../lib/supabase.js'

export const lmsPublicRouter = Router()

// ─── GET /api/v1/products ────────────────────────────────────────────────────
// Returns all active products. Used by the public homepage.
lmsPublicRouter.get('/products',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseServiceClient
        .from('lms_products')
        .select('id, name, description, upfront_price, installment_amount, installment_months, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      const result = (data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        upfrontPrice: Number(p.upfront_price),
        installmentAmount: Number(p.installment_amount),
        installmentMonths: p.installment_months,
        isActive: p.is_active,
        createdAt: p.created_at,
      }))

      return res.status(200).json({ products: result })
    } catch (err) { return next(err) }
  }
)
```

---

## 7. Every Endpoint — Request & Response

### Auth

#### `POST /api/v1/auth/teacher/register`
No auth required.
```json
// Request
{
  "fullName": "Dr. James Carter",
  "email": "james@teacher.com",
  "password": "teacher123",
  "phone": "+1 555 0100",
  "bio": "Board-certified physician with 8 years of USMLE teaching experience."
}

// Response 201
{
  "teacher": {
    "id": "uuid",
    "name": "Dr. James Carter",
    "email": "james@teacher.com",
    "phone": "+1 555 0100",
    "bio": "Board-certified...",
    "status": "pending",
    "registeredAt": "2026-04-24T12:00:00Z",
    "assignedClassIds": []
  }
}

// Error 400: { "error": { "code": "CREATE_USER_FAILED", "message": "Email already in use" } }
```

#### `POST /api/v1/auth/teacher/login`
No auth required.
```json
// Request
{ "email": "james@teacher.com", "password": "teacher123" }

// Response 200
{
  "teacher": {
    "id": "uuid",
    "name": "Dr. James Carter",
    "email": "james@teacher.com",
    "phone": "+1 555 0100",
    "bio": "...",
    "status": "approved",         // or "pending" — frontend redirects pending to /teacher/pending
    "registeredAt": "2026-04-24T12:00:00Z",
    "assignedClassIds": ["class-uuid-1"]
  },
  "session": { "access_token": "...", "refresh_token": "..." }
}

// Error 401: { "error": { "code": "LOGIN_FAILED", "message": "Invalid email or password" } }
// Error 403: { "error": { "code": "ACCOUNT_SUSPENDED", "message": "Your account has been suspended." } }
// Error 403: { "error": { "code": "ROLE_MISMATCH", "message": "This account is not a teacher account" } }
```

#### `POST /api/v1/auth/editor/login`
No auth required.
```json
// Request
{ "email": "ali@editor.com", "password": "editor123" }

// Response 200
{
  "editor": {
    "id": "uuid",
    "name": "Ali Hassan",
    "email": "ali@editor.com",
    "createdAt": "2026-04-01T09:00:00Z",
    "createdByAdminId": "admin-uuid"
  },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

---

### Admin

#### `GET /api/v1/admin/teachers`
Requires `Authorization: Bearer <admin_token>`
```json
// Response 200
{
  "teachers": [
    {
      "id": "uuid",
      "name": "Dr. James Carter",
      "email": "james@teacher.com",
      "phone": "+1 555 0100",
      "bio": "...",
      "status": "approved",
      "registeredAt": "2026-04-24T12:00:00Z",
      "assignedClassIds": ["class-uuid"]
    }
  ]
}
```

#### `PATCH /api/v1/admin/teachers/:id/approve`
#### `PATCH /api/v1/admin/teachers/:id/reject`
#### `PATCH /api/v1/admin/teachers/:id/reinstate`
Requires admin token. No request body.
```json
// Response 200
{ "message": "Teacher approved." }
```

#### `POST /api/v1/admin/editors`
Requires admin token.
```json
// Request
{ "fullName": "Ali Hassan", "email": "ali@editor.com", "password": "editor123" }

// Response 201
{ "editor": { "id": "uuid", "name": "Ali Hassan", "email": "ali@editor.com", "createdAt": "...", "createdByAdminId": "uuid" } }
```

#### `GET /api/v1/admin/products`
```json
// Response 200
{
  "products": [
    {
      "id": "uuid",
      "name": "USMLE Online Sessions",
      "description": "Live sessions for Step 1 prep.",
      "upfrontPrice": 299.00,
      "installmentAmount": 99.00,
      "installmentMonths": 4,
      "isActive": true,
      "classIds": ["class-uuid"],
      "enrolledStudentCount": 15,
      "createdAt": "2026-04-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/v1/admin/products`
```json
// Request
{
  "name": "USMLE Online Sessions",
  "description": "Live expert-led sessions.",
  "upfrontPrice": 299,
  "installmentAmount": 99,
  "installmentMonths": 4,
  "isActive": true
}
// Response 201: { "product": { ...same shape as GET... } }
// Error 409: { "error": { "code": "HAS_CLASSES", "message": "Cannot delete a product that has active classes." } }
```

#### `PATCH /api/v1/admin/products/:id`
Partial update. Any subset of the create fields. Response 200.

#### `DELETE /api/v1/admin/products/:id`
```json
// Response 200: { "message": "Product deleted." }
// Error 409: { "error": { "code": "HAS_CLASSES", "message": "Cannot delete a product that has active classes." } }
```

#### `GET /api/v1/admin/sessions`
```json
// Response 200
{
  "sessions": [
    {
      "id": "uuid",
      "classId": "uuid",
      "className": "Step 1 Intensive",
      "teacherId": "uuid",
      "teacherName": "Dr. James Carter",
      "productName": "USMLE Online Sessions",
      "scheduledAt": "2026-04-25T10:00:00Z",
      "durationMinutes": 90,
      "status": "scheduled",
      "meetingLink": "https://zoom.us/j/1234567890",
      "attendanceCount": null,
      "actualDurationMinutes": null,
      "changeNote": null,
      "recordingUrl": null
    }
  ]
}
```

#### `PATCH /api/v1/admin/sessions/:id`
```json
// Request (changeNote is always required)
{ "scheduledAt": "2026-04-26T10:00:00Z", "durationMinutes": 120, "changeNote": "Rescheduled due to teacher conflict." }
// Response 200: { "message": "Session updated." }
```

#### `PATCH /api/v1/admin/sessions/:id/cancel`
No body. Response 200.

#### `GET /api/v1/admin/demo-overrides`
```json
// Response 200
{
  "overrides": [
    {
      "studentId": "uuid",
      "studentName": "Omar Farooq",
      "studentEmail": "omar@student.com",
      "demoExpiresAt": "2026-04-26T00:00:00Z",
      "overriddenByAdminId": "admin-uuid",
      "overriddenAt": "2026-04-24T14:00:00Z"
    }
  ]
}
```

#### `PATCH /api/v1/admin/students/:id/demo-override`
```json
// Request — extend
{ "type": "extend", "days": 7 }

// Request — full access
{ "type": "full_access" }

// Request — reset to expired
{ "type": "reset" }

// Response 200
{
  "override": {
    "studentId": "uuid",
    "demoExpiresAt": "2026-05-01T14:00:00Z",
    "overriddenByAdminId": "admin-uuid",
    "overriddenAt": "2026-04-24T14:00:00Z"
  }
}
```

---

### Teacher

#### `GET /api/v1/teacher/classes`
Requires teacher token.
```json
// Response 200
{
  "classes": [
    {
      "id": "uuid",
      "name": "Step 1 Intensive",
      "description": "...",
      "productId": "uuid",
      "productName": "USMLE Online Sessions",
      "teacherId": "uuid",
      "defaultDurationMinutes": 90,
      "enrolledStudentCount": 12,
      "nextSession": {
        "id": "uuid",
        "scheduledAt": "2026-04-25T10:00:00Z",
        "status": "scheduled"
      },
      "createdAt": "2026-04-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/teacher/classes/:classId/sessions`
```json
// Response 200
{
  "sessions": [
    {
      "id": "uuid",
      "class_id": "uuid",
      "scheduled_at": "2026-04-25T10:00:00Z",
      "duration_minutes": 90,
      "status": "scheduled",
      "meeting_link": "https://zoom.us/j/...",
      "attendance_count": null,
      "actual_duration_minutes": null,
      "change_note": null
    }
  ]
}
```

#### `POST /api/v1/teacher/sessions`
```json
// Request
{ "classId": "uuid", "scheduledAt": "2026-04-25T10:00:00Z", "durationMinutes": 90 }
// Response 201: { "session": { ...full session row... } }
// Error 403: class doesn't belong to this teacher
```

#### `PATCH /api/v1/teacher/sessions/:id`
```json
// changeNote always required
{ "scheduledAt": "2026-04-26T10:00:00Z", "changeNote": "Moving to tomorrow due to public holiday." }
// Response 200: { "message": "Session updated." }
```

#### `POST /api/v1/teacher/sessions/:id/start`
No body. Flips status → `live`, sets `started_at`.
```json
// Response 200: { "message": "Session started. Students will be notified." }
// Error 400: { "code": "INVALID_STATUS", "message": "Session is not in scheduled state." }
```

#### `POST /api/v1/teacher/sessions/:id/end`
No body. Flips status → `completed`, computes `actual_duration_minutes`.
```json
// Response 200: { "message": "Session ended.", "actualDurationMinutes": 87 }
```

#### `PATCH /api/v1/teacher/sessions/:id/cancel`
No body.
```json
// Response 200: { "message": "Session cancelled." }
// Error 400: { "code": "INVALID_STATUS", "message": "Only scheduled sessions can be cancelled." }
```

#### `GET /api/v1/teacher/classes/:classId/notices`
```json
// Response 200: { "notices": [ { "id", "class_id", "title", "content", "type", "file_name", "created_at" } ] }
```

#### `POST /api/v1/teacher/notices`
```json
// Request
{ "classId": "uuid", "title": "Week 1 Study Guide", "content": "", "type": "pdf", "fileName": "week1.pdf" }
// Response 201: { "notice": { ...full notice row... } }
```

#### `DELETE /api/v1/teacher/notices/:id`
```json
// Response 200: { "message": "Notice deleted." }
// Error 403: notice doesn't belong to this teacher
```

---

### Editor

All editor endpoints mirror admin equivalents but use `/editor/` prefix and require editor token.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/editor/teachers` | List all teachers |
| PATCH | `/api/v1/editor/teachers/:id/approve` | Approve teacher |
| PATCH | `/api/v1/editor/teachers/:id/reject` | Reject teacher |
| GET | `/api/v1/editor/sessions` | All sessions across all classes |
| PATCH | `/api/v1/editor/sessions/:id` | Edit session (changeNote required) |
| PATCH | `/api/v1/editor/sessions/:id/cancel` | Cancel session |

---

### Student

#### `GET /api/v1/student/classes`
Requires student token.
```json
// Response 200
{
  "classes": [
    {
      "id": "uuid",
      "name": "Step 1 Intensive",
      "productName": "USMLE Online Sessions",
      "teacherName": "Dr. James Carter",
      "defaultDurationMinutes": 90,
      "nextSession": { "id": "uuid", "scheduledAt": "...", "status": "live", "meetingLink": "https://zoom.us/j/..." },
      "enrolledAt": "2026-04-01T00:00:00Z",
      "demoExpiresAt": null
    }
  ]
}
```

#### `GET /api/v1/student/classes/:classId`
Returns single class detail. 403 if not enrolled.

#### `GET /api/v1/student/classes/:classId/sessions`
`meetingLink` is `null` unless `status === 'live'` — meeting link is only revealed when the session is actually live.

#### `GET /api/v1/student/classes/:classId/notices`
403 if not enrolled.

---

### Public

#### `GET /api/v1/products`
No auth. Returns active products for the homepage.

---

## 8. Zoom API Integration

Meeting links are generated server-side when a session is created. The `generateZoomMeetingLink()` function in `backend/src/lib/zoom.ts` is a placeholder in the first half. When Zoom credentials are ready:

### Setup Steps (Zoom Marketplace)
1. Go to [marketplace.zoom.us](https://marketplace.zoom.us) → Build App → **Server-to-Server OAuth**
2. Note the **Account ID**, **Client ID**, **Client Secret**
3. Add these to `.env`:
   ```
   ZOOM_ACCOUNT_ID=your_account_id
   ZOOM_CLIENT_ID=your_client_id
   ZOOM_CLIENT_SECRET=your_client_secret
   ```
4. Grant scopes: `meeting:write:admin`

### Token Flow
The Server-to-Server OAuth grant does not require user interaction. The backend exchanges credentials for an access token on each API call (or caches it until it expires — 1 hour TTL):

```typescript
async function getZoomAccessToken(): Promise<string> {
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    }
  )
  const { access_token } = await res.json()
  return access_token
}
```

### Meeting Creation
Called inside `POST /api/v1/teacher/sessions` when a session is created:

```typescript
async function generateZoomMeetingLink(topic: string, scheduledAt: string, durationMinutes: number): Promise<string> {
  const token = await getZoomAccessToken()
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      type: 2,                    // scheduled meeting
      start_time: scheduledAt,    // ISO 8601 format
      duration: durationMinutes,
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
      },
    }),
  })
  const meeting = await res.json()
  return meeting.join_url          // store this in lms_sessions.meeting_link
}
```

> **Important:** The `join_url` is stored in `lms_sessions.meeting_link`. Students only receive it when `status === 'live'` (enforced in `GET /student/classes/:classId/sessions`).

---

## 9. Frontend ↔ Backend Connection Guide

The frontend is designed so that **only `src/services/lmsApi.ts` needs to change** when swapping from mock to real backend. Every page reads through this service. Nothing else needs to be touched.

### Step 1 — Update Auth Contexts

**`TeacherAuthContext.tsx`** — `login()` currently calls `loginTeacher()` from `lmsApi.ts`. Update the service function:

```typescript
// BEFORE (mock in lmsApi.ts):
export async function loginTeacher(email: string, password: string): Promise<Teacher> {
  const teachers = getTeachers()
  const match = teachers.find(t => t.email === email)
  const pwd = getTeacherPassword(match?.id ?? '')
  if (!match || pwd !== password) throw new Error('Invalid email or password.')
  return match
}

// AFTER (real):
export async function loginTeacher(email: string, password: string): Promise<{ teacher: Teacher; session: Session }> {
  const res = await fetch(`${API_BASE}/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error.message)
  }
  return res.json()
}
```

Then update `TeacherAuthContext.tsx` to store `session.access_token` alongside the teacher object.

**`EditorAuthContext.tsx`** — same pattern, calls `/auth/editor/login`.

### Step 2 — Function-by-Function Swap Table

Every `// BACKEND SWAP` comment in `lmsApi.ts` maps to a real endpoint:

| Mock function | Real endpoint | Auth header |
|---|---|---|
| `registerTeacher(payload)` | `POST /auth/teacher/register` | none |
| `loginTeacher(email, pass)` | `POST /auth/teacher/login` | none |
| `loginEditor(email, pass)` | `POST /auth/editor/login` | none |
| `getTeacherClasses(teacherId)` | `GET /teacher/classes` | teacher token |
| `getTeacherSessions(classId)` | `GET /teacher/classes/:classId/sessions` | teacher token |
| `createSession(payload)` | `POST /teacher/sessions` | teacher token |
| `updateSession(id, payload)` | `PATCH /teacher/sessions/:id` | teacher token |
| `startSession(id)` | `POST /teacher/sessions/:id/start` | teacher token |
| `endSession(id)` | `POST /teacher/sessions/:id/end` | teacher token |
| `cancelSession(id)` | `PATCH /teacher/sessions/:id/cancel` | teacher token |
| `getNoticesForClass(classId)` | `GET /teacher/classes/:classId/notices` | teacher token |
| `createNotice(payload)` | `POST /teacher/notices` | teacher token |
| `deleteNotice(id)` | `DELETE /teacher/notices/:id` | teacher token |
| `adminGetTeachers()` | `GET /admin/teachers` | admin token |
| `adminApproveTeacher(id)` | `PATCH /admin/teachers/:id/approve` | admin token |
| `adminRejectTeacher(id)` | `PATCH /admin/teachers/:id/reject` | admin token |
| `adminReinstateTeacher(id)` | `PATCH /admin/teachers/:id/reinstate` | admin token |
| `adminCreateEditor(payload)` | `POST /admin/editors` | admin token |
| `adminGetProducts()` | `GET /admin/products` | admin token |
| `adminCreateProduct(payload)` | `POST /admin/products` | admin token |
| `adminUpdateProduct(id, p)` | `PATCH /admin/products/:id` | admin token |
| `adminDeleteProduct(id)` | `DELETE /admin/products/:id` | admin token |
| `adminGetAllSessions()` | `GET /admin/sessions` | admin token |
| `adminUpdateSession(id, p)` | `PATCH /admin/sessions/:id` | admin token |
| `adminCancelSession(id)` | `PATCH /admin/sessions/:id/cancel` | admin token |
| `adminGetDemoOverrides()` | `GET /admin/demo-overrides` | admin token |
| `adminSetDemoOverride(...)` | `PATCH /admin/students/:id/demo-override` | admin token |
| `studentGetEnrolledClasses(id)` | `GET /student/classes` | student token |
| `getClassById(classId)` | `GET /student/classes/:classId` | student token |
| `studentGetSessionsForClass(id)` | `GET /student/classes/:classId/sessions` | student token |
| `getNoticesForClass(classId)` | `GET /student/classes/:classId/notices` | student token |
| `getAllClassesWithProducts()` | `GET /admin/products` (includes classIds) | admin token |
| `getProducts()` (homepage) | `GET /products` | none |

### Step 3 — Token Passing Pattern

Each auth context already stores a `session` object. Pass it to every authenticated call:

```typescript
// In TeacherAuthContext.tsx:
const { teacher, session } = useTeacherAuth()

// Then in every lmsApi call:
getTeacherClasses(teacher.id, session!.accessToken)
```

Update function signatures in `lmsApi.ts` to accept `accessToken` as a parameter.

### Step 4 — Delete Mock Data Layer

Once backend is live and all functions are swapped:
1. Delete `frontend/src/data/lms.ts`
2. Remove all localStorage keys starting with `nextgen.lms.*`
3. Remove mock seed data imports from anywhere they were used

---

## 10. Frontend File Reference

| File | Purpose |
|---|---|
| `src/types/lms.ts` | All TypeScript interfaces — no changes needed on backend swap |
| `src/data/lms.ts` | **Delete after backend swap.** Mock localStorage data. |
| `src/services/lmsApi.ts` | **Only file to change on backend swap.** All `// BACKEND SWAP` comments. |
| `src/context/TeacherAuthContext.tsx` | Teacher auth state — store `session.access_token` after swap |
| `src/context/EditorAuthContext.tsx` | Editor auth state — same |
| `src/components/routing/TeacherProtectedRoute.tsx` | Redirects pending teachers to `/teacher/pending` |
| `src/components/routing/EditorProtectedRoute.tsx` | Redirects unauthenticated editors to `/editor/login` |
| `src/layouts/TeacherLayout.tsx` | Teacher sidebar |
| `src/layouts/EditorLayout.tsx` | Editor sidebar |
| `src/layouts/PublicLayout.tsx` | Public navbar/footer for About/Contact/FAQs |
| `src/pages/teacher/auth/TeacherRegisterPage.tsx` | Calls `registerTeacher()` |
| `src/pages/teacher/auth/TeacherLoginPage.tsx` | Calls `loginTeacher()` |
| `src/pages/teacher/auth/TeacherPendingPage.tsx` | Shown when `teacher.status === 'pending'` |
| `src/pages/teacher/TeacherDashboardPage.tsx` | Calls `getTeacherClasses()`, `getTeacherSessions()` |
| `src/pages/teacher/TeacherClassesPage.tsx` | Calls `getTeacherClasses()` |
| `src/pages/teacher/TeacherClassDetailPage.tsx` | Calls sessions, notices; has start/end/cancel actions |
| `src/pages/teacher/TeacherSessionFormPage.tsx` | Calls `createSession()` / `updateSession()` |
| `src/pages/editor/auth/EditorLoginPage.tsx` | Calls `loginEditor()` |
| `src/pages/editor/EditorDashboardPage.tsx` | Calls `adminGetTeachers()`, `adminGetAllSessions()` |
| `src/pages/editor/EditorSessionsPage.tsx` | Calls `adminGetAllSessions()`, update/cancel |
| `src/pages/editor/EditorSupervisionPage.tsx` | Shell — chat backend in second half |
| `src/pages/admin/AdminTeachersPage.tsx` | Teacher approval + editor creation |
| `src/pages/admin/AdminProductsPage.tsx` | Product CRUD |
| `src/pages/admin/AdminLmsSessionsPage.tsx` | All sessions management |
| `src/pages/admin/AdminStudentsPage.tsx` | Demo override column + modal |
| `src/pages/student/MyClassesPage.tsx` | Calls `studentGetEnrolledClasses()` |
| `src/pages/student/LiveSessionPage.tsx` | Calls `getClassById()`, `studentGetSessionsForClass()`, `getNoticesForClass()` |
| `src/pages/public/HomePage.tsx` | Calls `getProducts()` → maps to `GET /products` |
| `src/styles/teacher.css` | All teacher portal styles |
| `src/styles/editor.css` | All editor portal styles |
| `src/styles/lms-student.css` | Student LMS page styles |

---

## 11. Step-by-Step Implementation Order

Follow this exact sequence to avoid dependency issues.

```
Step 1   Run SQL migration 004_lms.sql in Supabase SQL Editor
Step 2   Update backend/src/config/env.ts — add 'teacher', 'editor' to ROLE_TYPES
Step 3   Create backend/src/lib/zoom.ts — generateZoomMeetingLink() placeholder
Step 4   Update backend/src/routes/auth.ts — add teacher register/login, editor login
Step 5   Create backend/src/routes/lmsPublic.ts — GET /products (no auth)
Step 6   Create backend/src/routes/lmsAdmin.ts — all admin endpoints
Step 7   Create backend/src/routes/lmsTeacher.ts — all teacher endpoints
Step 8   Create backend/src/routes/lmsEditor.ts — all editor endpoints
Step 9   Create backend/src/routes/lmsStudent.ts — all student endpoints
Step 10  Update backend/src/app.ts — mount all 5 new routers
Step 11  Test all endpoints with Postman/curl (see Section 12)
Step 12  Update frontend/src/services/lmsApi.ts — swap all mock functions with real fetch calls
Step 13  Update TeacherAuthContext.tsx — store access_token from login response
Step 14  Update EditorAuthContext.tsx — same
Step 15  Update all frontend pages — pass accessToken from context to service functions
Step 16  Delete frontend/src/data/lms.ts — no longer needed
Step 17  End-to-end test — full flows (see Section 12)
Step 18  (Optional) Wire up real Zoom API — replace placeholder in zoom.ts
```

---

## 12. Testing Checklist

### Auth
- [ ] Teacher registers → status is `pending`
- [ ] Pending teacher logs in → response has `status: 'pending'` → frontend redirects to `/teacher/pending`
- [ ] Approved teacher logs in → `status: 'approved'` → reaches dashboard
- [ ] Suspended teacher logs in → `403 ACCOUNT_SUSPENDED`
- [ ] Editor logs in with admin-created credentials
- [ ] Student JWT cannot access `/teacher/*` routes (403)
- [ ] Teacher JWT cannot access `/admin/*` routes (403)
- [ ] Editor JWT cannot access `/admin/*` routes (403)
- [ ] Unauthenticated request to any protected route returns 401

### Admin — Teachers
- [ ] `GET /admin/teachers` returns all teachers with class counts
- [ ] Approving a pending teacher allows them to log in and reach dashboard
- [ ] Rejecting sets status to `suspended`
- [ ] Reinstating a suspended teacher sets status back to `approved`

### Admin — Editors
- [ ] `POST /admin/editors` creates an editor who can log in at `/editor/login`
- [ ] Editor cannot register themselves (no public registration endpoint)

### Admin — Products
- [ ] Create product → appears in `GET /products` (public) if `isActive: true`
- [ ] Inactive product does NOT appear in public products list
- [ ] Delete product with active classes → returns 409
- [ ] Delete product with no classes → succeeds

### Admin — Sessions
- [ ] `GET /admin/sessions` returns sessions across all classes with teacher + product names
- [ ] Edit session with changeNote → `change_note` column updated
- [ ] Cancel a `scheduled` session → status becomes `cancelled`
- [ ] Cancel a `completed` session → no change (filtered by `.in('status', ['scheduled', 'live'])`)

### Admin — Demo Overrides
- [ ] Extend by 7 days → `demo_expires_at` set to now + 7 days; all student's enrollments updated
- [ ] Grant full access → `demo_expires_at` is null
- [ ] Reset → `demo_expires_at` set to now (immediately expired)

### Teacher
- [ ] `GET /teacher/classes` returns only classes assigned to the authenticated teacher
- [ ] Teacher cannot fetch sessions for another teacher's class (403)
- [ ] Create session → Zoom link auto-generated, stored in `lms_sessions.meeting_link`
- [ ] Edit session → `changeNote` is required — validation error if missing
- [ ] Start session → status flips to `live`, `started_at` set
- [ ] End session → status flips to `completed`, `actual_duration_minutes` computed
- [ ] Cancel session → only works on `scheduled` sessions
- [ ] Post notice → appears in class notice board
- [ ] Delete own notice → succeeds
- [ ] Delete another teacher's notice → 403

### Editor
- [ ] Editor can approve/reject teachers
- [ ] Editor can view all sessions (same as admin view)
- [ ] Editor can edit/cancel any session with changeNote

### Student
- [ ] `GET /student/classes` returns only enrolled classes
- [ ] Student accessing a class they are not enrolled in → 403
- [ ] Sessions list: `meetingLink` is `null` for `scheduled` sessions, populated for `live` sessions
- [ ] Demo access: student with expired `demo_expires_at` should be gated (second half — access control enforcement)

### Public
- [ ] `GET /products` returns only `is_active = true` products
- [ ] No auth token needed for `GET /products`

---

*Second half backend plan will be appended below this line after second half frontend is complete.*

---

---

# LMS Backend Plan — Second Half

## Table of Contents
1. [Overview & New Feature Scope](#1-overview--new-feature-scope)
2. [Database Schema — Migration 005](#2-database-schema--migration-005)
3. [Row Level Security — New Tables](#3-row-level-security--new-tables)
4. [Backend File Structure Changes](#4-backend-file-structure-changes)
5. [New & Modified Route Files](#5-new--modified-route-files)
6. [Every Endpoint — Request & Response](#6-every-endpoint--request--response)
7. [Stripe Payment Integration](#7-stripe-payment-integration)
8. [Frontend ↔ Backend Connection Guide](#8-frontend--backend-connection-guide)
9. [Frontend BACKEND SWAP Reference](#9-frontend-backend-swap-reference)
10. [Step-by-Step Implementation Order](#10-step-by-step-implementation-order)
11. [Testing Checklist](#11-testing-checklist)

---

## 1. Overview & New Feature Scope

The second half adds the payment/enrollment pipeline, chat, attendance, notifications, coupons, recordings management, and analytics on top of the first-half foundation.

### What was mocked in first half, now needs real backend:
| Frontend mock | Real backend work |
|---|---|
| `submitCheckout()` — fake 1.5s delay | Stripe PaymentIntent + enrollment creation |
| `getChatMessagesForClass()` — localStorage | `lms_chat_messages` table |
| `getAttendanceForClass()` — deterministic random | `lms_attendance_records` table |
| `getStudentLmsNotifications()` — hardcoded seed | `lms_notifications` table |
| `getStudentNotificationPrefs()` — per-key localStorage | `lms_notification_prefs` table |
| `getAllCoupons()`, `validateCoupon()` — localStorage | `lms_coupons` table |
| `getRecordingsForClass()` — reads `recording_url` from session | Already stored in `lms_sessions.recording_url` — just needs real endpoint |
| `getTeacherAnalytics()` — computed from localStorage sessions | SQL aggregation on real tables |
| `adminGetClasses()`, `adminCreateClass()` — localStorage | `lms_classes` table — partly done in first half, enrollment management is new |
| `adminGetEnrollmentsForClass()`, `adminEnrollStudent()` — localStorage | `lms_enrollments` table |

### New user flows added in second half:

**Student:**
- Browse programs → view product detail → checkout (pay) → auto-enrolled → access My Classes
- Chat with teacher per class
- See attendance per class (per-session breakdown)
- Watch recorded sessions (recording URL from completed session)
- Receive in-app LMS notifications
- Set notification preferences (email, push, WhatsApp)
- View billing history + cancel plan
- Edit profile (name, phone)

**Teacher:**
- Respond to student chat messages per class
- Upload/remove recording URL on completed sessions
- View analytics (sessions, attendance rates, duration)
- See attendance per session (how many students attended)

**Admin:**
- Create classes, assign product + teacher
- Enroll students in classes with full or demo access
- Remove enrollments
- Manage coupon codes (create, toggle, delete)
- Supervise all chat threads across all classes
- Soft-delete individual messages
- Flag conversations for review

---

## 2. Database Schema — Migration 005

Run **Migration 005** in the Supabase SQL Editor after Migration 004.

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 005 — LMS Second Half Tables
-- Run AFTER migration 004
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Chat Messages ───────────────────────────────────────────────────────────
-- One row per message. Each thread is scoped to (class_id, student_id).
-- Teacher replies to a student share the same (class_id, student_id) pair
-- but have sender_role = 'teacher'.
-- is_deleted = true = soft-deleted (still visible to admin, hidden to others).
CREATE TABLE IF NOT EXISTS lms_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES lms_classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL
    CONSTRAINT sender_role_values CHECK (sender_role IN ('student', 'teacher')),
  text        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  flagged     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Attendance Records ──────────────────────────────────────────────────────
-- One row per (session, student). Inserted by teacher or auto-populated
-- via Zoom webhook when real integration is set up.
-- status: 'attended' | 'missed' | 'cancelled' (cancelled = session was cancelled)
CREATE TABLE IF NOT EXISTS lms_attendance_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES lms_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL
    CONSTRAINT attendance_status_values CHECK (status IN ('attended', 'missed', 'cancelled')),
  joined_at  TIMESTAMPTZ,  -- populated if student joined Zoom (future Zoom webhook)
  left_at    TIMESTAMPTZ,  -- populated when student leaves
  CONSTRAINT attendance_unique UNIQUE (session_id, student_id)
);

-- ─── Coupons ─────────────────────────────────────────────────────────────────
-- Discount codes. product_id = NULL means valid for all products.
-- expires_at = NULL means never expires.
-- max_uses = NULL means unlimited uses.
CREATE TABLE IF NOT EXISTS lms_coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  discount_type  TEXT NOT NULL
    CONSTRAINT discount_type_values CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL
    CONSTRAINT discount_value_positive CHECK (discount_value > 0),
  max_uses       INTEGER,
  uses_count     INTEGER NOT NULL DEFAULT 0,
  product_id     UUID REFERENCES lms_products(id) ON DELETE SET NULL,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
-- One row per checkout attempt. status starts as 'pending', becomes 'paid'
-- when Stripe confirms. Enrollment is created inside the checkout handler
-- optimistically (for mock), or inside Stripe webhook handler (for real).
CREATE TABLE IF NOT EXISTS lms_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id                UUID NOT NULL REFERENCES lms_products(id) ON DELETE RESTRICT,
  plan                      TEXT NOT NULL
    CONSTRAINT order_plan_values CHECK (plan IN ('upfront', 'installment')),
  amount_paid               NUMERIC(10,2) NOT NULL,
  coupon_id                 UUID REFERENCES lms_coupons(id) ON DELETE SET NULL,
  stripe_payment_intent_id  TEXT,           -- NULL until Stripe is wired
  stripe_subscription_id    TEXT,           -- populated for installment plans only
  status                    TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT order_status_values CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                   TIMESTAMPTZ,    -- set when Stripe confirms payment
  cancelled_at              TIMESTAMPTZ,    -- set when student cancels installment
  access_until              TIMESTAMPTZ     -- end of last paid month; access revoked after this
);

-- ─── Notification Preferences ────────────────────────────────────────────────
-- One row per student. Upserted on first save.
CREATE TABLE IF NOT EXISTS lms_notification_prefs (
  student_id               UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_session_reminders  BOOLEAN NOT NULL DEFAULT true,
  email_new_notices        BOOLEAN NOT NULL DEFAULT true,
  email_chat_replies       BOOLEAN NOT NULL DEFAULT true,
  push_session_reminders   BOOLEAN NOT NULL DEFAULT false,
  push_new_notices         BOOLEAN NOT NULL DEFAULT false,
  whatsapp_opt_in          BOOLEAN NOT NULL DEFAULT false,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LMS Notifications (in-app alerts) ───────────────────────────────────────
-- Inserted by backend when relevant events occur (session starting, notice posted,
-- demo expiring, chat reply received, enrollment confirmed).
-- type drives the icon shown in the frontend InboxPage LMS tab.
CREATE TABLE IF NOT EXISTS lms_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
    -- Valid values: 'session_starting' | 'notice_posted' | 'demo_expiring'
    --               | 'chat_reply' | 'enrollment_confirmed'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  class_id   UUID REFERENCES lms_classes(id) ON DELETE SET NULL,
  session_id UUID REFERENCES lms_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lms_chat_class_student  ON lms_chat_messages(class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lms_chat_created        ON lms_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_lms_attendance_session  ON lms_attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_lms_attendance_student  ON lms_attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_coupons_code        ON lms_coupons(code);
CREATE INDEX IF NOT EXISTS idx_lms_orders_student      ON lms_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_orders_product      ON lms_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_lms_notifs_student      ON lms_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_lms_notifs_read         ON lms_notifications(student_id, is_read);
```

### Full Table Relationship Map (First Half + Second Half)

```
profiles (role = 'student')
  ↓ via lms_enrollments            → lms_classes
  ↓ via lms_attendance_records     → lms_sessions
  ↓ via lms_chat_messages          → lms_classes  (student_id + class_id = one thread)
  ↓ via lms_orders                 → lms_products
  ↓ via lms_notification_prefs     (1:1 preferences row)
  ↓ via lms_notifications          (many in-app alerts)
  ↓ via lms_demo_overrides         (admin-set demo expiry)

lms_products
  ↓ via lms_classes                (one product → many classes/cohorts)
  ↓ via lms_coupons                (coupon.product_id = NULL means all products)
  ↓ via lms_orders                 (each order references one product)

lms_classes
  ↓ via lms_sessions               (many sessions per class)
  ↓ via lms_enrollments            (many students per class)
  ↓ via lms_chat_messages          (messages scoped to class + student)
  ↓ via lms_notifications          (class_id on notifications for deep-linking)

lms_sessions
  ↓ via lms_attendance_records     (one record per student per session)
  recording_url on lms_sessions    (teacher sets this after session ends)

lms_coupons
  ↓ via lms_orders                 (coupon_id on order for tracking which code was used)
```

---

## 3. Row Level Security — New Tables

```sql
-- Enable RLS
ALTER TABLE lms_chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_notification_prefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_notifications       ENABLE ROW LEVEL SECURITY;

-- All backend routes use supabaseServiceClient (service role) which bypasses RLS.
-- These policies protect against any accidental direct-client queries.

-- lms_chat_messages
--   Student: sees their own messages in their enrolled classes
CREATE POLICY "Student reads own chat" ON lms_chat_messages
  FOR SELECT USING (
    student_id = auth.uid()
    AND NOT is_deleted
  );

--   Teacher: sees all messages in their classes
CREATE POLICY "Teacher reads class chat" ON lms_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_classes
      WHERE lms_classes.id = lms_chat_messages.class_id
        AND lms_classes.teacher_id = auth.uid()
    )
    AND NOT is_deleted
  );

CREATE POLICY "Service role full access on lms_chat_messages" ON lms_chat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- lms_attendance_records: student reads own, teacher reads class attendance
CREATE POLICY "Student reads own attendance" ON lms_attendance_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teacher reads class attendance" ON lms_attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lms_sessions
        JOIN lms_classes ON lms_classes.id = lms_sessions.class_id
      WHERE lms_sessions.id = lms_attendance_records.session_id
        AND lms_classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on lms_attendance_records" ON lms_attendance_records
  FOR ALL USING (auth.role() = 'service_role');

-- lms_coupons: no direct client access — admin only via service role
CREATE POLICY "Service role full access on lms_coupons" ON lms_coupons
  FOR ALL USING (auth.role() = 'service_role');

-- lms_orders: student reads own orders
CREATE POLICY "Student reads own orders" ON lms_orders
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Service role full access on lms_orders" ON lms_orders
  FOR ALL USING (auth.role() = 'service_role');

-- lms_notification_prefs: student reads/writes own row
CREATE POLICY "Student manages own notification prefs" ON lms_notification_prefs
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Service role full access on lms_notification_prefs" ON lms_notification_prefs
  FOR ALL USING (auth.role() = 'service_role');

-- lms_notifications: student reads own notifications
CREATE POLICY "Student reads own notifications" ON lms_notifications
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Service role full access on lms_notifications" ON lms_notifications
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 4. Backend File Structure Changes

```
backend/src/
├── routes/
│   ├── lmsAdmin.ts        ← MODIFY: add classes, enrollment, coupons, chat supervision endpoints
│   ├── lmsTeacher.ts      ← MODIFY: add chat reply, recording, analytics endpoints
│   ├── lmsStudent.ts      ← MODIFY: add chat, attendance, notifications, prefs, profile, orders
│   ├── lmsPublic.ts       ← MODIFY: add programs listing + product detail endpoints
│   └── lmsPayments.ts     ← CREATE NEW: checkout, Stripe webhook
├── lib/
│   ├── stripe.ts          ← CREATE NEW: Stripe helper (createPaymentIntent, constructWebhookEvent)
│   └── notify.ts          ← CREATE NEW: helper to insert lms_notifications rows + trigger emails
├── app.ts                 ← MODIFY: mount lmsPaymentsRouter
└── sql/
    └── 005_lms_second_half.sql  ← CREATE: migration file (SQL from Section 2)
```

### `backend/src/app.ts` — add payments router

```typescript
import { lmsPaymentsRouter } from './routes/lmsPayments.js'

// Add after existing LMS routers:
app.use('/api/v1', lmsPaymentsRouter)
```

---

## 5. New & Modified Route Files

### `backend/src/lib/stripe.ts`

```typescript
import Stripe from 'stripe'
import { env } from '../config/env.js'

// STRIPE SWAP: Set STRIPE_SECRET_KEY in .env when going live.
// Test key starts with sk_test_, live key with sk_live_.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export async function createPaymentIntent(
  amountCents: number,
  metadata: { studentId: string; productId: string; orderId: string }
): Promise<string> {
  // STRIPE SWAP: Replace this entire function body with real Stripe call.
  // The mock just returns a fake client secret for development.
  if (env.NODE_ENV !== 'production') {
    return `pi_mock_${Date.now()}_secret_mock`
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata,
    automatic_payment_methods: { enabled: true },
  })
  return intent.client_secret!
}
```

Add to `backend/src/config/env.ts`:
```typescript
STRIPE_SECRET_KEY:        z.string().default('sk_test_placeholder'),
STRIPE_WEBHOOK_SECRET:    z.string().default('whsec_placeholder'),
```

### `backend/src/lib/notify.ts`

Helper that inserts rows into `lms_notifications` and (in future) triggers emails.

```typescript
import { supabaseServiceClient } from './supabase.js'

type NotificationType =
  | 'session_starting'
  | 'notice_posted'
  | 'demo_expiring'
  | 'chat_reply'
  | 'enrollment_confirmed'

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
  // EMAIL SWAP: After inserting the notification row, trigger an email here.
  // Use Resend / SendGrid / SES — check student's lms_notification_prefs
  // to decide whether to send email (e.g. email_chat_replies = true → send).
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
```

---

## 6. Every Endpoint — Request & Response

### New env variables required

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### `lmsPayments.ts` — Payments & Checkout

#### `POST /api/v1/payments/checkout`

**Auth:** Student JWT required

**Purpose:** Creates an order, validates coupon, computes price, creates Stripe PaymentIntent (mock in dev), enrolls student in the class for that product.

**Request body:**
```json
{
  "productId": "uuid",
  "plan": "upfront",         // "upfront" | "installment"
  "couponCode": "STEP1SAVE20" // optional
}
```

**Logic:**
1. Fetch product — throw 404 if not found or inactive
2. Compute `basePrice` = `upfront_price` (if plan=upfront) or `installment_amount` (if plan=installment)
3. If `couponCode` provided → validate (see `POST /coupons/validate` logic below)
4. Apply discount → compute `amountPaid`
5. Create row in `lms_orders` with `status = 'pending'`
6. Call `createPaymentIntent(amountPaid * 100, { studentId, productId, orderId })`
7. **Mock (dev):** immediately set order status = 'paid', enroll student (steps 8–9)
8. Find class for this product (`SELECT id FROM lms_classes WHERE product_id = $productId LIMIT 1`)
9. Insert into `lms_enrollments` (`student_id`, `class_id`, `demo_expires_at = NULL` for paid)
10. If couponCode used: increment `lms_coupons.uses_count`
11. Insert `lms_notifications` row for student: type = 'enrollment_confirmed'
12. Return `{ clientSecret, orderId, enrolled: true }`

**Response `200`:**
```json
{
  "clientSecret": "pi_mock_..._secret_mock",
  "orderId": "uuid",
  "enrolled": true
}
```

**Real Stripe flow (production):**
- Step 7 changes: do NOT mark paid or enroll yet — return `clientSecret` to frontend
- Frontend uses Stripe.js to confirm payment using the `clientSecret`
- After payment confirms, Stripe sends a `payment_intent.succeeded` webhook event
- The webhook handler (see below) marks the order paid and creates the enrollment

> **Frontend note:** `CheckoutPage.tsx` calls `submitCheckout()` in `services/lmsApi.ts`. When swapping to real backend, change `submitCheckout` to: POST to `/api/v1/payments/checkout`, get `clientSecret` back, then use `stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })`.

---

#### `POST /api/v1/payments/webhook`

**Auth:** None (raw body, Stripe-signed)

**Purpose:** Receives Stripe events. On `payment_intent.succeeded`, marks order paid and enrolls student.

```typescript
// In app.ts — register BEFORE express.json() middleware so raw body is preserved:
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler)
```

**Logic:**
```typescript
lmsPaymentsRouter.post('/payments/webhook', async (req, res, next) => {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'] as string,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return res.status(400).send('Webhook signature verification failed')
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const { orderId, studentId, productId } = intent.metadata

    // Mark order paid
    await supabaseServiceClient
      .from('lms_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(),
                stripe_payment_intent_id: intent.id })
      .eq('id', orderId)

    // Find class for product and enroll student
    const { data: cls } = await supabaseServiceClient
      .from('lms_classes')
      .select('id')
      .eq('product_id', productId)
      .limit(1)
      .single()

    if (cls) {
      await supabaseServiceClient
        .from('lms_enrollments')
        .upsert({ student_id: studentId, class_id: cls.id, demo_expires_at: null },
                 { onConflict: 'student_id,class_id' })
    }

    await notifyStudent({
      studentId,
      type: 'enrollment_confirmed',
      title: 'Enrollment Confirmed',
      body: 'Your payment was successful. You are now enrolled in your class.',
      classId: cls?.id,
    })
  }

  return res.json({ received: true })
})
```

---

#### `GET /api/v1/student/orders`

**Auth:** Student JWT

**Purpose:** Student's billing history (billing page).

**Response `200`:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "productName": "USMLE Step 1 Online Sessions",
      "plan": "upfront",
      "amountPaid": 299.00,
      "status": "paid",
      "couponCode": "STEP1SAVE20",
      "createdAt": "2026-04-01T10:00:00Z",
      "paidAt": "2026-04-01T10:00:05Z"
    }
  ]
}
```

---

### `lmsAdmin.ts` — New Endpoints (append to existing file)

#### `GET /api/v1/admin/classes`

**Auth:** Admin JWT

**Response `200`:**
```json
{
  "classes": [
    {
      "id": "uuid",
      "name": "Step 1 Intensive Cohort",
      "description": "...",
      "productId": "uuid",
      "productName": "USMLE Step 1 Online Sessions",
      "teacherId": "uuid",
      "teacherName": "Dr. Ahmed",
      "defaultDurationMinutes": 90,
      "enrolledStudentCount": 12,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/admin/classes`

**Auth:** Admin JWT

**Request body:**
```json
{
  "productId": "uuid",
  "name": "Step 1 Intensive Cohort",
  "description": "Twice-weekly live sessions...",
  "teacherId": "uuid",
  "defaultDurationMinutes": 90
}
```

**Validation:**
- `teacherId` must exist in `lms_teacher_profiles` with `status = 'approved'`
- `productId` must exist in `lms_products` with `is_active = true`

**Response `201`:** Created class object.

---

#### `PATCH /api/v1/admin/classes/:id`

**Auth:** Admin JWT

**Request body:** Same fields as POST, all optional.

**Response `200`:** `{ "message": "Class updated." }`

---

#### `GET /api/v1/admin/classes/:classId/enrollments`

**Auth:** Admin JWT

**Response `200`:**
```json
{
  "enrollments": [
    {
      "studentId": "uuid",
      "studentName": "Alex Johnson",
      "studentEmail": "alex@email.com",
      "enrolledAt": "2026-03-01T00:00:00Z",
      "demoExpiresAt": null,
      "accessType": "full"
    }
  ]
}
```

`accessType` is derived: `null` demoExpiresAt = `"full"`, future = `"demo_active"`, past = `"demo_expired"`.

---

#### `POST /api/v1/admin/classes/:classId/enroll`

**Auth:** Admin JWT

**Purpose:** Admin manually enrolls a student. Used for direct admin enrollment (not the student-facing checkout).

**Request body:**
```json
{
  "studentId": "uuid",
  "accessType": "full",        // "full" | "demo"
  "demoDays": 7                // required if accessType = "demo"
}
```

**Logic:**
1. Verify student exists in `profiles` with `role = 'student'`
2. Compute `demoExpiresAt`: null if full, now + demoDays if demo
3. Upsert `lms_enrollments` (on conflict student_id+class_id → update demo_expires_at)
4. Insert `lms_notifications` row for student: type = 'enrollment_confirmed'

**Response `201`:** `{ "message": "Student enrolled." }`

---

#### `DELETE /api/v1/admin/classes/:classId/enrollments/:studentId`

**Auth:** Admin JWT

**Response `200`:** `{ "message": "Enrollment removed." }`

---

#### `GET /api/v1/admin/coupons`

**Auth:** Admin JWT

**Response `200`:**
```json
{
  "coupons": [
    {
      "id": "uuid",
      "code": "STEP1SAVE20",
      "discountType": "percentage",
      "discountValue": 20,
      "maxUses": 100,
      "usesCount": 14,
      "productId": null,
      "productName": null,
      "expiresAt": "2026-12-31T00:00:00Z",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/admin/coupons`

**Auth:** Admin JWT

**Request body:**
```json
{
  "code": "WELCOME50",
  "discountType": "fixed",
  "discountValue": 50,
  "maxUses": 50,
  "productId": "uuid",          // optional — null = all products
  "expiresAt": "2026-12-31T00:00:00Z"  // optional
}
```

**Validation:** `code` must be unique (throw 409 if duplicate).

**Response `201`:** Created coupon object.

---

#### `PATCH /api/v1/admin/coupons/:id`

**Auth:** Admin JWT

**Request body:** `{ "isActive": false }` — used to toggle coupon on/off.

**Response `200`:** `{ "message": "Coupon updated." }`

---

#### `DELETE /api/v1/admin/coupons/:id`

**Auth:** Admin JWT

**Guard:** Cannot delete if `uses_count > 0` (orders reference this coupon) — return 409.

**Response `200`:** `{ "message": "Coupon deleted." }`

---

#### `GET /api/v1/admin/chat`

**Auth:** Admin JWT

**Query params:** `?classId=uuid` (optional filter)

**Purpose:** Admin chat supervision — all messages across all classes.

**Response `200`:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "classId": "uuid",
      "className": "Step 1 Intensive Cohort",
      "studentId": "uuid",
      "studentName": "Alex Johnson",
      "senderRole": "student",
      "text": "Can you explain enzyme kinetics?",
      "isRead": true,
      "isDeleted": false,
      "flagged": false,
      "createdAt": "2026-04-01T09:30:00Z"
    }
  ]
}
```

Note: `is_deleted = true` messages ARE included in admin view (so admin can see what was deleted). They are hidden in student/teacher views.

---

#### `DELETE /api/v1/admin/chat/:messageId`

**Auth:** Admin JWT

**Purpose:** Soft-delete a message (sets `is_deleted = true`). Message still stored in DB for audit trail.

**Response `200`:** `{ "message": "Message deleted." }`

---

#### `POST /api/v1/admin/chat/:classId/:studentId/flag`

**Auth:** Admin JWT

**Purpose:** Flags all messages in a (class, student) thread as `flagged = true`.

**Response `200`:** `{ "message": "Conversation flagged.", "flaggedCount": 5 }`

---

### `lmsTeacher.ts` — New Endpoints (append to existing file)

#### `GET /api/v1/teacher/classes/:classId/chat`

**Auth:** Teacher JWT

**Purpose:** Teacher fetches all student threads in a class. Returns latest message per student for the thread list sidebar.

**Response `200`:**
```json
{
  "threads": [
    {
      "studentId": "uuid",
      "studentName": "Alex Johnson",
      "lastMessage": "Can you explain enzyme kinetics?",
      "lastMessageAt": "2026-04-01T09:30:00Z",
      "unreadCount": 2
    }
  ]
}
```

**SQL logic:** 
```sql
SELECT DISTINCT ON (student_id)
  student_id, text AS last_message, created_at AS last_message_at,
  COUNT(*) FILTER (WHERE NOT is_read AND sender_role = 'student') OVER (PARTITION BY student_id) AS unread_count
FROM lms_chat_messages
WHERE class_id = $classId AND NOT is_deleted
ORDER BY student_id, created_at DESC
```

---

#### `GET /api/v1/teacher/classes/:classId/chat/:studentId`

**Auth:** Teacher JWT

**Purpose:** Teacher fetches full message thread with a specific student.

**Response `200`:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "senderRole": "student",
      "text": "Can you explain enzyme kinetics?",
      "isRead": true,
      "createdAt": "2026-04-01T09:30:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/teacher/classes/:classId/chat/:studentId`

**Auth:** Teacher JWT

**Purpose:** Teacher replies to a student.

**Request body:** `{ "text": "Enzyme kinetics deals with..." }`

**Side effects:**
- Inserts message with `sender_role = 'teacher'`
- Calls `notifyStudent({ studentId, type: 'chat_reply', title: 'New reply from teacher', ... })`

**Response `201`:** Created message object.

---

#### `PATCH /api/v1/teacher/sessions/:sessionId/recording`

**Auth:** Teacher JWT

**Purpose:** Teacher adds or updates a recording URL on a completed session.

**Request body:** `{ "recordingUrl": "https://vimeo.com/..." }`

**Validation:** Session must belong to teacher's class AND have `status = 'completed'`.

**Response `200`:** `{ "message": "Recording URL saved." }`

---

#### `DELETE /api/v1/teacher/sessions/:sessionId/recording`

**Auth:** Teacher JWT

**Purpose:** Teacher removes a recording URL.

**Logic:** Sets `recording_url = NULL` on the session row.

**Response `200`:** `{ "message": "Recording URL removed." }`

---

#### `POST /api/v1/teacher/classes/:classId/sessions/:sessionId/attendance`

**Auth:** Teacher JWT

**Purpose:** Teacher submits attendance for a completed session (who attended, who missed).

**Request body:**
```json
{
  "records": [
    { "studentId": "uuid", "status": "attended" },
    { "studentId": "uuid", "status": "missed" }
  ]
}
```

**Logic:**
1. Verify session is `completed` and belongs to teacher's class
2. Bulk upsert `lms_attendance_records` (on conflict session_id+student_id → update status)
3. Update `lms_sessions.attendance_count` = number of 'attended' records

**Response `200`:** `{ "message": "Attendance recorded.", "attendedCount": 8 }`

---

#### `GET /api/v1/teacher/analytics`

**Auth:** Teacher JWT

**Purpose:** Teacher's analytics dashboard.

**Logic:**
1. Get all classes for teacher
2. Get all completed sessions across those classes
3. For each session: get attendance records, compute attended count / total enrolled
4. Aggregate: `avgAttendanceRate`, `avgActualDuration`, `totalStudentsTaught`, `sessionsCompleted`

**Response `200`:**
```json
{
  "analytics": {
    "sessionsCompleted": 12,
    "avgAttendanceRate": 78,
    "avgActualDurationMinutes": 87,
    "totalStudentsTaught": 24,
    "perSession": [
      {
        "sessionId": "uuid",
        "scheduledAt": "2026-03-15T10:00:00Z",
        "attendanceRate": 85,
        "actualDurationMinutes": 92,
        "attendedCount": 11,
        "totalEnrolled": 13
      }
    ]
  }
}
```

---

### `lmsStudent.ts` — New Endpoints (append to existing file)

#### `GET /api/v1/student/classes/:classId/chat`

**Auth:** Student JWT

**Purpose:** Student fetches their own message thread in a class.

**Guard:** Student must be enrolled in the class.

**Side effect:** Marks all unread messages from teacher as read.

**Response `200`:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "senderRole": "student",
      "text": "Can you explain enzyme kinetics?",
      "isRead": true,
      "createdAt": "2026-04-01T09:30:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/student/classes/:classId/chat`

**Auth:** Student JWT

**Request body:** `{ "text": "Can you explain enzyme kinetics?" }`

**Guard:** Student must be enrolled + not on expired demo.

**Response `201`:** Created message object.

---

#### `GET /api/v1/student/classes/:classId/attendance`

**Auth:** Student JWT

**Purpose:** Student's attendance for all sessions in a class.

**Response `200`:**
```json
{
  "attendance": {
    "attendedCount": 8,
    "missedCount": 2,
    "cancelledCount": 1,
    "attendanceRate": 80,
    "records": [
      {
        "sessionId": "uuid",
        "scheduledAt": "2026-03-01T10:00:00Z",
        "status": "attended"
      }
    ]
  }
}
```

---

#### `GET /api/v1/student/notifications`

**Auth:** Student JWT

**Response `200`:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "session_starting",
      "title": "Session starting in 30 minutes",
      "body": "Step 1 Intensive Cohort is starting soon.",
      "isRead": false,
      "classId": "uuid",
      "sessionId": "uuid",
      "createdAt": "2026-04-01T09:30:00Z"
    }
  ]
}
```

---

#### `PATCH /api/v1/student/notifications/:id/read`

**Auth:** Student JWT

**Logic:** Sets `is_read = true` on the notification row. Verifies `student_id = req.auth.userId`.

**Response `200`:** `{ "message": "Notification marked as read." }`

---

#### `GET /api/v1/student/notification-prefs`

**Auth:** Student JWT

**Logic:** Fetch row from `lms_notification_prefs` by `student_id`. If no row exists, return defaults.

**Response `200`:**
```json
{
  "prefs": {
    "emailSessionReminders": true,
    "emailNewNotices": true,
    "emailChatReplies": true,
    "pushSessionReminders": false,
    "pushNewNotices": false,
    "whatsappOptIn": false
  }
}
```

---

#### `PATCH /api/v1/student/notification-prefs`

**Auth:** Student JWT

**Request body:** Any subset of the prefs fields.

**Logic:** Upsert `lms_notification_prefs` row on `student_id`.

**Response `200`:** `{ "message": "Preferences saved." }`

---

#### `PATCH /api/v1/student/profile`

**Auth:** Student JWT

**Purpose:** Student updates their display name and/or phone number.

**Request body:**
```json
{
  "fullName": "Alex Johnson",
  "phone": "+1 555 0100"
}
```

**Logic:**
- Update `profiles.full_name` for `id = req.auth.userId`
- `phone` — if you have a phone column on profiles, update it; otherwise add it in a migration

**Response `200`:** `{ "message": "Profile updated." }`

---

### `lmsPublic.ts` — New/Modified Endpoints

#### `GET /api/v1/programs`

**Auth:** None (public)

**Purpose:** Lists all active products with teacher name and session count. Used on the student programs page and landing page.

**Response `200`:**
```json
{
  "programs": [
    {
      "productId": "uuid",
      "name": "USMLE Step 1 Online Sessions",
      "description": "...",
      "upfrontPrice": 299,
      "installmentAmount": 99,
      "installmentMonths": 3,
      "teacherName": "Dr. Ahmed",
      "teacherId": "uuid",
      "classId": "uuid",
      "sessionCount": 10,
      "enrolledCount": 24
    }
  ]
}
```

---

#### `GET /api/v1/programs/:productId`

**Auth:** None (public)

**Purpose:** Full product detail for the product detail page.

**Response `200`:**
```json
{
  "program": {
    "productId": "uuid",
    "name": "USMLE Step 1 Online Sessions",
    "description": "...",
    "upfrontPrice": 299,
    "installmentAmount": 99,
    "installmentMonths": 3,
    "teacherName": "Dr. Ahmed",
    "teacherId": "uuid",
    "teacherBio": "Board-certified physician with 10 years of USMLE tutoring.",
    "classId": "uuid",
    "sessions": [
      {
        "id": "uuid",
        "scheduledAt": "2026-05-01T10:00:00Z",
        "durationMinutes": 90,
        "status": "scheduled"
      }
    ],
    "enrolledCount": 24,
    "sessionCount": 10
  }
}
```

---

### `POST /api/v1/coupons/validate`

**Auth:** None (public — validated server-side on checkout)

**Purpose:** Called from `CheckoutPage` and `ProductDetailPage` when user enters a coupon code.

**Request body:**
```json
{
  "code": "STEP1SAVE20",
  "productId": "uuid"
}
```

**Logic:**
1. Find coupon by `code` (case-insensitive)
2. Check `is_active = true`
3. Check `expires_at` is null or in the future
4. Check `max_uses` is null or `uses_count < max_uses`
5. Check `product_id` is null (all products) OR matches `productId` in request

**Response `200` (valid):**
```json
{
  "valid": true,
  "discount": 20,
  "type": "percentage"
}
```

**Response `200` (invalid):**
```json
{
  "valid": false,
  "message": "Coupon has expired."
}
```

Do NOT use 4xx for invalid coupons — the frontend always expects a 200 with `valid: true/false`.

---

## 7. Stripe Payment Integration

### Setup steps (one-time, when going to production):

1. Create a Stripe account at stripe.com
2. Go to **Developers → API Keys** → copy Secret Key (`sk_live_...`) → add to `backend/.env` as `STRIPE_SECRET_KEY`
3. Go to **Developers → Webhooks** → Add endpoint: `https://yourdomain.com/api/v1/payments/webhook`
4. Select event: `payment_intent.succeeded`
5. Copy **Signing Secret** → add to `backend/.env` as `STRIPE_WEBHOOK_SECRET`
6. Install Stripe SDK: `npm install stripe`

### Frontend Stripe.js integration (when going live):

Replace the mock `submitCheckout` in `frontend/src/services/lmsApi.ts`:

```typescript
// BEFORE (mock):
export async function submitCheckout(productId, plan, couponCode, studentId) {
  await new Promise(r => setTimeout(r, 1500))
  // ... localStorage enrollment
  return { success: true, enrollmentId: `enroll-${Date.now()}` }
}

// AFTER (real Stripe):
import { loadStripe } from '@stripe/stripe-js'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

export async function submitCheckout(productId, plan, couponCode, studentId, cardElement) {
  // 1. Get PaymentIntent client secret from backend
  const res = await fetch(`${API_BASE}/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getJwt()}` },
    body: JSON.stringify({ productId, plan, couponCode }),
  })
  const { clientSecret } = await res.json()

  // 2. Confirm payment with Stripe.js
  const stripe = await stripePromise
  const { error } = await stripe!.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
  })

  if (error) throw new Error(error.message)
  return { success: true }
  // Enrollment is handled by the Stripe webhook on the backend
}
```

Add to `frontend/.env`:
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## 8. Frontend ↔ Backend Connection Guide

This section maps every frontend service function that has a `// BACKEND SWAP` comment to the real backend endpoint.

### How to connect

Every service function in `frontend/src/services/lmsApi.ts` has a `// BACKEND SWAP` comment. To wire the real backend:
1. Replace the localStorage read/write with a `fetch()` call to the endpoint listed below
2. Use the JWT from context: `const jwt = getStudentJwt()` (or teacher/admin equivalent)
3. Map the JSON response fields to the TypeScript types (camelCase in frontend, snake_case in DB)

### Complete swap table

| Frontend function | File | HTTP Method + Endpoint | Auth |
|---|---|---|---|
| `getAvailablePrograms()` | lmsApi.ts | `GET /api/v1/programs` | none |
| `adminGetProducts()` | lmsApi.ts | `GET /api/v1/admin/products` | admin |
| `adminCreateProduct()` | lmsApi.ts | `POST /api/v1/admin/products` | admin |
| `adminUpdateProduct()` | lmsApi.ts | `PATCH /api/v1/admin/products/:id` | admin |
| `adminDeleteProduct()` | lmsApi.ts | `DELETE /api/v1/admin/products/:id` | admin |
| `adminGetClasses()` | lmsApi.ts | `GET /api/v1/admin/classes` | admin |
| `adminCreateClass()` | lmsApi.ts | `POST /api/v1/admin/classes` | admin |
| `adminUpdateClass()` | lmsApi.ts | `PATCH /api/v1/admin/classes/:id` | admin |
| `adminGetEnrollmentsForClass()` | lmsApi.ts | `GET /api/v1/admin/classes/:classId/enrollments` | admin |
| `adminEnrollStudent()` | lmsApi.ts | `POST /api/v1/admin/classes/:classId/enroll` | admin |
| `adminRemoveEnrollment()` | lmsApi.ts | `DELETE /api/v1/admin/classes/:classId/enrollments/:studentId` | admin |
| `getAllCoupons()` | lmsApi.ts | `GET /api/v1/admin/coupons` | admin |
| `adminCreateCoupon()` | lmsApi.ts | `POST /api/v1/admin/coupons` | admin |
| `adminToggleCoupon()` | lmsApi.ts | `PATCH /api/v1/admin/coupons/:id` | admin |
| `adminDeleteCoupon()` | lmsApi.ts | `DELETE /api/v1/admin/coupons/:id` | admin |
| `validateCoupon()` | lmsApi.ts | `POST /api/v1/coupons/validate` | none |
| `submitCheckout()` | lmsApi.ts | `POST /api/v1/payments/checkout` | student |
| `studentGetEnrolledClasses()` | lmsApi.ts | `GET /api/v1/student/classes` | student |
| `studentGetSessionsForClass()` | lmsApi.ts | `GET /api/v1/student/classes/:classId/sessions` | student |
| `getChatMessagesForClass()` | lmsApi.ts | `GET /api/v1/student/classes/:classId/chat` | student |
| `sendChatMessage()` (student) | lmsApi.ts | `POST /api/v1/student/classes/:classId/chat` | student |
| `markChatMessageRead()` | lmsApi.ts | `PATCH /api/v1/student/notifications/:id/read` | student |
| `deleteChatMessage()` | lmsApi.ts | `DELETE /api/v1/admin/chat/:messageId` | admin |
| `getAllChatThreads()` | lmsApi.ts | `GET /api/v1/teacher/classes/:classId/chat` | teacher |
| `sendChatMessage()` (teacher) | lmsApi.ts | `POST /api/v1/teacher/classes/:classId/chat/:studentId` | teacher |
| `getAttendanceForClass()` | lmsApi.ts | `GET /api/v1/student/classes/:classId/attendance` | student |
| `getRecordingsForClass()` | lmsApi.ts | `GET /api/v1/student/classes/:classId/sessions` (filter completed + has recording_url) | student |
| `updateSessionRecording()` | lmsApi.ts | `PATCH /api/v1/teacher/sessions/:sessionId/recording` | teacher |
| `removeSessionRecording()` | lmsApi.ts | `DELETE /api/v1/teacher/sessions/:sessionId/recording` | teacher |
| `getStudentNotificationPrefs()` | lmsApi.ts | `GET /api/v1/student/notification-prefs` | student |
| `updateStudentNotificationPrefs()` | lmsApi.ts | `PATCH /api/v1/student/notification-prefs` | student |
| `getStudentLmsNotifications()` | lmsApi.ts | `GET /api/v1/student/notifications` | student |
| `markLmsNotificationRead()` | lmsApi.ts | `PATCH /api/v1/student/notifications/:id/read` | student |
| `getTeacherAnalytics()` | lmsApi.ts | `GET /api/v1/teacher/analytics` | teacher |
| `getTeacherClasses()` | lmsApi.ts | `GET /api/v1/teacher/classes` | teacher |
| `getTeacherSessions()` | lmsApi.ts | `GET /api/v1/teacher/classes/:classId/sessions` | teacher |
| `adminGetAllSessions()` | lmsApi.ts | `GET /api/v1/admin/sessions` | admin |
| `adminGetTeachers()` | lmsApi.ts | `GET /api/v1/admin/teachers` | admin |

### JWT handling pattern

The frontend stores JWTs in localStorage under different keys per role. When wiring real endpoints, use this pattern in each service function:

```typescript
// Student JWT
const jwt = localStorage.getItem('nextgen.student.session')
  ? JSON.parse(localStorage.getItem('nextgen.student.session')!).access_token
  : null

// Teacher JWT
const jwt = localStorage.getItem('nextgen.teacher.session')
  ? JSON.parse(localStorage.getItem('nextgen.teacher.session')!).access_token
  : null

// Admin JWT
const jwt = localStorage.getItem('nextgen.admin.session')
  ? JSON.parse(localStorage.getItem('nextgen.admin.session')!).access_token
  : null

// Use in fetch:
headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' }
```

### Response shape mapping (snake_case → camelCase)

The backend returns snake_case. The frontend TypeScript types use camelCase. Map them in each service function:

```typescript
// Example for getChatMessagesForClass():
const raw = await res.json()
return raw.messages.map((m: any) => ({
  id: m.id,
  classId: m.class_id,
  studentId: m.student_id,
  senderRole: m.sender_role,
  text: m.text,
  isRead: m.is_read,
  createdAt: m.created_at,
}))
```

---

## 9. Frontend BACKEND SWAP Reference

Every `// BACKEND SWAP` comment in the codebase marks a localStorage mock that must be replaced with a real API call. Here is the complete list by file.

### `frontend/src/services/lmsApi.ts`

Search for `// BACKEND SWAP` in this file. Every function between line ~45 and line ~870 has one. The swap table in Section 8 maps them all. Key ones to highlight:

**`submitCheckout` (line ~747)** — most critical swap. Currently does localStorage writes + 1.5s delay. In production this must call `POST /api/v1/payments/checkout`, get back a Stripe `clientSecret`, and confirm the payment using Stripe.js.

**`studentGetEnrolledClasses` (line ~478)** — currently filters from localStorage `lms_classes` by `enrolledStudentIds`. Replace with `GET /api/v1/student/classes` which returns only genuinely enrolled classes from `lms_enrollments`.

**`getAttendanceForClass` (line ~569)** — currently uses deterministic random seeding. Replace with `GET /api/v1/student/classes/:classId/attendance` which reads from `lms_attendance_records`.

**`getAvailablePrograms` (line ~447)** — currently reads from localStorage products/classes/teachers. Replace with `GET /api/v1/programs`.

### `frontend/src/pages/student/CheckoutPage.tsx`

The `handleSubmit` function calls `submitCheckout()`. When wiring Stripe:
1. Add `@stripe/stripe-js` and `@stripe/react-stripe-js` packages
2. Wrap `CheckoutPage` in `<Elements stripe={stripePromise}>` in `App.tsx`
3. Replace mock card fields with real `<CardElement>` from `@stripe/react-stripe-js`
4. Pass `cardElement` to `submitCheckout()`

### `frontend/src/pages/student/BillingPage.tsx`

Currently shows hardcoded mock history. Replace with `GET /api/v1/student/orders` and render the real order history.

### `frontend/src/pages/student/StudentProfilePage.tsx`

The `handleSave` function currently only updates localStorage user context. Add `PATCH /api/v1/student/profile` call to persist the change to the `profiles` table.

---

## 10. Step-by-Step Implementation Order

Follow this exact order. Each step builds on the previous.

**Step 1 — Database**
- Run Migration 005 SQL in Supabase SQL Editor
- Verify all 6 new tables exist: `lms_chat_messages`, `lms_attendance_records`, `lms_coupons`, `lms_orders`, `lms_notification_prefs`, `lms_notifications`
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `backend/.env`

**Step 2 — Utility libraries**
- Create `backend/src/lib/stripe.ts`
- Create `backend/src/lib/notify.ts`

**Step 3 — Public programs endpoints**
- Add `GET /api/v1/programs` and `GET /api/v1/programs/:productId` to `lmsPublic.ts`
- Add `POST /api/v1/coupons/validate` to `lmsPublic.ts`
- Test: hit both endpoints without any JWT → returns data

**Step 4 — Coupon management (admin)**
- Add coupon CRUD endpoints to `lmsAdmin.ts`
- Test: create coupon via admin → validate it via public endpoint → coupon returns `valid: true`

**Step 5 — Checkout & payments**
- Create `backend/src/routes/lmsPayments.ts`
- Mount it in `app.ts`
- Test: student POSTs to `/payments/checkout` → order row created in DB → enrollment row created → notification inserted
- Test: `GET /api/v1/student/orders` returns the order

**Step 6 — Admin class & enrollment management**
- Add `GET/POST/PATCH /api/v1/admin/classes` to `lmsAdmin.ts`
- Add `GET/POST/DELETE /api/v1/admin/classes/:classId/enrollments` to `lmsAdmin.ts`
- Test: create class → enroll student → student's `GET /student/classes` returns the class

**Step 7 — Chat**
- Add student chat endpoints to `lmsStudent.ts`
- Add teacher chat endpoints to `lmsTeacher.ts`
- Add admin supervision endpoints to `lmsAdmin.ts`
- Test: student sends message → teacher reads thread → teacher replies → student marks read → admin can see full thread

**Step 8 — Attendance**
- Add attendance endpoints to `lmsTeacher.ts` (submit) and `lmsStudent.ts` (read)
- Test: teacher submits attendance for a completed session → student sees their rate

**Step 9 — Recordings**
- Add recording PATCH/DELETE to `lmsTeacher.ts`
- Test: teacher adds URL → student can see it on recordings page

**Step 10 — Notifications & preferences**
- Add notification and prefs endpoints to `lmsStudent.ts`
- Test: after enrolling (Step 5), `GET /student/notifications` returns `enrollment_confirmed` notification
- Test: update prefs → `GET /student/notification-prefs` reflects the change

**Step 11 — Teacher analytics**
- Add `GET /api/v1/teacher/analytics` to `lmsTeacher.ts`
- Test: verify computed stats match raw attendance records in DB

**Step 12 — Student profile update**
- Add `PATCH /api/v1/student/profile` to `lmsStudent.ts`
- Test: update name → check `profiles` table in Supabase dashboard

**Step 13 — Wire frontend**
- For each function in the swap table (Section 8), replace the localStorage mock with the real fetch call
- Start with `studentGetEnrolledClasses` and `submitCheckout` — these gate the core enrollment flow
- Run `npx tsc --noEmit` after each function swap to verify types still match

**Step 14 — Stripe live mode**
- Switch `STRIPE_SECRET_KEY` to live key
- Register Stripe webhook on real domain
- Test end-to-end with a real card on Stripe test mode first

---

## 11. Testing Checklist

### Auth & access control
- [ ] Student JWT cannot reach `/teacher/*` or `/admin/*` routes
- [ ] Teacher JWT cannot reach `/admin/*` routes
- [ ] Unauthenticated request to any protected route returns 401
- [ ] Student cannot send chat message to a class they are not enrolled in (403)

### Coupon validation
- [ ] Valid active coupon returns `valid: true` with correct discount
- [ ] Expired coupon returns `valid: false` with message "Coupon has expired."
- [ ] Fully-used coupon (uses_count >= max_uses) returns `valid: false`
- [ ] Inactive coupon returns `valid: false`
- [ ] Coupon for product-A is not valid when checking out product-B
- [ ] Coupon with `product_id = null` is valid for all products

### Checkout & enrollment
- [ ] POST `/payments/checkout` → order row created in `lms_orders` with `status = 'pending'` (or 'paid' in mock mode)
- [ ] Student is inserted into `lms_enrollments` with `demo_expires_at = null` after paid checkout
- [ ] Student calling `GET /student/classes` after enrollment returns the class
- [ ] Coupon `uses_count` increments after successful checkout
- [ ] Double checkout for same product/class → second enrollment attempt uses upsert (no duplicate row)

### Chat
- [ ] Student sends message → appears in teacher's thread list
- [ ] Teacher replies → student sees new message in their thread
- [ ] Admin can view all messages including soft-deleted ones
- [ ] Admin deletes message → `is_deleted = true` in DB, hidden from student/teacher GET
- [ ] Student in class A cannot read chat messages from class B

### Attendance
- [ ] Teacher submits attendance → `lms_attendance_records` rows inserted
- [ ] Student's `GET /student/classes/:classId/attendance` returns correct rate
- [ ] `lms_sessions.attendance_count` updated after teacher submits

### Notifications
- [ ] After enrollment: `GET /student/notifications` includes `enrollment_confirmed` notification
- [ ] After teacher replies to chat: student has `chat_reply` notification
- [ ] Mark notification read → `is_read = true` in DB
- [ ] Student A cannot mark Student B's notifications as read

### Teacher analytics
- [ ] Analytics returns correct `sessionsCompleted` count
- [ ] `avgAttendanceRate` computed from real `lms_attendance_records` (not from `attendance_count` column)
- [ ] Teacher with no completed sessions returns zeros, not 500

### Admin classes & enrollment
- [ ] Creating a class with an unapproved teacher throws 400
- [ ] Creating a class with an inactive product throws 400
- [ ] Admin enrolls student with demo access → `demo_expires_at` is set correctly
- [ ] Admin removes enrollment → student no longer appears in `GET /student/classes`
- [ ] Admin deletes coupon with `uses_count > 0` → returns 409

### Recordings
- [ ] Teacher can only add recording to their own class's completed sessions
- [ ] Teacher cannot add recording to a scheduled session (must be completed)
- [ ] Student sees recording URL in `/student/classes/:classId/recordings` after teacher adds it

---

---

## 12. Installment Plan Cancellation Flow

### What "cancel" means

When a student cancels an installment plan they are NOT immediately losing access. They are scheduling the end of their billing. The full sequence:

```
Student cancels
    ↓
No further monthly charges
    ↓
Access remains fully active until end of current paid month (access_until)
    ↓
On access_until date → backend job sets lms_enrollments.demo_expires_at = NOW()
    ↓
Student hits DemoGate / sees demo-expired page
```

### Database changes required

These columns and the `'cancelled'` status are already included in the `lms_orders` CREATE TABLE in Migration 005 above — no separate ALTER needed. If you ran an earlier version of Migration 005 that didn't include them, run:

```sql
-- Only needed if you ran an older version of Migration 005 without these columns
ALTER TABLE lms_orders
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_until            TIMESTAMPTZ;

ALTER TABLE lms_orders
  DROP CONSTRAINT IF EXISTS order_status_values,
  ADD CONSTRAINT order_status_values
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
```

### How `access_until` is computed

`access_until` = end of the last month the student has already paid for.

**Example:**
- Student enrolled March 1, paying $99/month for 3 months
- They paid March and April (installments 1 and 2)
- They cancel on April 15
- `access_until` = April 30 at 23:59:59 UTC (end of April — the last paid month)

**Formula on backend:**
```typescript
// Last payment date = most recent 'Paid' charge date
// access_until = last day of that payment's month

const lastPaymentDate = new Date(mostRecentPaidChargeDate)
const accessUntil = new Date(
  lastPaymentDate.getFullYear(),
  lastPaymentDate.getMonth() + 1,  // next month
  0,                                // day 0 = last day of previous month
  23, 59, 59, 999                   // end of that day
)
```

### New endpoint: `POST /api/v1/student/orders/:orderId/cancel`

**Auth:** Student JWT

**Guards:**
- Order must belong to the requesting student
- Order `plan` must be `'installment'` (upfront orders cannot be cancelled this way)
- Order `status` must be `'paid'` (already-cancelled orders return 409)

**Logic:**
1. Fetch order → verify ownership + plan type + status
2. Compute `accessUntil` from the last paid installment date (query Stripe for last successful charge, or use `paid_at` column on the order)
3. Update `lms_orders`: `status = 'cancelled'`, `cancelled_at = NOW()`, `access_until = accessUntil`
4. **Cancel Stripe subscription** (if using Stripe Subscriptions):
   ```typescript
   await stripe.subscriptions.cancel(order.stripe_subscription_id, {
     prorate: false,
     cancellation_details: { comment: 'Student requested cancellation' }
   })
   ```
5. Insert `lms_notifications` for student:
   ```json
   {
     "type": "enrollment_confirmed",
     "title": "Cancellation confirmed",
     "body": "Your plan has been cancelled. Access continues until April 30, 2026."
   }
   ```
6. **Do NOT touch `lms_enrollments` yet** — access remains until `access_until`

**Response `200`:**
```json
{
  "message": "Plan cancelled.",
  "accessUntil": "2026-04-30T23:59:59Z"
}
```

### Revoking access on `access_until` date

There are two ways to handle expiry. Choose one:

**Option A — Scheduled job (recommended):**
- Set up a daily cron job (or Supabase Edge Function scheduled trigger) that runs at midnight UTC
- Query: find all `lms_orders` where `status = 'cancelled'` AND `access_until < NOW()` AND `lms_enrollments.demo_expires_at IS NULL`
- For each: set `lms_enrollments.demo_expires_at = NOW()` on that student's enrollment
- The student's next page load will hit the DemoGate component

```sql
-- Cron query: run daily at 00:05 UTC
UPDATE lms_enrollments e
SET demo_expires_at = NOW()
WHERE e.demo_expires_at IS NULL
  AND EXISTS (
    SELECT 1 FROM lms_orders o
    WHERE o.student_id = e.student_id
      AND o.status = 'cancelled'
      AND o.access_until < NOW()
  );
```

**Option B — On login / on class access:**
- When student hits `GET /api/v1/student/classes`, check if any of their orders are cancelled + past `access_until`
- If yes, immediately set `demo_expires_at = NOW()` and return 403 with `ENROLLMENT_EXPIRED` code
- Simpler, no cron needed, but relies on the student actually requesting the endpoint

### Frontend handling

The `BillingPage` only shows the **Cancel Installment Plan** button when:
```typescript
const canCancel = isInstallment && !cancelled
// isInstallment = MOCK_PLAN.plan === 'installment'  (real: order.plan === 'installment')
// cancelled     = MOCK_PLAN status === 'cancelled'   (real: order.status === 'cancelled')
```

When the real backend is wired:
- `BillingPage` fetches `GET /api/v1/student/orders` → checks if any order has `plan = 'installment'` and `status = 'paid'`
- Cancel button calls `POST /api/v1/student/orders/:orderId/cancel`
- On success: update local state to show the amber confirmation banner with `accessUntil` date

### Summary of what student loses after `access_until`

| Feature | After access_until |
|---|---|
| Live sessions | Blocked (DemoGate) |
| Recorded sessions | Blocked (DemoGate) |
| Teacher chat | Blocked |
| Class notice board | Blocked |
| Attendance history | Blocked |
| QBank / AI Tutor / other tools | Unaffected (those are subscription-tier, not LMS) |

The student does NOT lose their QBank subscription (separate system). They only lose LMS class access.


---

## 13. Gap Fixes & Missing Pieces

This section patches the gaps identified after the initial documentation was written. Every item here is **required** — skipping any of them will cause real bugs in production.

---

### Gap 1 — Phone column on `profiles` table

`PATCH /api/v1/student/profile` updates phone, but the `profiles` table from Migration 001/002 has no `phone` column. Add it:

```sql
-- Run as a standalone migration (e.g. Migration 006) or append to 005
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
```

Also update the teacher profile endpoint — when teacher logs in, include `phone` from `profiles.phone` (not just from `lms_teacher_profiles.phone` — keep them in sync or pick one source of truth). **Recommendation: store phone on `profiles` for all roles; remove `phone` from `lms_teacher_profiles` in a future cleanup.**

---

### Gap 2 — Demo enforcement middleware

Setting `demo_expires_at` in the DB is useless without something that actually enforces it. Add a middleware function in `backend/src/middleware/checkDemoAccess.ts`:

```typescript
import type { NextFunction, Request, Response } from 'express'
import { supabaseServiceClient } from '../lib/supabase.js'
import { HttpError } from '../lib/httpError.js'

// Use on any LMS student route that should be blocked for expired demo users.
// e.g.: lmsStudentRouter.get('/student/classes/:classId/chat', authenticateRequest, requireRole('student'), checkDemoAccess, handler)

export async function checkDemoAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.auth!.userId
    const classId = req.params.classId

    if (!classId) return next()  // route doesn't involve a specific class

    const { data: enrollment } = await supabaseServiceClient
      .from('lms_enrollments')
      .select('demo_expires_at')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .single()

    if (!enrollment) {
      throw new HttpError(403, 'NOT_ENROLLED', 'You are not enrolled in this class.')
    }

    if (enrollment.demo_expires_at && new Date(enrollment.demo_expires_at) < new Date()) {
      throw new HttpError(403, 'DEMO_EXPIRED', 'Your demo access has expired. Please enroll to continue.')
    }

    return next()
  } catch (err) {
    return next(err)
  }
}
```

**Apply this middleware to these endpoints in `lmsStudent.ts`:**

| Endpoint | Apply checkDemoAccess? |
|---|---|
| `GET /student/classes` | No — student can see their class list even if expired |
| `GET /student/classes/:classId/sessions` | No — student can see session list |
| `GET /student/classes/:classId/chat` | **Yes** |
| `POST /student/classes/:classId/chat` | **Yes** |
| `GET /student/classes/:classId/attendance` | No — student can see their historical attendance |
| `GET /student/classes/:classId/recordings` | **Yes** (via `getRecordingsForClass` — filter out if expired) |

**Frontend error code handling:**

The frontend `StudentChatPage`, `RecordedSessionsPage`, `LiveSessionPage` should check for `DEMO_EXPIRED` in the API error response and redirect to `/student/demo-expired` instead of showing a generic error:

```typescript
// Pattern to add in each affected service call:
if (error.code === 'DEMO_EXPIRED') {
  window.location.href = '/student/demo-expired'
  return
}
if (error.code === 'NOT_ENROLLED') {
  window.location.href = '/student/classes'
  return
}
```

---

### Gap 3 — Session reminder notifications (cron trigger)

The `notifyAllEnrolledStudents()` helper exists but nothing calls it for "session starting soon" alerts. Two parts needed:

#### Part A — Supabase Edge Function (recommended)

Create a Supabase Edge Function called `session-reminders` that runs on a cron schedule:

```
Dashboard → Edge Functions → New Function → session-reminders
Cron schedule: */5 * * * *   (every 5 minutes)
```

```typescript
// supabase/functions/session-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 60 * 1000)  // 30 mins from now
  const in35 = new Date(now.getTime() + 35 * 60 * 1000)  // 35 mins from now (buffer window)

  // Find sessions starting in the next 30–35 minutes (the 5-min window this cron covers)
  const { data: sessions } = await supabase
    .from('lms_sessions')
    .select('id, class_id, scheduled_at, lms_classes(name)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', in30.toISOString())
    .lte('scheduled_at', in35.toISOString())

  if (!sessions?.length) return new Response('No sessions')

  for (const session of sessions) {
    const { data: enrollments } = await supabase
      .from('lms_enrollments')
      .select('student_id')
      .eq('class_id', session.class_id)

    if (!enrollments?.length) continue

    const rows = enrollments.map(e => ({
      student_id: e.student_id,
      type: 'session_starting',
      title: 'Session starting in 30 minutes',
      body: `${(session.lms_classes as any).name} is starting soon.`,
      class_id: session.class_id,
      session_id: session.id,
    }))

    await supabase.from('lms_notifications').insert(rows)
  }

  return new Response('Done')
})
```

#### Part B — Also trigger from `POST /teacher/sessions/:id/start`

When teacher starts a session (status flips to `live`), immediately notify enrolled students:

```typescript
// Add to the end of the session start handler in lmsTeacher.ts:
await notifyAllEnrolledStudents(session.class_id, {
  type: 'session_starting',
  title: 'Session is now live',
  body: 'Your class session has started. Join now.',
  sessionId: req.params.id,
})
```

#### Part C — Also trigger from `POST /teacher/notices` (notice posted)

```typescript
// Add to the end of the notice creation handler in lmsTeacher.ts:
await notifyAllEnrolledStudents(parsed.classId, {
  type: 'notice_posted',
  title: `New notice: ${parsed.title}`,
  body: parsed.content.slice(0, 100),
  classId: parsed.classId,
})
```

---

### Gap 4 — Editor chat supervision endpoint

The frontend has `/editor/supervision` → `EditorSupervisionPage` which renders the same chat supervision UI as admin. The `lmsEditor.ts` route file needs this endpoint:

```typescript
// Add to backend/src/routes/lmsEditor.ts

// ─── GET /api/v1/editor/chat ─────────────────────────────────────────────────
// Editor supervision — read-only view of all chat threads.
// Identical response shape to GET /api/v1/admin/chat.
// Editors CANNOT delete messages or flag conversations (admin-only actions).
lmsEditorRouter.get('/editor/chat', authenticateRequest, requireRole('editor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classIdFilter = req.query.classId as string | undefined

      let query = supabaseServiceClient
        .from('lms_chat_messages')
        .select(`
          id, class_id, student_id, sender_role, text,
          is_read, is_deleted, flagged, created_at,
          lms_classes!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200)  // pagination — see Gap 5

      if (classIdFilter) query = query.eq('class_id', classIdFilter)

      const { data, error } = await query
      if (error) throw new HttpError(500, 'FETCH_FAILED', error.message)

      // Fetch student names
      const studentIds = [...new Set((data ?? []).map(m => m.student_id))]
      const { data: profiles } = await supabaseServiceClient
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)

      const nameMap: Record<string, string> = {}
      ;(profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name })

      const result = (data ?? []).map(m => ({
        id: m.id,
        classId: m.class_id,
        className: (m.lms_classes as any).name,
        studentId: m.student_id,
        studentName: nameMap[m.student_id] ?? 'Unknown',
        senderRole: m.sender_role,
        text: m.is_deleted ? '[Message deleted]' : m.text,  // editors see placeholder, not content
        isRead: m.is_read,
        isDeleted: m.is_deleted,
        flagged: m.flagged,
        createdAt: m.created_at,
      }))

      return res.status(200).json({ messages: result })
    } catch (err) { return next(err) }
  }
)
```

**Key difference from admin:** Editors see `[Message deleted]` for soft-deleted messages instead of the actual content. They cannot call DELETE or flag endpoints.

**Add to `frontend/src/services/lmsApi.ts`:**

```typescript
// BACKEND SWAP: GET /api/v1/editor/chat
// Currently EditorSupervisionPage uses the same mock as admin.
// Wire to /editor/chat for the editor role.
export async function editorGetChatMessages(classId?: string): Promise<ChatMessage[]> {
  // swap: fetch('/api/v1/editor/chat' + (classId ? `?classId=${classId}` : ''))
}
```

---

### Gap 5 — Chat pagination

Without pagination, a class running for 6 months could return 5,000+ messages in one response. Use cursor-based pagination on all chat GET endpoints.

**Pattern for `GET /api/v1/student/classes/:classId/chat`:**

```
GET /api/v1/student/classes/:classId/chat?limit=50&before=<ISO timestamp>
```

- `limit` — number of messages to return (default 50, max 100)
- `before` — ISO timestamp cursor — returns messages older than this timestamp
- Frontend loads latest 50 on mount, fetches older messages when user scrolls to top

**Backend change:**

```typescript
const limit = Math.min(Number(req.query.limit) || 50, 100)
const before = req.query.before as string | undefined

let query = supabaseServiceClient
  .from('lms_chat_messages')
  .select('*')
  .eq('class_id', classId)
  .eq('student_id', studentId)
  .eq('is_deleted', false)
  .order('created_at', { ascending: false })
  .limit(limit)

if (before) query = query.lt('created_at', before)

const { data } = await query
// Return in ascending order for display
return res.json({ messages: (data ?? []).reverse(), hasMore: (data ?? []).length === limit })
```

Apply the same `limit` + `before` pattern to:
- `GET /api/v1/teacher/classes/:classId/chat/:studentId`
- `GET /api/v1/admin/chat`
- `GET /api/v1/editor/chat`

---

### Gap 6 — Teacher profile update endpoint

After registration, teachers have no way to update their bio or phone. Add to `lmsTeacher.ts`:

```typescript
// ─── PATCH /api/v1/teacher/profile ───────────────────────────────────────────
const updateTeacherProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone:    z.string().min(5).optional(),
  bio:      z.string().min(10).max(300).optional(),
})

lmsTeacherRouter.patch('/teacher/profile', authenticateRequest, requireRole('teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateTeacherProfileSchema.parse(req.body)
      const teacherId = req.auth!.userId

      if (parsed.fullName || parsed.phone) {
        const profileUpdates: Record<string, string> = {}
        if (parsed.fullName) profileUpdates.full_name = parsed.fullName
        if (parsed.phone)    profileUpdates.phone = parsed.phone
        await supabaseServiceClient
          .from('profiles')
          .update(profileUpdates)
          .eq('id', teacherId)
      }

      if (parsed.bio) {
        await supabaseServiceClient
          .from('lms_teacher_profiles')
          .update({ bio: parsed.bio })
          .eq('id', teacherId)
      }

      return res.status(200).json({ message: 'Profile updated.' })
    } catch (err) { return next(err) }
  }
)
```

---

### Gap 7 — Refund flow

`lms_orders` has a `'refunded'` status but no endpoint. Admin-only refund flow:

#### `POST /api/v1/admin/orders/:orderId/refund`

**Auth:** Admin JWT

**Logic:**
1. Fetch order — verify it exists and `status = 'paid'`
2. If `stripe_payment_intent_id` is set → call Stripe refund API:
   ```typescript
   await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
   ```
3. Update `lms_orders.status = 'refunded'`
4. Set `lms_enrollments.demo_expires_at = NOW()` for the student's enrollment in that product's class (immediately revoke access on refund)
5. Notify student: type `'enrollment_confirmed'`, title `'Refund processed'`, body `'Your refund has been issued. Class access has been removed.'`

**Response `200`:** `{ "message": "Refund processed. Student access revoked." }`

**Note:** Refunds cannot be undone via the app. If admin wants to re-enroll the student, they use `POST /admin/classes/:classId/enroll` manually.

---

### Gap 8 — Rate limiting on chat

Without rate limiting, students can spam the chat endpoint. Add to `app.ts`:

```typescript
import rateLimit from 'express-rate-limit'

// Install: npm install express-rate-limit

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 20,               // max 20 messages per minute per IP
  message: { error: 'RATE_LIMITED', message: 'Too many messages. Please wait a moment.' },
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'unknown',  // per-user, not per-IP
})

// Apply only to chat POST endpoints:
app.use('/api/v1/student/classes', chatLimiter)  // covers POST .../chat
app.use('/api/v1/teacher/classes', chatLimiter)  // covers POST .../chat/:studentId
```

---

### Gap 9 — Multiple classes per product

The current checkout logic does:
```typescript
const cls = classes.find(c => c.productId === productId)  // takes first class found
```

If a product has two cohorts (e.g. "Morning Cohort" and "Evening Cohort"), a student buying the product gets enrolled in whichever class happens to be first in the DB — which may not be what they chose.

**Fix:** The checkout endpoint should accept an optional `classId` parameter:

**Updated `POST /api/v1/payments/checkout` request body:**
```json
{
  "productId": "uuid",
  "classId": "uuid",           // REQUIRED if product has more than one class
  "plan": "upfront",
  "couponCode": "STEP1SAVE20"
}
```

**Backend validation:**
```typescript
// If classId provided, verify it belongs to the product
if (payload.classId) {
  const { data: cls } = await supabaseServiceClient
    .from('lms_classes')
    .select('id')
    .eq('id', payload.classId)
    .eq('product_id', payload.productId)
    .single()
  if (!cls) throw new HttpError(400, 'CLASS_PRODUCT_MISMATCH', 'Class does not belong to this product.')
  targetClassId = payload.classId
} else {
  // fallback: use the only class (safe when product has exactly one class)
  const { data: cls } = await supabaseServiceClient
    .from('lms_classes').select('id').eq('product_id', payload.productId).limit(1).single()
  if (!cls) throw new HttpError(400, 'NO_CLASS', 'This product has no active class.')
  targetClassId = cls.id
}
```

**Frontend:** `CheckoutPage` and `StudentProgramsPage` should pass `classId` when navigating to checkout if the product has multiple classes. For now (single class per product), this is safe to leave as optional and the fallback handles it.

---

### Summary of all gaps patched

| # | Gap | Where fixed |
|---|---|---|
| 1 | `stripe_subscription_id` missing from `lms_orders` | Fixed in Migration 005 CREATE TABLE |
| 2 | `phone` column missing from `profiles` | Gap 1 above — standalone ALTER TABLE |
| 3 | Demo enforcement not implemented | Gap 2 above — `checkDemoAccess` middleware |
| 4 | Session reminder notifications never triggered | Gap 3 above — Edge Function + manual triggers |
| 5 | Editor supervision endpoint missing | Gap 4 above — `GET /editor/chat` |
| 6 | Chat has no pagination | Gap 5 above — cursor-based with `before` + `limit` |
| 7 | Teacher cannot update own profile | Gap 6 above — `PATCH /teacher/profile` |
| 8 | Refund flow undocumented | Gap 7 above — `POST /admin/orders/:id/refund` |
| 9 | No rate limiting on chat | Gap 8 above — `express-rate-limit` |
| 10 | Multiple classes per product breaks enrollment | Gap 9 above — optional `classId` on checkout |

