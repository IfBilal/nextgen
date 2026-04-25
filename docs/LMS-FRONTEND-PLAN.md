# LMS Frontend — First Half Implementation Plan

This document is the complete, step-by-step implementation plan for the first half of the
Online Sessions LMS frontend. No backend integration. All data is mocked via localStorage
and in-memory mock files, following the exact same pattern already used for the affiliate
system. Every service function is marked `// BACKEND SWAP` for future replacement.

---

## Scope of First Half

| Area | What Gets Built |
|---|---|
| Public Website | Homepage, About, Contact, FAQs |
| Teacher Auth | Register, Pending screen, Login |
| Teacher Portal | Dashboard, My Classes, Class Detail, Session Form, Check-In, Notice Board |
| Editor Auth | Login (admin-created, no register page) |
| Editor Portal | Dashboard, Sessions Management, Supervision Panel |
| Admin LMS | Teacher Approval, Products Management, Sessions Overview, Demo Overrides |
| Student LMS | My Classes, Countdown Timers, Live Session Room |
| Infrastructure | New types, mock data, service stubs, contexts, layouts, routes |

---

## Existing Patterns to Follow

All new work must follow these already-established conventions in the codebase:

- **Auth**: Same pattern as `AffiliateAuthContext.tsx` — localStorage keyed by role
- **Protected routes**: Same pattern as `AffiliateProtectedRoute.tsx`
- **Layouts**: Same pattern as `AffiliateLayout.tsx` + `AffiliateLayout.css`
- **Service layer**: Same pattern as `affiliateApi.ts` — all functions marked `// BACKEND SWAP`
- **Mock data**: Same pattern as `data/affiliates.ts` — localStorage persistence with seed defaults
- **CSS**: Modular per-portal, same design tokens (navy #0D2D5E, light blue variants)
- **Icons**: lucide-react throughout

---

## Phase 0 — Foundation (Do This First, Everything Depends On It)

### 0.1 Types File

**File:** `frontend/src/types/lms.ts`

Define all TypeScript interfaces used across the LMS:

```
Teacher
  id: string
  name: string
  email: string
  password: string          // stored in mock data only, backend hashes this
  phone: string
  bio: string
  status: 'pending' | 'approved' | 'suspended'
  registeredAt: string      // ISO date
  assignedClassIds: string[]

Editor
  id: string
  name: string
  email: string
  password: string
  createdAt: string
  createdByAdminId: string

Product
  id: string
  name: string
  description: string
  upfrontPrice: number
  installmentAmount: number  // per month
  installmentMonths: number
  isActive: boolean
  classIds: string[]
  createdAt: string

LmsClass
  id: string
  productId: string
  name: string
  description: string
  teacherId: string
  defaultDurationMinutes: number
  enrolledStudentIds: string[]

LmsSession
  id: string
  classId: string
  scheduledAt: string        // ISO datetime
  durationMinutes: number
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  meetingLink: string
  recordingUrl?: string
  attendanceCount?: number
  actualDurationMinutes?: number
  changeNote?: string        // required when edited after creation

Notice
  id: string
  classId: string
  teacherId: string
  title: string
  content: string
  type: 'announcement' | 'pdf'
  fileName?: string          // display name of uploaded file
  createdAt: string

StudentEnrollment
  studentId: string
  classId: string
  enrolledAt: string
  demoExpiresAt?: string     // null = full access

DemoOverride
  studentId: string
  studentName: string
  studentEmail: string
  demoExpiresAt: string
  overriddenByAdminId?: string
  overriddenAt?: string
```

---

### 0.2 Mock Data File

**File:** `frontend/src/data/lms.ts`

Stores all LMS mock data in localStorage, exactly like `data/affiliates.ts`.

**Storage keys:**
- `nextgen.lms.teachers` — array of Teacher objects
- `nextgen.lms.editors` — array of Editor objects
- `nextgen.lms.products` — array of Product objects
- `nextgen.lms.classes` — array of LmsClass objects
- `nextgen.lms.sessions` — array of LmsSession objects
- `nextgen.lms.notices` — array of Notice objects
- `nextgen.lms.demo-overrides` — array of DemoOverride objects

**Seed data (pre-loaded if localStorage is empty):**

Teachers (2 seeds):
- Dr. James Carter | james@teacher.com / teacher123 | status: approved | assigned to class-1
- Dr. Priya Sharma | priya@teacher.com / teacher123 | status: pending | no classes yet

Editors (1 seed):
- Ali Hassan | ali@editor.com / editor123

Products (1 seed):
- "USMLE Online Sessions" | $299 upfront | $99/month installment | active | classIds: [class-1]

Classes (1 seed):
- "Step 1 Intensive" | productId: product-1 | teacherId: teacher-1 | 90 min default | 3 enrolled students

Sessions (3 seeds):
- One completed session (yesterday)
- One scheduled session (tomorrow 10:00 AM, duration 90 min)
- One live session (right now — set scheduledAt to fixed past time so it shows as live in the UI)

Notices (2 seeds):
- Announcement: "Welcome to Step 1 Intensive — please review the syllabus before next session"
- PDF: "Week 1 Study Guide.pdf"

**Exported helper functions (same pattern as affiliates.ts):**
- `getTeachers()` / `saveTeachers()`
- `getEditors()` / `saveEditors()`
- `getProducts()` / `saveProducts()`
- `getClasses()` / `saveClasses()`
- `getSessions()` / `saveSession()`
- `getNotices()` / `saveNotices()`
- `getDemoOverrides()` / `saveDemoOverrides()`

---

### 0.3 Service Layer

**File:** `frontend/src/services/lmsApi.ts`

All functions are marked `// BACKEND SWAP`. They read/write mock data from lms.ts.

**Teacher functions:**
```
registerTeacher(payload)           → creates Teacher with status:'pending'
loginTeacher(email, password)      → returns Teacher or null
getTeacherById(id)                 → Teacher
getTeacherClasses(teacherId)       → LmsClass[]
```

**Editor functions:**
```
loginEditor(email, password)       → returns Editor or null
```

**Admin functions:**
```
adminGetTeachers()                 → Teacher[]
adminApproveTeacher(id)            → updates status to 'approved'
adminRejectTeacher(id)             → updates status to 'suspended'
adminCreateEditor(payload)         → creates Editor
adminGetProducts()                 → Product[]
adminCreateProduct(payload)        → creates Product
adminUpdateProduct(id, payload)    → updates Product
adminDeleteProduct(id)             → removes Product
adminGetAllSessions()              → LmsSession[] with class/teacher join
adminGetDemoOverrides()            → DemoOverride[]
adminSetDemoOverride(studentId, daysToAdd | 'full_access')
```

**Teacher functions:**
```
teacherGetSessions(classId)        → LmsSession[]
teacherCreateSession(payload)      → creates LmsSession
teacherUpdateSession(id, payload)  → updates session, changeNote required
teacherStartSession(id)            → flips status to 'live'
teacherEndSession(id)              → flips status to 'completed', records duration
teacherGetNotices(classId)         → Notice[]
teacherCreateNotice(payload)       → creates Notice
teacherDeleteNotice(id)            → removes Notice
```

**Student functions:**
```
studentGetEnrolledClasses(studentId)   → LmsClass[] with Product info
studentGetUpcomingSession(classId)     → LmsSession (next scheduled or live)
```

**Shared:**
```
validateMeetingLink(classId)           → returns mock Zoom URL string
```

---

### 0.4 Auth Contexts

**File:** `frontend/src/context/TeacherAuthContext.tsx`

Exact same pattern as `AffiliateAuthContext.tsx`.

- localStorage key: `nextgen.teacher.auth`
- Stored shape: `{ teacher: Teacher, token: string }`
- Exposes: `teacher`, `login(email, password)`, `logout()`
- Login logic: calls `loginTeacher()`, if status is `'pending'` → sets teacher but with pending flag so the protected route redirects to pending page, if `'approved'` → sets teacher normally, if `'suspended'` → returns error "Account suspended"

**File:** `frontend/src/context/EditorAuthContext.tsx`

Same pattern.
- localStorage key: `nextgen.editor.auth`
- Exposes: `editor`, `login(email, password)`, `logout()`

---

### 0.5 Protected Routes

**File:** `frontend/src/components/routing/TeacherProtectedRoute.tsx`

- If no teacher in context → redirect to `/teacher/login`
- If teacher.status === 'pending' → redirect to `/teacher/pending`
- Otherwise → render `<Outlet />`

**File:** `frontend/src/components/routing/EditorProtectedRoute.tsx`

- If no editor in context → redirect to `/editor/login`
- Otherwise → render `<Outlet />`

---

### 0.6 Layouts

**File:** `frontend/src/layouts/TeacherLayout.tsx` + `TeacherLayout.css`

Sidebar layout matching AffiliateLayout structure.

Sidebar items:
- Dashboard (`/teacher/dashboard`) — LayoutDashboard icon
- My Classes (`/teacher/classes`) — BookOpen icon
- Schedule Session quick-link (`/teacher/sessions/new`) — CalendarPlus icon
- Logout button at bottom

Top bar: Teacher name, avatar initials, role badge "Teacher"

**File:** `frontend/src/layouts/EditorLayout.tsx` + `EditorLayout.css`

Sidebar items:
- Dashboard (`/editor/dashboard`) — LayoutDashboard icon
- Sessions (`/editor/sessions`) — Calendar icon
- Supervision (`/editor/supervision`) — Eye icon
- Logout button at bottom

Top bar: Editor name, role badge "Editor"

**File:** `frontend/src/layouts/PublicLayout.tsx` + `PublicLayout.css`

Used for all public website pages (Homepage, About, Contact, FAQs).

Components:
- **Navbar:** Logo left, nav links center (Home, About, Contact, FAQs), right side has two buttons: "Student Login" → `/student/login`, "Teacher Login" → `/teacher/login`
- **Footer:** Logo, tagline, quick links, copyright

---

### 0.7 Route Registration

**File:** `frontend/src/App.tsx` — Add all new routes

New provider wrapping order (add inside existing providers):
```
<TeacherAuthProvider>
  <EditorAuthProvider>
    ... existing providers ...
  </EditorAuthProvider>
</TeacherAuthProvider>
```

New routes to add:
```
Public pages (no auth, wrapped in PublicLayout):
  /about
  /contact
  /faqs
  (/ already exists — will be replaced with the new HomePage in Phase 1)

Teacher auth (no layout):
  /teacher/login
  /teacher/register
  /teacher/pending   ← accessible even without full approval

Teacher portal (TeacherProtectedRoute + TeacherLayout):
  /teacher/dashboard
  /teacher/classes
  /teacher/classes/:classId
  /teacher/sessions/new
  /teacher/sessions/:sessionId/edit

Editor auth (no layout):
  /editor/login

Editor portal (EditorProtectedRoute + EditorLayout):
  /editor/dashboard
  /editor/sessions
  /editor/supervision

Admin LMS (existing AdminProtectedRoute + AdminLayout):
  /admin/teachers
  /admin/products
  /admin/lms-sessions

Student LMS (existing StudentProtectedRoute + StudentLayout):
  /student/classes
  /student/classes/:classId/session
```

**AdminLayout.tsx update:** Add 3 new nav items:
- Teachers (UserCheck icon) → `/admin/teachers`
- Products (Package icon) → `/admin/products`
- LMS Sessions (Video icon) → `/admin/lms-sessions`

---

## Phase 1 — Public Website

### 1.1 HomePage (replaces current LandingPage)

**File:** `frontend/src/pages/public/HomePage.tsx`
**Style:** `frontend/src/styles/public.css`

**Sections (top to bottom):**

**Hero Section**
- Background: navy gradient (#0D2D5E → #1a6fad)
- Large headline: "Master Your Medical Exams" or similar
- Subheadline: 1-2 lines describing the platform
- Two CTA buttons: "Start Free Demo" (→ `/student/register`) and "View Courses" (scrolls to products section)
- Subtle animated background element (CSS only, no extra libraries)

**Products Section** (`id="products"`)
- Section heading: "Our Programs"
- Pulls from `getProducts()` mock data
- Cards displayed in a grid (2–3 cols)
- Each product card contains:
  - Product name (large)
  - Description
  - Price: both upfront ($X) and installment ($X/month) displayed
  - Feature bullet list (3-4 items, hardcoded per card)
  - CTA button: "Learn More" or "Enroll Now" → `/student/register`
- If no products in mock data: shows placeholder "Coming Soon" card

**How It Works Section**
- 3 numbered steps:
  1. Sign Up → create account
  2. Join Live Sessions → attend classes via Zoom
  3. Track Progress → view attendance, recordings, roadmap

**Why Choose Us Section**
- 3-4 feature highlight cards with icons:
  - Live Expert Sessions
  - Supervised Learning
  - Flexible Payment
  - Recorded Library

**Testimonials Section**
- 3 mock student testimonials (hardcoded, realistic medical student names/quotes)
- Simple card grid layout

**CTA Banner**
- "Ready to Start?" with "Register Now" button

---

### 1.2 AboutPage

**File:** `frontend/src/pages/public/AboutPage.tsx`

Sections:
- Hero banner: "About NextGen Medical Mastery" + short mission statement
- Mission & Vision: 2-column text block
- What We Offer: bullet list (Live Sessions, Expert Teachers, Flexible Access)
- Values section: 3 cards (Excellence, Accessibility, Results)

---

### 1.3 ContactPage

**File:** `frontend/src/pages/public/ContactPage.tsx`

Sections:
- Contact form: Name (text), Email (email), Subject (text), Message (textarea), Submit button
- On submit: shows a success message "We'll get back to you within 24 hours" (no actual API call)
- Contact info column beside form: Email address (mock), WhatsApp number (mock), Office hours

---

### 1.4 FaqsPage

**File:** `frontend/src/pages/public/FaqsPage.tsx`

Sections:
- Page hero: "Frequently Asked Questions"
- 4 categories as separate labeled sections, each with accordion items:
  - General (5 questions): What is NextGen? / Who are the teachers? / etc.
  - Payments (4 questions): What payment methods? / Can I cancel installments? / etc.
  - Sessions (4 questions): How do I join a live session? / Are sessions recorded? / etc.
  - Demo (3 questions): How long is the demo? / What can I access in demo? / etc.
- Accordion: click to expand/collapse, only one open at a time per section

---

## Phase 2 — Teacher Auth Flow

### 2.1 TeacherRegisterPage

**File:** `frontend/src/pages/teacher/auth/TeacherRegisterPage.tsx`
**Style:** Reuses existing `pages/student/auth/Auth.css`

Fields:
- Full Name (required)
- Email (required, validated format)
- Password (required, min 8 chars)
- Confirm Password (required, must match)
- Phone Number (required)
- Short Bio / Experience (textarea, required, max 300 chars, char counter shown)
- Submit button: "Apply to Teach"

Behavior:
- On submit → calls `registerTeacher()` from lmsApi
- Teacher created with `status: 'pending'`
- TeacherAuthContext `login()` called automatically after registration
- Redirect to `/teacher/pending`
- Below form: "Already approved? Sign in →" link to `/teacher/login`

---

### 2.2 TeacherPendingPage

**File:** `frontend/src/pages/teacher/auth/TeacherPendingPage.tsx`

This page is shown after registration AND whenever a pending teacher logs in.

Layout (centered card):
- Large clock/hourglass icon (lucide: `Clock` or `Hourglass`)
- Heading: "Application Under Review"
- Subtext: "Your teacher application has been submitted. An admin or editor will review your profile and approve your account. This usually takes 1–2 business days."
- Info block showing submitted details: Name, Email, Phone (read-only)
- "Contact Support" link (mailto mock)
- "Logout" button

---

### 2.3 TeacherLoginPage

**File:** `frontend/src/pages/teacher/auth/TeacherLoginPage.tsx`

Fields:
- Email
- Password
- Login button

Behavior:
- Calls `loginTeacher()` from lmsApi
- If `status === 'pending'` → redirect to `/teacher/pending`
- If `status === 'suspended'` → show inline error: "Your account has been suspended. Contact support."
- If `status === 'approved'` → redirect to `/teacher/dashboard`
- Below form: "Apply to become a teacher →" link to `/teacher/register`

---

## Phase 3 — Teacher Portal

### 3.1 TeacherDashboardPage

**File:** `frontend/src/pages/teacher/TeacherDashboardPage.tsx`
**Style:** `frontend/src/styles/teacher.css`

**Stats Row (4 KPI cards):**
- Active Classes (count from teacher's assignedClassIds)
- Total Students (sum of enrolled students across all classes)
- Today's Sessions (sessions scheduled for today)
- Next Session In (countdown to next scheduled session — "2h 30m" chip)

**Today's Sessions Panel:**
- List of sessions scheduled for today (from mock data, filtered by teacherId + today's date)
- Each row: Class name | Scheduled time | Duration | Status badge | Action button
  - If status is `scheduled` and current time is within 30 min of start: "Check In →" button (primary, blue)
  - If status is `live`: "Session Live" badge (green pulsing) + "End Session" button
  - If status is `completed`: "Completed" badge + "View Recording" link (placeholder)
- Empty state: "No sessions scheduled for today"

**Upcoming Sessions Panel (next 7 days):**
- Same row format but without the check-in logic
- Max 5 rows shown, "View All" link to `/teacher/classes`

**Quick Actions Row:**
- "Schedule New Session" button → `/teacher/sessions/new`
- "View My Classes" button → `/teacher/classes`

---

### 3.2 TeacherClassesPage

**File:** `frontend/src/pages/teacher/TeacherClassesPage.tsx`

**Page header:** "My Classes" + subtitle showing total assigned classes

**Classes Grid (2-col on wide, 1-col mobile):**

Each class card:
- Class name (bold, large)
- Product name (small badge)
- Description (1-2 lines, truncated)
- Enrolled students count
- Next session: date + time OR "No upcoming sessions"
- Status chip: "Active" / "No Upcoming"
- Two action buttons: "Manage Sessions" → `/teacher/classes/:classId` and "Notice Board" → `/teacher/classes/:classId` (sessions tab by default, notice board tab param)

**Empty state:** "You have not been assigned to any classes yet. Contact your admin."

---

### 3.3 TeacherClassDetailPage

**File:** `frontend/src/pages/teacher/TeacherClassDetailPage.tsx`

**Page header:**
- Class name
- Product badge
- Enrolled count
- "Schedule New Session" button (top right)

**Tabs: Sessions | Students | Notice Board**

---

**Sessions Tab (default):**

Filter row: All | Scheduled | Live | Completed | Cancelled

Sessions table:
- Date & Time | Duration | Status | Students Attended | Meeting Link | Actions

Actions per row:
- `scheduled`: Edit (pencil icon) | Cancel (X icon)
- `live`: "End Session" button (red) — flips to completed
- `completed`: View Recording (placeholder link)

"Schedule New Session" button opens the **Session Form Modal** (see 3.4)

When editing a scheduled session: opens same modal but with "Reason for Change" field required (if any field was changed)

---

**Students Tab:**

Table: Student Name | Joined Date | Attendance %
- No email or contact info visible (privacy rule)
- Attendance % is mock calculated (attended / total completed sessions)

---

**Notice Board Tab:**

List of notices in reverse chronological order.

Each notice row:
- Icon: megaphone (announcement) or file (PDF)
- Title
- Date posted
- Type badge
- Delete button (trash icon)

"Post Notice" button (top right) opens **Notice Form Modal** (see 3.5)

---

### 3.4 Session Form Modal / Page

Used for both creating and editing sessions.

**File:** `frontend/src/pages/teacher/TeacherSessionFormPage.tsx`
(Can be rendered as a full page at `/teacher/sessions/new` and `/teacher/sessions/:id/edit`)

**Fields:**

- Class (dropdown from teacher's assigned classes — auto-filled if coming from class detail)
- Date (date picker, no past dates allowed)
- Start Time (time picker)
- Duration in minutes (number input, default populated from class.defaultDurationMinutes)
- Meeting Link (text input, auto-populated with `validateMeetingLink()` result, editable)
- Notes (optional textarea)

**If editing existing session (any field changed):**
- "Reason for Change" textarea (required, shows validation error if empty on submit)
- Red info banner: "Any change to a scheduled session requires a reason. This will be logged."

**Submit behavior:**
- New: calls `teacherCreateSession()`, redirect back to class detail
- Edit: calls `teacherUpdateSession()`, redirect back to class detail

---

### 3.5 Notice Form Modal

Inline modal, triggered from class detail notice board tab.

**Fields:**
- Type: toggle buttons "Announcement" | "PDF Upload"
- Title (required)
- Content / Description (textarea, required for announcements, optional for PDF)
- If PDF type: File name input (text, UI only — no actual upload, just stores filename as string)

**Submit:** calls `teacherCreateNotice()`, closes modal, list refreshes

---

### 3.6 Check-In Flow

The "Check In" / "Start Session" button on TeacherDashboardPage and ClassDetailPage.

**On click:**
1. Show confirmation modal: "Start Session for [Class Name]? This will notify all enrolled students."
2. Confirm button calls `teacherStartSession(sessionId)`
3. Session status flips to `'live'` in mock data
4. Modal closes, button changes to "Session Live" pulsing badge + "End Session" button
5. Toast notification: "Session started. Students have been notified. ✓" (mock — no actual notifications sent)

**End Session:**
1. Confirmation: "End Session? This will stop the live session."
2. Calls `teacherEndSession(sessionId)`
3. Status flips to `'completed'`, actualDurationMinutes computed from start time
4. Toast: "Session ended and saved to recording library."

---

## Phase 4 — Editor Portal

### 4.1 EditorLoginPage

**File:** `frontend/src/pages/editor/auth/EditorLoginPage.tsx`
**Style:** Reuses `Auth.css`

- Email + Password
- "Editor Portal" heading with small subtext "Account provided by your admin"
- No register link (editors are created by admin only)

---

### 4.2 EditorDashboardPage

**File:** `frontend/src/pages/editor/EditorDashboardPage.tsx`
**Style:** `frontend/src/styles/editor.css`

**Stats Row (4 KPI cards):**
- Active Products (count)
- Total Classes (count)
- Pending Teachers awaiting approval (count)
- Sessions This Week (count)

**Pending Teachers Alert Panel:**
- If pendingCount > 0: amber alert banner "X teacher(s) awaiting approval → Review Now" link to `/admin/teachers`
- Shows first 3 pending teachers with quick Approve/Reject buttons (calls adminApproveTeacher / adminRejectTeacher)

**Upcoming Sessions Panel:**
- Next 5 sessions across all classes
- Same row format as teacher dashboard but with teacher name column added
- "View All Sessions" → `/editor/sessions`

---

### 4.3 EditorSessionsPage

**File:** `frontend/src/pages/editor/EditorSessionsPage.tsx`

Full sessions management — same view as AdminLmsSessionsPage (see Phase 6.3) but scoped to editor role.

Editor can:
- View all sessions (all products, all classes, all teachers)
- Create new session for any class
- Edit any session (with required change note)
- Cancel sessions

Filters: Product | Class | Teacher | Status | Date range

---

### 4.4 EditorSupervisionPage

**File:** `frontend/src/pages/editor/EditorSupervisionPage.tsx`

**Purpose:** View/monitor student-teacher chats (second half has real chat; this half shows the panel shell with placeholder state)

Layout:
- Left sidebar: list of classes with unread message counts (all zero / mock)
- Main panel: When a class is selected, shows chat thread area
- Chat thread: message bubbles (mock messages between student and teacher)
- Read-only — editor cannot send messages, only observe
- "No live chat sessions" placeholder for now with note: "Live monitoring activates when chat backend is connected."
- Privacy note at top: "All conversations are supervised in real-time."

---

## Phase 5 — Admin LMS Pages

### 5.1 AdminTeachersPage

**File:** `frontend/src/pages/admin/AdminTeachersPage.tsx`
**Style:** `frontend/src/styles/admin/admin-teachers.css`

**Stats Row (4 KPI cards):**
- Total Teachers
- Pending Approval
- Active/Approved
- Suspended

**Filter tabs:** All | Pending | Approved | Suspended

**Teachers Table:**

Columns: Name | Email | Phone | Registered | Status | Classes Assigned | Actions

Actions per row:
- Pending: "Approve" button (green, calls adminApproveTeacher) + "Reject" button (red)
- Approved: "Suspend" button | "View" link (future)
- Suspended: "Reinstate" button

Approve/Reject show a confirmation toast on success.

**"Create Editor" button (top right):**
- Opens modal with fields: Full Name, Email, Password
- On submit calls `adminCreateEditor()`
- Shows success toast with login credentials summary

---

### 5.2 AdminProductsPage

**File:** `frontend/src/pages/admin/AdminProductsPage.tsx`
**Style:** `frontend/src/styles/admin/admin-products.css`

**Stats Row (3 KPI cards):**
- Total Products
- Active Products
- Total Enrolled Students (sum across all products)

**Products Grid or Table (toggle between views):**

Card view per product:
- Product name (large)
- Description
- Upfront price + installment option displayed
- Active/Inactive badge
- Enrolled student count
- Classes count
- Edit button | Toggle Active/Inactive button | Delete button (with confirmation)

**"Add Product" button (top right):**

Opens slide-in panel or full modal with:
- Product Name (required)
- Description (required, textarea)
- Upfront Price (number input, $)
- Installment Amount per month (number input, $)
- Installment Duration in months (number input)
- Status toggle: Active / Inactive (default: Active)
- Submit calls `adminCreateProduct()`

**Edit Product:** Same form pre-filled.

**Delete Product:** Confirmation dialog "This will remove [Name]. This cannot be undone." Only allowed if 0 enrolled students.

---

### 5.3 AdminLmsSessionsPage

**File:** `frontend/src/pages/admin/AdminLmsSessionsPage.tsx`
**Style:** `frontend/src/styles/admin/admin-lms-sessions.css`

**Stats Row (4 KPI cards):**
- Total Scheduled (upcoming)
- Live Right Now
- Completed (this month)
- Cancelled (this month)

**Live Sessions Alert:**
- If any session has `status === 'live'`: highlighted banner showing live sessions with teacher name + class name + "Started X min ago"

**Filters:**
- Product dropdown
- Class dropdown (filtered by selected product)
- Teacher dropdown
- Status tabs: All | Scheduled | Live | Completed | Cancelled
- Date range picker

**Sessions Table:**

Columns: Date & Time | Class | Teacher | Product | Duration | Status | Attended | Change Note | Actions

Actions:
- Scheduled: Edit (any field + required change note) | Cancel
- Live: End Session (admin override)
- Completed: View Recording (placeholder)

---

### 5.4 Demo Overrides (added to existing AdminStudentsPage)

**Update:** `frontend/src/pages/admin/AdminStudentsPage.tsx`

Add a new column to the student table: "Demo Access"
- Shows: expiry date OR "Full Access" OR "Expired"

Add action per row: "Override Demo" button (small, secondary)
- Opens modal: "Demo Access Override for [Student Name]"
  - Current status displayed
  - Radio options:
    - "Extend by X days" (number input, 1–30)
    - "Grant Full Access" (removes demo limit entirely)
    - "Reset to Expired" (immediate expiry)
  - Submit calls `adminSetDemoOverride()`
  - Shows success toast

---

## Phase 6 — Student LMS Pages

### 6.1 MyClassesPage

**File:** `frontend/src/pages/student/MyClassesPage.tsx`
**Style:** `frontend/src/styles/lms-student.css`

**Page header:** "My Classes"

**If no classes enrolled:**
- Empty state card with icon
- "You are not enrolled in any classes yet."
- "Browse Programs" button → `/` (homepage products section)

**If classes enrolled:**

**"Live Now" Banner (conditional):**
- If any enrolled class has an active live session: amber/green pulsing banner at top
- "A session is live right now for [Class Name] — Join Now →"

**Classes Grid (2-col on wide, 1-col on mobile):**

Each class card:
- Class name
- Product name (small badge)
- Teacher: "Dr. [First name only]" (limited privacy — no last name, no contact)
- **Countdown chip** (key feature):
  - If session is live: green pulsing "Live Now" badge + "Join Session" button
  - If session is today (future time): "Today at 3:00 PM — in 2h 15m"
  - If session is tomorrow: "Tomorrow at 10:00 AM"
  - If session is this week: "Thursday at 10:00 AM — in 3 days"
  - If no upcoming sessions: "No upcoming sessions scheduled"
- Attendance rate chip: "Attended 8/10 sessions" (mock data)
- "View Class" link → `/student/classes/:classId/session`

---

### 6.2 LiveSessionPage (per class)

**Route:** `/student/classes/:classId/session`
**File:** `frontend/src/pages/student/LiveSessionPage.tsx`

**Header:**
- Class name + teacher name (first name only)
- Status: "Live Now" (green pulse) | "Scheduled for [datetime]" | "No upcoming session"

**Main content area — Zoom placeholder:**

If session status === `'live'`:
- Large iframe placeholder area (dark background, aspect ratio 16:9)
- Center: Zoom logo icon + "Live Session in Progress"
- "Join via Zoom" button (primary blue, links to session.meetingLink)
- Note: "Zoom meeting will open in a new window"

If session status === `'scheduled'`:
- Countdown timer (large, prominent): days/hours/minutes/seconds until session starts
- "Session starts [date] at [time]"
- "Add to Calendar" button (placeholder, no action)
- Zoom icon placeholder with "Meeting link will be available when session starts"

If no upcoming session:
- "No upcoming session scheduled. Check back later."
- Link back to My Classes

**Sidebar (right panel, collapsible on mobile):**

Notice Board tab:
- List of class notices (from mock data)
- Each notice: title, date, type icon
- PDF notices: "Download" button (placeholder, no actual download)
- Empty state: "No notices yet"

---

## Phase 7 — Styles Summary

All new CSS files follow the same naming and token conventions as existing files.

| File | Used By |
|---|---|
| `styles/public.css` | PublicLayout, HomePage, AboutPage, ContactPage, FaqsPage |
| `styles/teacher.css` | All teacher portal pages |
| `styles/editor.css` | All editor portal pages |
| `styles/lms-student.css` | MyClassesPage, LiveSessionPage |
| `styles/admin/admin-teachers.css` | AdminTeachersPage |
| `styles/admin/admin-products.css` | AdminProductsPage |
| `styles/admin/admin-lms-sessions.css` | AdminLmsSessionsPage |

**Shared design tokens (already in index.css, use these):**
- Navy: `#0D2D5E`
- Primary blue: `#1a6fad`
- Light blue border: `#d6e7fa`
- Surface: `#f6fbff`
- Text secondary: `#55789c`
- Success: `#16a34a`
- Warning: `#b45309`
- Error: `#dc2626`

---

## Implementation Order

Build in this exact sequence — each step unblocks the next.

```
Step 1   types/lms.ts                        → all interfaces defined
Step 2   data/lms.ts                         → mock data + storage helpers
Step 3   services/lmsApi.ts                  → all stubs returning mock data
Step 4   TeacherAuthContext.tsx              → teacher auth state
Step 5   EditorAuthContext.tsx               → editor auth state
Step 6   TeacherProtectedRoute.tsx           → routing guard
Step 7   EditorProtectedRoute.tsx            → routing guard
Step 8   TeacherLayout.tsx + css            → teacher sidebar
Step 9   EditorLayout.tsx + css             → editor sidebar
Step 10  PublicLayout.tsx + css             → public navbar/footer
Step 11  App.tsx route additions             → all new routes wired up
Step 12  public/HomePage.tsx                → replaces LandingPage at /
Step 13  public/AboutPage.tsx               → /about
Step 14  public/ContactPage.tsx             → /contact
Step 15  public/FaqsPage.tsx               → /faqs
Step 16  teacher/auth/TeacherRegisterPage   → /teacher/register
Step 17  teacher/auth/TeacherPendingPage    → /teacher/pending
Step 18  teacher/auth/TeacherLoginPage      → /teacher/login
Step 19  teacher/TeacherDashboardPage       → /teacher/dashboard
Step 20  teacher/TeacherClassesPage         → /teacher/classes
Step 21  teacher/TeacherClassDetailPage     → /teacher/classes/:classId
Step 22  teacher/TeacherSessionFormPage     → /teacher/sessions/new + edit
Step 23  editor/auth/EditorLoginPage        → /editor/login
Step 24  editor/EditorDashboardPage         → /editor/dashboard
Step 25  editor/EditorSessionsPage          → /editor/sessions
Step 26  editor/EditorSupervisionPage       → /editor/supervision
Step 27  admin/AdminTeachersPage            → /admin/teachers
Step 28  admin/AdminProductsPage            → /admin/products
Step 29  admin/AdminLmsSessionsPage         → /admin/lms-sessions
Step 30  AdminStudentsPage update           → demo override column + modal
Step 31  student/MyClassesPage              → /student/classes
Step 32  student/LiveSessionPage            → /student/classes/:classId/session
Step 33  AdminLayout.tsx update             → add 3 new nav items
```

---

## Files Created — Complete List

```
frontend/src/types/
  lms.ts                                     NEW

frontend/src/data/
  lms.ts                                     NEW

frontend/src/services/
  lmsApi.ts                                  NEW

frontend/src/context/
  TeacherAuthContext.tsx                     NEW
  EditorAuthContext.tsx                      NEW

frontend/src/components/routing/
  TeacherProtectedRoute.tsx                  NEW
  EditorProtectedRoute.tsx                   NEW

frontend/src/layouts/
  TeacherLayout.tsx                          NEW
  TeacherLayout.css                          NEW
  EditorLayout.tsx                           NEW
  EditorLayout.css                           NEW
  PublicLayout.tsx                           NEW
  PublicLayout.css                           NEW

frontend/src/pages/public/
  HomePage.tsx                               NEW (replaces current LandingPage at /)
  AboutPage.tsx                              NEW
  ContactPage.tsx                            NEW
  FaqsPage.tsx                               NEW

frontend/src/pages/teacher/
  auth/TeacherRegisterPage.tsx               NEW
  auth/TeacherPendingPage.tsx                NEW
  auth/TeacherLoginPage.tsx                  NEW
  TeacherDashboardPage.tsx                   NEW
  TeacherClassesPage.tsx                     NEW
  TeacherClassDetailPage.tsx                 NEW
  TeacherSessionFormPage.tsx                 NEW

frontend/src/pages/editor/
  auth/EditorLoginPage.tsx                   NEW
  EditorDashboardPage.tsx                    NEW
  EditorSessionsPage.tsx                     NEW
  EditorSupervisionPage.tsx                  NEW

frontend/src/pages/admin/
  AdminTeachersPage.tsx                      NEW
  AdminProductsPage.tsx                      NEW
  AdminLmsSessionsPage.tsx                   NEW
  AdminStudentsPage.tsx                      MODIFIED (demo override)

frontend/src/pages/student/
  MyClassesPage.tsx                          NEW
  LiveSessionPage.tsx                        NEW

frontend/src/styles/
  public.css                                 NEW
  teacher.css                                NEW
  editor.css                                 NEW
  lms-student.css                            NEW
  admin/admin-teachers.css                   NEW
  admin/admin-products.css                   NEW
  admin/admin-lms-sessions.css               NEW

frontend/src/App.tsx                         MODIFIED (new routes + providers)
frontend/src/layouts/AdminLayout.tsx         MODIFIED (3 new nav items)
```

**Total: 33 new files, 3 modified files**

---

## What Is NOT in First Half (Deferred to Second Half)

- Recorded sessions library (student view)
- Attendance records page (student view)
- Student-teacher chat UI
- Class notice board from student side (viewing)
- Downloadable materials section
- Student personal profile
- Learning roadmap preview (circular/step-wise progress)
- Demo FOMO UI (blurred roadmap, paywall modals, "what you'll miss")
- Enrollment / payment page (upfront vs installments, coupons)
- In-app notification inbox
- Admin/Editor chat supervision with live data
- Teacher performance analytics (hidden telemetry)

---
---

# LMS Frontend — Second Half Implementation Plan

This document is the complete, step-by-step plan for the second half of the LMS frontend. It picks up exactly where the first half left off. Same rules apply — no backend, all data mocked via localStorage, every service function marked `// BACKEND SWAP`. Pages build on top of the infrastructure already created in the first half.

---

## Scope of Second Half

| Area | What Gets Built |
|---|---|
| Student Portal | Profile, Attendance records, Recorded sessions library, Ask-question flow |
| Chat System | Student ↔ Teacher chat UI, Teacher inbox, Editor/Admin live supervision |
| Notifications | In-app notification enhancements, push notification opt-in, session alert banners |
| Demo & FOMO | Demo countdown banner, Demo gate component, FOMO roadmap preview, Demo expired page |
| Payments | Product detail page (public), Checkout page, Payment success, Installment management |
| Admin Enhancements | Class creation/management, Student enrollment management, Coupon management, Recording library |
| Teacher Enhancements | Recording upload management, Class analytics (hidden from students) |

---

## Phase 8 — Student Portal Enhancements

### 8.1 StudentProfilePage

**Route:** `/student/profile`
**File:** `frontend/src/pages/student/StudentProfilePage.tsx`
**Nav:** Add "Profile" item to StudentLayout NAV_ITEMS (UserCircle icon)

**Sections:**

**Profile Card (top):**
- Avatar circle with initials (same as sidebar)
- Full name (large)
- Email (read-only)
- Member since date (from mock auth data)
- Current plan badge (from SubscriptionContext)
- "Edit Profile" button — opens inline edit form for name and phone (no password change here)

**Enrolled Classes Summary:**
- Small cards for each enrolled class
- Class name, product badge, teacher first name
- "View Class →" link
- If no classes: "You are not enrolled in any classes yet."

**Demo Status Block (conditional — only shown if demo active):**
- Demo expiry countdown chip
- "Upgrade to Full Access" button → `/student/checkout` (or `/student/upgrade` until payment is built)

---

### 8.2 AttendancePage (per class)

**Route:** `/student/classes/:classId/attendance`
**File:** `frontend/src/pages/student/AttendancePage.tsx`
**Access:** Linked from LiveSessionPage sidebar tab "Attendance"

**Header:**
- Class name + product badge
- Overall attendance: large circle percentage indicator (e.g. 80%)
- Sub-label: "8 of 10 sessions attended"

**Session List:**
- Table or card list of all completed sessions for this class
- Columns: Date | Duration | Status
- Status options:
  - Green checkmark chip: "Attended"
  - Red cross chip: "Missed"
  - Grey chip: "Cancelled" (these don't count against attendance)
- Mock data: randomise attended/missed per session (seeded by student+class ID so it stays consistent on re-render)

**Important — Privacy Rule:**
- No other students' attendance is visible
- No absolute attendance count shown (only the student's own percentage)
- Internal admin stats (exact counts, all-student view) are handled in the admin panel only — never shown here

---

### 8.3 RecordedSessionsPage (per class)

**Route:** `/student/classes/:classId/recordings`
**File:** `frontend/src/pages/student/RecordedSessionsPage.tsx`
**Access:** New "Recordings" tab in LiveSessionPage layout

**Full Access State:**
- List of all completed sessions that have a `recordingUrl`
- Each row: Session date | Duration | "Watch Recording" button (links to recordingUrl, opens in new tab)
- Empty state if no recordings yet: "Recordings will appear here after each session ends."

**Demo Access State (demo not yet expired, but limited):**
- Only the most recent same-day recording is accessible
- All older recordings show a locked card:
  - Blurred thumbnail placeholder
  - Lock icon overlay
  - "Full access required — Enroll to unlock all recordings"
  - Small "Upgrade" button

**Demo Expired State:**
- All recordings locked
- Full-width banner: "Your demo has ended. Enroll to access all recorded sessions."

---

### 8.4 LiveSessionPage — Sidebar Tabs Update

**File:** Update `frontend/src/pages/student/LiveSessionPage.tsx`

The current sidebar shows only the Notice Board. Add two more tabs:

**Tabs: Notice Board | Recordings | Attendance**
- Tab state managed with `useState`
- Notice Board: existing content
- Recordings: links to `/student/classes/:classId/recordings` (or renders inline)
- Attendance: links to `/student/classes/:classId/attendance` (or renders inline chip showing current %)

---

### 8.5 AskQuestionFlow

**Component:** `frontend/src/components/lms/AskQuestionModal.tsx`
**Triggered from:** LiveSessionPage main content area — "Ask a Question" button below the session state panel

**Modal layout:**
- Heading: "Ask [Teacher First Name] a Question"
- Privacy note: "Your question will be visible to your teacher and platform supervisors."
- Textarea: question text (required, max 500 chars, char counter shown)
- Submit button: "Send Question"
- On submit (mock): shows success state "Question sent ✓" and closes after 2 seconds
- Backend swap: POST /api/v1/chat/messages (hooks into chat system)

---

## Phase 9 — Chat System

The chat system enables private Student ↔ Teacher communication, with Admin and Editor able to observe all threads in read-only supervision mode.

### 9.1 Data Model (mock additions to `data/lms.ts`)

```
ChatMessage
  id: string
  classId: string
  studentId: string
  senderRole: 'student' | 'teacher'
  text: string
  sentAt: string   // ISO datetime
  read: boolean    // has the other party read it?

localStorage key: nextgen.lms.chat-messages
```

Add `getChatMessages() / saveChatMessages()` helpers.
Add seed data: 3–4 mock message threads between the seeded student and teacher.

---

### 9.2 StudentChatPage

**Route:** `/student/classes/:classId/chat`
**File:** `frontend/src/pages/student/StudentChatPage.tsx`
**Style:** `frontend/src/styles/chat.css`
**Nav:** "Chat" tab added to LiveSessionPage sidebar tabs (replaces or is added alongside Attendance)

**Layout:**
- Full-height chat thread panel
- Header: "Chat with Dr. [TeacherFirstName]" + privacy badge "Supervised"
- Message thread:
  - Student messages: right-aligned, blue bubble
  - Teacher messages: left-aligned, grey bubble
  - Timestamp shown below each message
  - "Read" / "Unread" indicator on student's own messages
- Input bar at bottom: textarea (Enter to send, Shift+Enter for newline) + Send button
- On send: appends message to localStorage, re-renders thread

**Privacy notice (top of thread):**
- Small amber bar: "All messages in this chat are visible to platform supervisors."

---

### 9.3 TeacherChatPage

**Route:** `/teacher/classes/:classId/chat`
**File:** `frontend/src/pages/teacher/TeacherChatPage.tsx`
**Nav:** Add "Chat" nav item to TeacherLayout (MessageSquare icon)

**Layout — two-panel:**

**Left panel (student list):**
- List of all students enrolled in this class
- Student name (first name only — privacy)
- Unread message count badge
- "Last message" preview (truncated)
- Click to open chat thread

**Right panel (chat thread):**
- Same bubble layout as StudentChatPage
- Teacher messages: right-aligned, navy bubble
- Student messages: left-aligned, grey bubble
- Send message input at bottom
- "No conversation selected" empty state

**Header:**
- Class name + student name once selected

---

### 9.4 EditorSupervisionPage — Live Update

**File:** Update `frontend/src/pages/editor/EditorSupervisionPage.tsx`
**Route:** `/editor/supervision` (already exists — replace shell with real content)

**Layout — two-panel (same as TeacherChatPage but read-only):**

**Left panel:**
- Dropdown: filter by class
- List of all active student-teacher threads across all classes
- Each row: Student name | Class name | Unread count | Last message preview

**Right panel:**
- Read-only chat thread view (same bubble layout)
- Top banner: "Supervision Mode — Read Only. You cannot send messages."
- "Flag Conversation" button (mock — shows toast "Flagged for review")

---

### 9.5 AdminChatSupervisionPage

**Route:** `/admin/chat-supervision`
**File:** `frontend/src/pages/admin/AdminChatSupervisionPage.tsx`
**Nav:** Add to AdminLayout — "Chat Supervision" (Eye icon) → `/admin/chat-supervision`

Identical layout to EditorSupervisionPage but with additional "Delete Message" action per bubble (admin only). Delete is mock — removes from localStorage and re-renders.

---

## Phase 10 — Notifications

### 10.1 NotificationBanner (shared component)

**File:** `frontend/src/components/lms/SessionStartingBanner.tsx`

Appears at the top of student pages (inside StudentLayout, above page content) when:
- A session for any enrolled class starts within 60 minutes: amber banner "Your session starts in X minutes — [Class Name]"
- A session is currently live: green pulsing banner (same as current live banner but shown globally, not just on MyClassesPage)

Implemented as a context-aware component that reads from enrolled classes on mount.

---

### 10.2 NotificationPreferencesPage

**Route:** `/student/notifications`
**File:** `frontend/src/pages/student/NotificationPreferencesPage.tsx`
**Nav:** Accessible from StudentProfilePage ("Notification Settings" link)

**Preferences (mock — stored in localStorage):**

- **Email notifications:** toggle (default: on)
  - Sub-options: Session reminders (1h before), Session started, Session rescheduled, New notice posted
- **Push notifications:** toggle with browser permission request on enable
  - On toggle on: calls `Notification.requestPermission()` — if denied, shows info message explaining how to enable
  - Sub-options: same as email
- **WhatsApp:** informational only — "WhatsApp notifications are sent to the phone number on your profile. Contact support to update."

On save: stores preferences to `localStorage` key `nextgen.student.notification-prefs.<userId>`

---

### 10.3 InboxPage — LMS Notification Feed

**File:** Update existing `frontend/src/pages/student/InboxPage.tsx`

Add a second tab alongside existing announcements: **"LMS Alerts"**

LMS Alerts tab shows a feed of LMS-specific notifications:
- "Session Starting in 30 min — Step 1 Intensive" (with timestamp and "View Class" button)
- "Session Rescheduled — Step 1 Intensive moved to [new date]" (with change note)
- "New Notice Posted — [Notice title]"
- "Your demo access expires in 2 days" (amber chip)

Each item: icon + message text + timestamp + action button. Read/unread state tracked in localStorage.

---

## Phase 11 — Demo & FOMO System

### 11.1 DemoCountdownBanner (student)

**File:** `frontend/src/components/lms/DemoCountdownBanner.tsx`

A persistent banner shown at the top of all student LMS pages when `enrollment.demoExpiresAt` is set and not yet expired.

**States:**

- **More than 24h remaining:** amber banner
  - "Demo Access — X days and Y hours remaining"
  - "Upgrade to Full Access →" button

- **Under 24h remaining:** red pulsing banner
  - "Your demo expires in Xh Ym! Enroll now to keep access."
  - "Enroll Now →" button (prominent)

Banner is dismissible per session (re-appears on next page load). Dismissal stored in `sessionStorage`.

---

### 11.2 DemoGate (reusable component)

**File:** `frontend/src/components/lms/DemoGate.tsx`

A wrapper component placed around content that is restricted during demo.

```
<DemoGate reason="Recordings are available after full enrollment.">
  <RecordedSessionCard ... />
</DemoGate>
```

**Render logic:**
- If student has full access → renders children normally
- If student is in demo → renders a locked overlay card:
  - Blurred/greyed background preview of child content
  - Lock icon (lucide: `Lock`)
  - Reason text
  - "Upgrade" button

Used in: RecordedSessionsPage (older recordings), full chat history, attendance stats beyond summary.

---

### 11.3 LmsFomoPreviewPage

**Route:** `/student/lms-preview`
**File:** `frontend/src/pages/student/LmsFomoPreviewPage.tsx`
**Access:** Shown to demo students from their dashboard and from the demo countdown banner CTA

**Purpose:** Convert demo students into paid students by showing them what they're missing.

**Sections (top to bottom):**

**Hero:**
- "You're in demo mode — here's what you'll unlock when you enroll"
- Demo expiry chip (red if < 24h)

**What You'll Get — Feature Grid:**
- 4 cards side-by-side:
  1. All Recorded Sessions (lock icon, "Only today's available in demo")
  2. Full Chat with Teacher (lock icon, "Ask unlimited questions")
  3. Full Attendance History (lock icon, "Track your progress")
  4. Priority Notifications (lock icon, "Never miss a session")

**Session Roadmap (FOMO):**
- Upcoming session cards for the class, showing:
  - Sessions 1–3 of the program: ticked (already happened or in demo)
  - Sessions 4–10: greyed-out, lock icon, "Available after enrollment"
  - Topic labels per session (hardcoded mock: "Cardiology Basics", "Renal Physiology", etc.)
- Visual impact: student sees how much they'd miss

**Social Proof Strip:**
- "X students enrolled this week" (mock number)
- 3 short student quotes (hardcoded)

**CTA Banner:**
- Full-width: "Ready to unlock everything?" + "Enroll Now" button → `/student/checkout`

---

### 11.4 DemoExpiredPage

**Route:** `/student/demo-expired`
**File:** `frontend/src/pages/student/DemoExpiredPage.tsx`
**Access:** StudentProtectedRoute redirects here when `demoExpiresAt` is set and past

**Layout:**
- Centered card
- Large lock icon
- "Your demo access has ended"
- "You had access to: Today's recording, Countdown timer, Notice board"
- "Enroll to get: All recordings, Teacher chat, Full attendance history, Session notifications"
- Two buttons: "Enroll Now" (primary) and "Contact Support" (ghost)

---

## Phase 12 — Payment & Enrollment System

### 12.1 ProductDetailPage (public)

**Route:** `/programs/:productId`
**File:** `frontend/src/pages/public/ProductDetailPage.tsx`
**Access:** "Learn More" / "Enroll Now" from HomePage product cards

**Sections:**

**Hero:**
- Product name + description
- Teacher section: "Taught by Dr. [Name]" with bio excerpt
- Key stats: X students enrolled, X sessions per week, X mins avg session

**Pricing Section:**
- Toggle: "Upfront" | "Installments"
- Upfront card: full price, discount badge if applicable, "Save X%"
- Installment card: $X/month × N months = $Y total
- Coupon code input: text input + "Apply" button
  - Valid code: shows discount applied, updates price displayed
  - Invalid code: inline error
- "Start Demo (Free)" button → `/student/register?productId=...`
- "Enroll Now" button → `/student/checkout/:productId`

**What's Included:**
- Bullet list: Live sessions, Recorded library, Teacher chat, Notice board, Attendance tracking

**Schedule Preview:**
- Mock upcoming sessions for this product (3 cards with day/time/topic)

---

### 12.2 CheckoutPage

**Route:** `/student/checkout/:productId`
**File:** `frontend/src/pages/student/CheckoutPage.tsx`
**Protected:** StudentProtectedRoute required

**Layout — two-column:**

**Left — Order Summary:**
- Product name
- Plan selected: Upfront ($X) or Installment ($X/month)
- Coupon discount line (if applied, shown in green)
- Subtotal → Total
- Feature list (what they're getting)

**Right — Payment Form:**
- Plan toggle: Upfront | Installments
- Installment details: "$X/month for N months — auto-charged on [day] of each month"
- Card details section (Stripe Elements placeholder — real Stripe in second half backend)
  - In mock: simple form fields (card number, expiry, CVC) that don't validate
  - Submit triggers mock "Processing…" state then redirects to `/student/payment-success`
- "Cancel — Go Back" ghost link

---

### 12.3 PaymentSuccessPage

**Route:** `/student/payment-success`
**File:** `frontend/src/pages/student/PaymentSuccessPage.tsx`

**Layout (centered):**
- Large green checkmark animation (CSS only)
- "You're enrolled!"
- Product name + class name
- "Your first session is on [date] at [time]"
- Two buttons: "Go to My Classes" (primary) + "View Receipt" (ghost, placeholder)

---

### 12.4 BillingPage (installment management)

**Route:** `/student/billing`
**File:** `frontend/src/pages/student/BillingPage.tsx`
**Nav:** Add "Billing" item to StudentLayout (CreditCard icon) — only visible if student has an active installment plan

**Sections:**

**Current Plan:**
- Plan name + product name
- Payment method: card ending in XXXX (mock)
- Next payment: date + amount
- Status chip: Active / Paused / Cancelled

**Payment History table:**
- Date | Amount | Status (Paid / Failed / Upcoming)
- "Download Receipt" placeholder button per row

**Cancel Plan section:**
- "Cancel Installment Plan" button (red, ghost)
- Confirmation modal: "Are you sure? You will lose access at end of current billing period."
- On confirm: mock cancels plan, shows "Cancellation scheduled" state

---

### 12.5 CouponManagementPage (admin)

**Route:** `/admin/coupons`
**File:** `frontend/src/pages/admin/AdminCouponsPage.tsx`
**Nav:** Add "Coupons" nav item to AdminLayout (Tag icon)

**Stats Row (3 KPI cards):**
- Total Coupons | Active Coupons | Total Uses

**Coupons Table:**
- Code | Discount | Type (% or fixed) | Max Uses | Used Count | Expiry | Status | Actions

**Actions per row:**
- Active: "Deactivate" button
- Expired/Inactive: "Activate" button + "Delete" button

**"Create Coupon" button (top right):**
- Modal with:
  - Code (text, auto-uppercase)
  - Discount type: toggle "Percentage" | "Fixed Amount"
  - Discount value (number)
  - Max uses (number, 0 = unlimited)
  - Expiry date (date picker, optional)
  - Product (dropdown — which product this applies to, or "All Products")
  - Submit → calls `adminCreateCoupon()` (marked BACKEND SWAP)

---

## Phase 13 — Admin Class & Enrollment Management

### 13.1 AdminClassesPage

**Route:** `/admin/classes`
**File:** `frontend/src/pages/admin/AdminClassesPage.tsx`
**Nav:** Add "Classes" nav item to AdminLayout (BookOpen icon) → `/admin/classes`

**Stats Row (3 KPI cards):**
- Total Classes | Active Classes (with upcoming sessions) | Total Enrolled Students

**Classes Table:**
- Class Name | Product | Teacher | Enrolled Count | Next Session | Actions

**Actions per row:**
- "Manage Enrollments" → opens enrollment drawer/panel
- "Edit Class" → opens edit modal (change name, teacher, default duration)
- "View Sessions" → links to `/admin/lms-sessions?classId=...`

**"Create Class" button (top right):**
- Modal with:
  - Class Name (required)
  - Product (dropdown)
  - Teacher (dropdown — approved teachers only)
  - Default Duration in minutes
  - Description (optional)
  - Submit → calls `adminCreateClass()`

---

### 13.2 EnrollmentDrawer (within AdminClassesPage)

A slide-in panel (right side) that opens when "Manage Enrollments" is clicked for a class.

**Top section — Current Enrollments:**
- List of enrolled students: name, enrolled date, demo_expires_at status chip (Full Access / Demo: X days / Expired)
- "Remove" button per student (with confirmation)

**Bottom section — Enroll New Student:**
- Search input: search students by name or email
- Results dropdown: click to select
- Demo access toggle: "Grant demo access" with date picker for expiry, or "Full access"
- "Enroll" button → calls `adminEnrollStudent(classId, studentId, demoExpiresAt)`

---

## Phase 14 — Teacher Analytics & Recording Management

### 14.1 TeacherAnalyticsPage

**Route:** `/teacher/analytics`
**File:** `frontend/src/pages/teacher/TeacherAnalyticsPage.tsx`
**Nav:** Add "Analytics" item to TeacherLayout (BarChart2 icon)

**Important:** This data must NEVER be shown to students. It is strictly internal.

**Stats Row (4 KPI cards):**
- Total Sessions Completed | Avg Attendance Rate | Avg Session Duration | Total Students Taught

**Per-Class Breakdown:**
- Dropdown to select class
- Attendance Rate over time: simple bar chart (CSS-only bars, no chart library)
  - Each bar = one session, height = attendance %
- Sessions table: Date | Scheduled Duration | Actual Duration | Students Attended | Attendance %
- Empty state if no completed sessions yet

**Student Engagement:**
- Questions asked count per student (mock)
- Most active students (top 3, first name only)
- Privacy note: "Student names shown to teacher only. Not visible to other students."

---

### 14.2 Recording Management Tab (TeacherClassDetailPage update)

**File:** Update `frontend/src/pages/teacher/TeacherClassDetailPage.tsx`
Add a **"Recordings"** tab alongside Sessions | Students | Notice Board.

**Recordings Tab:**
- List of completed sessions
- Each row: Date | Duration | Recording Status chip (Available / Pending / Not uploaded)
- "Add Recording URL" button per row (for sessions without a recording)
  - Opens inline input: paste recording URL (Zoom recording link, Google Drive, etc.)
  - Submit → calls `updateSessionRecording(sessionId, url)`
- "Remove Recording" for sessions that have one
- Note: Recording URLs are visible to enrolled students (full access only)

---

## Phase 15 — Styles Summary

New CSS files required for the second half:

| File | Used By |
|---|---|
| `styles/chat.css` | StudentChatPage, TeacherChatPage, EditorSupervisionPage, AdminChatSupervisionPage |
| `styles/demo.css` | DemoCountdownBanner, DemoGate, LmsFomoPreviewPage, DemoExpiredPage |
| `styles/payment.css` | ProductDetailPage, CheckoutPage, PaymentSuccessPage, BillingPage |
| `styles/admin/admin-classes.css` | AdminClassesPage, EnrollmentDrawer |
| `styles/admin/admin-coupons.css` | AdminCouponsPage |

All new files follow the same design token conventions used throughout the first half.

---

## New Routes to Register in App.tsx

```
Public:
  /programs/:productId          → ProductDetailPage

Student (protected):
  /student/profile              → StudentProfilePage
  /student/classes/:classId/attendance   → AttendancePage
  /student/classes/:classId/recordings   → RecordedSessionsPage
  /student/classes/:classId/chat         → StudentChatPage
  /student/lms-preview          → LmsFomoPreviewPage
  /student/demo-expired         → DemoExpiredPage
  /student/checkout/:productId  → CheckoutPage
  /student/payment-success      → PaymentSuccessPage
  /student/billing              → BillingPage
  /student/notifications        → NotificationPreferencesPage

Teacher (protected):
  /teacher/classes/:classId/chat  → TeacherChatPage
  /teacher/analytics              → TeacherAnalyticsPage

Admin (protected):
  /admin/classes                → AdminClassesPage
  /admin/coupons                → AdminCouponsPage
  /admin/chat-supervision       → AdminChatSupervisionPage

Editor (already registered):
  /editor/supervision           → EditorSupervisionPage (update from shell to live)
```

---

## New Service Functions to Add in `lmsApi.ts`

All marked `// BACKEND SWAP`:

```
Chat:
  getChatMessages(classId, studentId)         → ChatMessage[]
  sendChatMessage(classId, text)              → ChatMessage
  getAllChatThreads(classId)                  → ChatThread[] (teacher/editor/admin)
  deleteChatMessage(messageId)               → void (admin only)

Attendance:
  getAttendanceForClass(classId)             → AttendanceRecord[]

Recordings:
  getRecordingsForClass(classId)             → RecordedSession[]
  updateSessionRecording(sessionId, url)     → LmsSession

Notifications:
  getNotificationPrefs(studentId)            → NotificationPrefs
  saveNotificationPrefs(prefs)               → void
  getLmsNotifications(studentId)             → LmsNotification[]
  markNotificationRead(id)                   → void

Payments (mock Stripe):
  getCoupons()                               → Coupon[]
  adminCreateCoupon(payload)                 → Coupon
  adminDeactivateCoupon(id)                  → void
  validateCoupon(code, productId)            → { valid, discount }
  submitCheckout(productId, plan, coupon)    → { success, enrollmentId }

Admin — Classes & Enrollment:
  adminGetClasses()                          → LmsClass[]
  adminCreateClass(payload)                  → LmsClass
  adminUpdateClass(id, payload)              → void
  adminEnrollStudent(classId, studentId, demoExpiresAt?) → void
  adminRemoveEnrollment(classId, studentId)  → void
  adminGetEnrollmentsForClass(classId)       → Enrollment[]

Teacher:
  getTeacherAnalytics(teacherId)             → TeacherAnalytics
```

---

## New Types to Add in `types/lms.ts`

```
ChatMessage
  id: string
  classId: string
  studentId: string
  senderRole: 'student' | 'teacher'
  text: string
  sentAt: string
  read: boolean

AttendanceRecord
  sessionId: string
  scheduledAt: string
  durationMinutes: number
  status: 'attended' | 'missed' | 'cancelled'

RecordedSession
  sessionId: string
  scheduledAt: string
  durationMinutes: number
  recordingUrl: string | null
  accessLevel: 'full' | 'demo_only' | 'locked'

Coupon
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxUses: number
  usedCount: number
  productId: string | null   // null = all products
  expiresAt: string | null
  isActive: boolean
  createdAt: string

NotificationPrefs
  studentId: string
  emailEnabled: boolean
  pushEnabled: boolean
  sessionReminder: boolean
  sessionStarted: boolean
  sessionRescheduled: boolean
  noticePosted: boolean

LmsNotification
  id: string
  type: 'session_starting' | 'session_live' | 'session_rescheduled' | 'notice_posted' | 'demo_expiring'
  message: string
  classId?: string
  read: boolean
  createdAt: string

TeacherAnalytics
  teacherId: string
  totalSessionsCompleted: number
  avgAttendanceRate: number
  avgActualDuration: number
  totalStudentsTaught: number
  perSession: SessionAnalytics[]

SessionAnalytics
  sessionId: string
  scheduledAt: string
  scheduledDuration: number
  actualDuration: number | null
  attendanceCount: number | null
  attendancePercent: number | null
```

---

## Implementation Order

Build in this sequence — earlier steps unblock later ones.

```
Step 1   Add new types to types/lms.ts
Step 2   Add ChatMessage, AttendanceRecord, Coupon data + helpers to data/lms.ts
Step 3   Add all new service stubs to lmsApi.ts (BACKEND SWAP)
Step 4   StudentProfilePage             /student/profile
Step 5   AttendancePage                 /student/classes/:classId/attendance
Step 6   RecordedSessionsPage           /student/classes/:classId/recordings
Step 7   DemoGate component             (used by recordings + other pages)
Step 8   DemoCountdownBanner component  (shown on student LMS pages)
Step 9   DemoExpiredPage                /student/demo-expired
Step 10  LmsFomoPreviewPage             /student/lms-preview
Step 11  LiveSessionPage sidebar tabs update (add Recordings, Attendance, Chat tabs)
Step 12  AskQuestionModal component
Step 13  chat.css styles
Step 14  StudentChatPage                /student/classes/:classId/chat
Step 15  TeacherChatPage                /teacher/classes/:classId/chat
Step 16  EditorSupervisionPage update   (shell → live, /editor/supervision)
Step 17  AdminChatSupervisionPage       /admin/chat-supervision
Step 18  NotificationPreferencesPage    /student/notifications
Step 19  SessionStartingBanner component
Step 20  InboxPage LMS tab update
Step 21  payment.css styles
Step 22  ProductDetailPage              /programs/:productId
Step 23  CheckoutPage                   /student/checkout/:productId
Step 24  PaymentSuccessPage             /student/payment-success
Step 25  BillingPage                    /student/billing
Step 26  AdminCouponsPage               /admin/coupons
Step 27  admin-classes.css styles
Step 28  AdminClassesPage               /admin/classes
Step 29  EnrollmentDrawer component     (within AdminClassesPage)
Step 30  TeacherAnalyticsPage           /teacher/analytics
Step 31  Recording Management tab       (update TeacherClassDetailPage)
Step 32  App.tsx route additions        (all new routes)
Step 33  AdminLayout update             (add Classes, Coupons, Chat Supervision nav items)
Step 34  StudentLayout update           (add Profile, Billing nav items)
Step 35  TeacherLayout update           (add Chat, Analytics nav items)
```

---

## Files Created — Complete List

```
frontend/src/components/lms/
  AskQuestionModal.tsx                        NEW
  DemoCountdownBanner.tsx                     NEW
  DemoGate.tsx                                NEW
  SessionStartingBanner.tsx                   NEW

frontend/src/pages/student/
  StudentProfilePage.tsx                      NEW
  AttendancePage.tsx                          NEW
  RecordedSessionsPage.tsx                    NEW
  StudentChatPage.tsx                         NEW
  LmsFomoPreviewPage.tsx                      NEW
  DemoExpiredPage.tsx                         NEW
  CheckoutPage.tsx                            NEW
  PaymentSuccessPage.tsx                      NEW
  BillingPage.tsx                             NEW
  NotificationPreferencesPage.tsx             NEW

frontend/src/pages/teacher/
  TeacherChatPage.tsx                         NEW
  TeacherAnalyticsPage.tsx                    NEW

frontend/src/pages/admin/
  AdminClassesPage.tsx                        NEW
  AdminCouponsPage.tsx                        NEW
  AdminChatSupervisionPage.tsx                NEW

frontend/src/pages/public/
  ProductDetailPage.tsx                       NEW

frontend/src/styles/
  chat.css                                    NEW
  demo.css                                    NEW
  payment.css                                 NEW
  admin/admin-classes.css                     NEW
  admin/admin-coupons.css                     NEW

frontend/src/pages/student/LiveSessionPage.tsx        MODIFIED (sidebar tabs)
frontend/src/pages/editor/EditorSupervisionPage.tsx   MODIFIED (shell → live)
frontend/src/pages/teacher/TeacherClassDetailPage.tsx MODIFIED (recordings tab)
frontend/src/pages/admin/AdminLayout.tsx              MODIFIED (3 new nav items)
frontend/src/layouts/StudentLayout.tsx                MODIFIED (Profile, Billing nav)
frontend/src/layouts/TeacherLayout.tsx                MODIFIED (Chat, Analytics nav)
frontend/src/types/lms.ts                             MODIFIED (new interfaces)
frontend/src/data/lms.ts                              MODIFIED (new mock data)
frontend/src/services/lmsApi.ts                       MODIFIED (new BACKEND SWAP stubs)
frontend/src/App.tsx                                  MODIFIED (new routes)
```

**Total: 20 new files, 9 modified files**

---

## What Is NOT in Second Half (Third Phase / Out of Scope)

- Stripe live integration (real card processing — backend wires this)
- WhatsApp notification sending (backend/Twilio integration)
- Email notification sending (backend/SendGrid or similar)
- Zoom recording auto-fetch (backend webhook from Zoom)
- Real-time chat (WebSocket / Supabase realtime — backend concern)
- Video playback player (embedded player for recordings)
- Student progress analytics beyond attendance (requires backend data)
- Admin bulk enrollment (CSV upload)
- Multi-teacher classes
