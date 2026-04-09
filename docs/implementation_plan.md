# Frontend Implementation Plan — AI Medical Exam Prep Platform (Full)

## Overview

Frontend-only React + Vite + TypeScript prototype demonstrating 100% of the product's
planned functionality using dummy/static data. No backend, no real auth, no DB, no Stripe,
no live AI. The goal is a fully navigable, fully interactive client demo.

**Single exam: USMLE Step 1** (one hardcoded 12-week roadmap).

**Colors:** White (#FFFFFF) · Light Blue (#E8F4FD, #BFD9F2, #5BA4CF, #1A6FAD) · Navy (#0D2D5E)  
**Fonts:** Plus Jakarta Sans (headings) · Inter (body) — Google Fonts  
**Stack:** React 18 + TS · React Router v6 · Recharts · Framer Motion · Lucide React

---

## Portal Architecture

```
/                         Landing — role selector
/student/login            Student Login
/student/register         Student Register
/student/onboarding       Onboarding Wizard (new students only)
/student/dashboard        Dashboard
/student/roadmap          Study Roadmap
/student/qbank            Question Bank
/student/test-session     Test Session (full screen)
/student/test-review      Test Review
/student/ai-tutor         AI Tutor
/student/content          Content Hub (PDFs + Videos)
/student/analytics        Analytics & Diagnostics
/student/leaderboard      Leaderboard
/student/partners         Study Partners
/student/notes            Notes

/admin/login              Admin Login (no register)
/admin/dashboard          Admin Overview
/admin/students           Student Insights
/admin/metrics            Global Metrics
/admin/financials         Financials & Subscriptions
/admin/comments           Comment Moderation
```

Zero cross-access between portals. Route guards enforce this via localStorage checks.

---

## Dependencies to Install

```
react-router-dom     routing
recharts             charts (line, bar, donut, area, funnel)
framer-motion        page transitions + micro-animations
lucide-react         icon set
```

---

## Design System — `src/styles/`

### `globals.css`
CSS custom properties for:
- Color tokens (--color-primary, --color-navy, --color-surface, etc.)
- Spacing scale (--space-1 through --space-16)
- Border radius tokens (--radius-sm, --radius-md, --radius-lg, --radius-full)
- Shadow tokens (--shadow-sm, --shadow-md, --shadow-card)
- Typography scale (--text-xs through --text-5xl)
- Transition tokens (--transition-fast, --transition-base)

### `animations.css`
Keyframe definitions:
- `@keyframes fadeIn` — opacity 0 → 1
- `@keyframes slideUp` — translateY(20px) → 0
- `@keyframes countUp` — number animation trigger
- `@keyframes pulseRing` — live dot pulse for leaderboard
- `@keyframes shimmer` — skeleton loading effect
- `@keyframes bounceDots` — AI typing indicator

---

## UI Component Library — `src/components/ui/`

| Component | Props / Variants | Purpose |
|---|---|---|
| `Button` | variant: primary/secondary/ghost/danger, size: sm/md/lg, loading: bool | All CTA buttons |
| `Card` | padding, hoverable, selected | White card container |
| `Badge` | color: blue/green/red/yellow/grey | Status and subject tags |
| `ProgressBar` | value (0–100), animated, color | Progress indicators |
| `DonutChart` | value, label, color, size | Score rings (UWorld-style) |
| `Modal` | isOpen, onClose, title, size | All overlay dialogs |
| `Tabs` | tabs[], activeTab, onChange | Page section switchers |
| `Avatar` | name, imageUrl, size | User avatars with initials fallback |
| `Spinner` | size, color | Loading states |
| `Input` | type, label, error, icon | Form fields |
| `Toggle` | checked, onChange, label | On/off switch (comment moderation) |
| `Tag` | label, onRemove, color | Subject chip tags |
| `Toast` | message, type, duration | Notification toasts |
| `Tooltip` | content, position | Hover help text |
| `SkeletonLoader` | width, height, count | Loading placeholder |
| `SelectCard` | selected, icon, label, desc | Onboarding choice cards |
| `StatCard` | icon, label, value, change | Dashboard KPI cards |
| `RangeSl ider` | min, max, value, onChange, label | Hours/questions sliders |

---

## Context & Hooks — `src/context/` + `src/hooks/`

### Contexts
- `StudentAuthContext` — stores `{ user, onboarded }` from localStorage, provides `login()`, `register()`, `logout()`
- `AdminAuthContext` — stores `{ admin }` from localStorage, provides `login()`, `logout()`
- `TestContext` — manages active test state (questions, answers, timer, mode) across SessionPage and ReviewPage

### Hooks
- `useLocalStorage(key, initialValue)` — read/write localStorage with React state sync
- `useTimer(seconds, onExpire)` — countdown timer for timed test mode
- `useRoadmapAdjuster(roadmap, onboarding)` — computes which days get extra sessions for student's weak subjects
- `useCountUp(target, duration)` — animates stat card numbers on mount

---

## Dummy Data — `src/data/`

### `questions.ts`
30 USMLE Step 1 MCQs. Each object:
```
{
  id, subject, subtopic, difficulty,
  stem (clinical vignette text),
  choices: [{ id: 'A'|'B'|'C'|'D'|'E', text }],
  correctChoice,
  explanation: { correct: string, incorrectReasons: { A:str, B:str, ... } },
  relatedVideoId, relatedVideoTimestamp,
  relatedDiagramLabel,
  tags: string[]
}
```
Subjects covered: Anatomy, Physiology, Biochemistry, Pathology,
Pharmacology, Microbiology, Immunology, Behavioral Science, Biostatistics

### `roadmap.ts`
Single 12-week USMLE Step 1 plan. Structure:
```
{
  exam: 'USMLE Step 1',
  totalWeeks: 12,
  weeks: [
    {
      weekNumber, theme,
      days: [
        {
          date (relative offset), subject, subtopics: string[],
          estimatedHours, type: 'study'|'review'|'practice'|'rest',
          status: 'completed'|'today'|'upcoming'|'missed'
        }
      ]
    }
  ]
}
```
Weak subjects picked in onboarding get extra `practice` days injected via `useRoadmapAdjuster`.

### `students.ts`
20 dummy students. Each:
```
{
  id, name, avatar, email, phone,
  examTarget: 'USMLE Step 1',
  subscriptionTier: 'Basic'|'Pro'|'Elite',
  subscriptionStatus: 'Active'|'Past Due'|'Cancelled',
  overallScore, questionsAnswered, studyStreakDays, hoursStudied,
  lastActive,
  subjectScores: { Anatomy: 72, Physiology: 58, ... },
  testHistory: [{ date, score, subject, mode, duration }],
  scoreHistory: [{ date, score }],  // 30 entries
  aiDiagnosis: string,
  weakSubjects: string[],
  studySchedule: 'Morning'|'Afternoon'|'Evening',
  studyHoursPerDay: number,
  connectionStatus: 'none'|'pending'|'connected',
  compatibilityScore: number
}
```

### `videos.ts`
10 dummy videos:
```
{
  id, title, subject, duration, watchedPercent,
  thumbnail (subject + color for CSS gradient placeholder),
  chapters: [{ timestamp, label }]
}
```

### `pdfs.ts`
8 dummy PDFs:
```
{
  id, title, subject, pageCount, lastReadPage, bookmarked
}
```

### `analytics.ts`
```
{
  scoreHistory: [{ date, score }],          // 30 days
  subjectMatrix: { subject: { subtopic: score } },  // heatmap data
  studyHours: [{ week, hours }],            // 12 weeks
  cohortAvgBySubject: { subject: avg }
}
```

### `leaderboard.ts`
20 entries:
```
{
  rank, studentId, name, avatar,
  overallScore, questionsAnswered,
  studyStreakDays, badge: 'Gold'|'Silver'|'Bronze'|null,
  rankChange: number  // positive = moved up, negative = moved down
}
```

### `comments.ts`
15 student discussion comments:
```
{
  id, studentName, subject, content, date,
  visible: boolean
}
```

### `financials.ts`
```
{
  mrr, arr, newSubscriptionsThisMonth, churnRate,
  revenueHistory: [{ month, revenue }],     // 6 months
  subscriptionBreakdown: { monthly, quarterly, annual },
  transactions: [{ studentName, plan, date, amount, status }]
}
```

---

## Page Specifications — Student Portal

---

### Landing Page `/`

**Layout:** Full-screen split or centered hero.

**Elements:**
- Platform logo + name + tagline: "Your AI-Powered Path to Board Exam Success"
- Two large role cards side by side:
  - 🎓 "I'm a Student" → `/student/login`
  - 🔐 "I'm an Admin" → `/admin/login`
- Cards have hover lift effect (Framer Motion whileHover)
- Animated gradient background (slow hue-shift animation)
- Small footer: copyright

---

### Student Login `/student/login`

**Layout:** Centered card on light blue background.

**Elements:**
- Logo + "Welcome Back"
- Email input + Password input
- "Sign In" button (shows Spinner on click for 1s, then redirects)
- "Forgot Password?" link (opens a modal with email input + "Send Reset Link" button — dummy, shows toast)
- Divider + "New here? Create an account" → `/student/register`
- Demo credentials hint: `student@demo.com / demo123`

**Logic:**
- Any non-empty email/password accepted
- Reads `onboarded` from localStorage to decide redirect target

---

### Student Register `/student/register`

**Layout:** Centered card.

**Elements:**
- Full Name · Email · Medical School (optional) · Password · Confirm Password
- "Create Account" CTA
- "Already have an account? Sign In"
- Inline validation feedback (passwords must match)
- On submit: 1s spinner → writes `studentUser` to localStorage with `onboarded: false` → redirect `/student/onboarding`

---

### Onboarding Wizard `/student/onboarding`

**Layout:** Full-screen, step progress bar at top (6 steps).

**Step 1 — Welcome**
- Large animated greeting: "Welcome, [Name]! 👋"
- Subtitle: "Let's build your personalized USMLE Step 1 study roadmap."
- Animated icon (stethoscope or brain)
- CTA: "Let's Go"

**Step 2 — Exam Confirmed**
- Heading: "You're preparing for:"
- Single large card, pre-selected, non-dismissible: **USMLE Step 1** with description
- Small note: "More exams coming soon"
- CTA: "Confirm & Continue"

**Step 3 — Target Date & Hours**
- "When is your exam?" — date input (min: today + 30 days)
- "How many hours can you study daily?" — range slider 1–12, live label ("4 hours/day")
- "When do you prefer to study?" — 4 chips: Morning · Afternoon · Evening · Flexible
- Days-remaining preview auto-calculates: "That's 84 days — a solid foundation!"

**Step 4 — Weak Subjects**
- Heading: "Which subjects do you want extra focus on?"
- Chip grid (multi-select, up to 5):
  Anatomy · Physiology · Biochemistry · Pathology · Pharmacology ·
  Microbiology · Immunology · Behavioral Science · Biostatistics · Clinical Reasoning
- Selected chips turn blue with checkmark
- Helper text: "These will get extra practice sessions in your roadmap"

**Step 5 — Study Style**
- Multi-select cards with icons:
  - 📖 "Read first, then practice"
  - ❓ "Jump straight into questions"
  - 🎥 "I learn best from videos"
  - 🔁 "I need lots of repetition"
  - ⏱️ "I struggle under timed pressure"

**Step 6 — Roadmap Generated**
- 3-second progress bar animation with sequential text:
  "Analyzing your preferences… → Building week-by-week plan… → Optimizing for your weak areas… → Done!"
- Summary card:
  - Exam: USMLE Step 1
  - Exam Date + Days Remaining
  - Daily Hours
  - Focus areas: [chips of weak subjects]
  - Plan length: 12 weeks
- CTA: "View My Roadmap" → sets `onboarded: true`, redirects to `/student/roadmap`

---

### Student Layout `layouts/StudentLayout.tsx`

**Sidebar (fixed left, 260px wide, collapsible to 64px icon rail):**
- Logo + platform name (hidden when collapsed)
- Nav items with icon + label:
  - Dashboard
  - My Roadmap
  - Question Bank
  - AI Tutor
  - Content Hub
  - Analytics
  - Leaderboard
  - Study Partners
  - Notes
- Bottom section:
  - User avatar + name + subscription badge (e.g., "Pro")
  - Exam countdown chip: "📅 47 days to USMLE Step 1"
  - Logout button

**Top Bar:**
- Hamburger (toggles sidebar collapse on mobile)
- Page title (dynamic, updates per route)
- Search icon → command-palette modal (searches pages/topics, dummy)
- Notification bell with red badge → dropdown showing 3 dummy notifications
- User avatar → dropdown: Profile (modal) / Logout

---

### Dashboard `/student/dashboard`

**Section 1 — Welcome + KPI Row:**
- "Good morning, [Name] 👋"
- 4 StatCards:
  - Overall Score: 74% (↑3% this week)
  - Questions Answered: 312
  - Study Streak: 8 days 🔥
  - Hours Studied This Week: 14.5hr

**Section 2 — Score Overview (UWorld-style):**
- Left: Large DonutChart (79% Correct, animated draw-in)
- Right: Stat breakdown table:
  | | Count |
  |---|---|
  | Total Correct | 63 |
  | Total Incorrect | 12 |
  | Total Omitted | 5 |
  | Answer Changes: Correct→Incorrect | 0 |
  | Answer Changes: Incorrect→Correct | 2 |
  | Answer Changes: Incorrect→Incorrect | 0 |
- Second DonutChart: 2% Used (questions used out of total bank)
- QBank usage table: Used Qs / Unused Qs / Total Qs
- Test Count: Tests Created / Completed / Suspended

**Section 3 — Today's Plan Card:**
- Day card from roadmap for today: subjects, hours, topics
- ProgressBar: "Today: 60% complete"
- Quick-action buttons: "Continue Studying" → QBank, "View Full Roadmap"

**Section 4 — AI Diagnostic Callout:**
- Warning card: "🧠 AI Insight: Your Renal Pathophysiology scores have dropped 12% this week. We've boosted your upcoming review sessions. [View in Analytics]"

**Section 5 — Recent Tests:**
- Mini table: last 3 tests (date, subjects, score, mode, action: Review)

---

### Roadmap `/student/roadmap`

**Header:**
- "Week 3 of 12 · 22% complete · 47 days remaining"
- ProgressBar spanning full width
- View toggle: Timeline | Calendar | List

**Timeline View (default):**
- Vertically scrollable
- Week header cards (Week 1: Foundations, Week 2: Pathology Deep Dive, etc.)
- Each day card:
  - Date + Day of week
  - Subject chips (color-coded by subject)
  - Estimated hours badge
  - Session type badge: Study / Review / Practice Test / Rest
  - Status: ✅ Done (green) · 🔵 Today (glowing blue border) · ⬜ Upcoming · ⚠️ Missed (red with reschedule note)
- Missed days show: "Missed — content rescheduled to [next available date]"

**Calendar View:**
- Month grid
- Each day cell: colored subject dots
- Click a day → right side-drawer with that day's full plan

**List View:**
- Sortable flat table: Date · Subject · Type · Hours · Status

**Right Panel — Roadmap Controls:**
- "✅ Mark today as complete" button
- "⏭ Skip today (can't study)" → triggers shimmer animation + bumps content forward
- "🏆 I've mastered this topic" → topic dropdown → removes upcoming sessions for that topic
- "🔄 Recalculate Roadmap" → 2s shimmer animation → reorders remaining days
- Subscription tier note: "Real-time AI recalibration available on Pro plan"

---

### Question Bank `/student/qbank`

**Left Panel — Test Builder:**
- Test name input (optional)
- Mode select cards: Tutor Mode | Timed Mode | Mock Exam
  - Tutor: answers revealed after each question with explanation
  - Timed: 1.5 min/question countdown, review at end
  - Mock Exam: 80 questions, full exam simulation
- Subject checklist (grouped):
  - Basic Sciences: Anatomy, Physiology, Biochemistry, Microbiology, Immunology, Behavioral Science, Biostatistics
  - Clinical Sciences: Pathology, Pharmacology, Clinical Reasoning
  - "Select All" / "Deselect All" shortcuts
- Filter chips: Unused · Incorrect · Marked · All
- Questions slider: 10–120, live count
- "Create Test" CTA → stores config in TestContext → navigate to `/student/test-session`

**Right Panel — QBank Statistics:**
- Two DonutCharts side by side:
  - % Correct (74%, green)
  - % Used (2%, blue)
- Stats table (matching UWorld inspo styling):
  - Your Score section: Total Correct / Incorrect / Omitted
  - Answer Changes section: C→I / I→C / I→I
  - QBank Usage: Used / Unused / Total
  - Test Count: Created / Completed / Suspended
- Recent Tests mini table: last 5 tests with score + subject + mode + Review link

---

### Test Session `/student/test-session`

**Layout:** Full screen — no sidebar, no top bar.

**Top Bar:**
- "Q 1 of 40"
- Timer (countdown for Timed, elapsed for Tutor)
- 🚩 Flag question (toggles flagged state for current Q)
- "End Test" button → confirmation modal → routes to `/student/test-review`

**Main Area — Question:**
- Clinical vignette (3–5 line paragraph, dummy USMLE-style text)
- Optional labeled diagram placeholder (styled div, shown for ~30% of questions based on dummy data flag)
- 5 answer choices (A–E), radio button style:
  - Unselected: white card with letter badge
  - Hover: light blue tint
  - Selected: blue border + filled letter badge

**Tutor Mode — Post-Answer Reveal:**
- Correct choice: green background + ✅ icon
- Chosen wrong choice: red background + ❌ icon
- Explanation panel slides up (Framer Motion):
  - "Why [A] is correct:" — text block
  - "Why [B–E] are incorrect:" — expandable text blocks
  - Deep-link chip: "🎥 Review: [Video Title] at [timestamp]" — clicking navigates to Content Hub video at that timestamp
  - Diagram card: "🖼️ Related Diagram: [label]" — small dummy image placeholder
  - "🤖 Ask AI Tutor more about this" → navigate to AI Tutor with pre-filled query

**Bottom Bar:**
- Previous · Next · (Tutor: "Next Question" after reveal) · (Timed: "Mark & Next")

**Right Drawer (toggleable):**
- Q navigator grid: numbered squares
- Colors: grey (unanswered), green (correct), red (wrong), yellow (flagged), blue (current)
- Click square → jump to that question

---

### Test Review `/student/test-review`

**Header Card:**
- Score: 72% (29/40 correct)
- Time taken: 38 min
- Mode: Tutor
- vs. Cohort avg: +4% (shown as a small comparison bar)
- Action buttons: "Retake Test" · "Return to QBank" · "Export Summary" (toast: "Preparing PDF…")

**Weak Area Callout:**
- "⚠️ Renal Physiology: 3/5 incorrect. Recommended: Review Video — Glomerulonephritis at 14:22"

**Answer Review List:**
- Expandable rows for each question:
  - Question number + stem snippet
  - Your answer (colored red/green) → Correct answer
  - Expand → full stem + explanation + video deep-link

**Summary by Subject:**
- Mini horizontal bar chart: score per subject in this test

---

### AI Tutor `/student/ai-tutor`

**Layout:** Split — chat left (60%), context right (40%).

**Left — Chat Panel:**
- Conversation thread (pre-filled with 3 dummy exchanges about a pharmacology topic)
- Each user message: right-aligned, light blue rounded bubble
- Each AI message: left-aligned, white card with thin blue left border
- AI message includes:
  - Answer text
  - "📄 Source: Pharmacology Ch.4, Page 112" chip
  - "🎥 See: Beta-Blockers Overview — 8:22" chip (clickable, navigates to video)
- Input bar:
  - Text input "Ask about any USMLE Step 1 topic…"
  - Send button
  - Mic icon (decorative/disabled with tooltip "Voice input — coming soon")
- On send: user message appears → 1.5s typing animation (3 bouncing dots) → dummy AI response appears
- Dummy responses are pulled from a rotating array of preset answers in data

**Right — Context Panel (3 tabs):**

Tab: `📄 Sources`
- 2–3 source cards:
  - PDF card: subject icon, "Pharmacology — Chapter 4, Page 112", text snippet (2 lines)
  - Video card: "Beta-Blockers Overview", timestamp "08:22", "Jump to Video →" link

Tab: `🖼️ Images`
- Dummy retrieved diagram card:
  - Colored gradient placeholder (subject color)
  - Label: "Figure 4.2 — Beta-1 Receptor Signalling Pathway"
  - "Verified from course materials" badge
  - Note: "AI retrieves verified diagrams — never generates new ones"

Tab: `❓ Related Questions`
- 3 practice question cards (from questions.ts, same subject):
  - Short stem snippet
  - Subject badge + difficulty badge
  - "Practice This Question" → launches single-question test session

---

### Content Hub `/student/content`

**Tabs:** 📄 PDFs | 🎥 Videos

**PDF Tab:**
- Subject filter chips (all, Anatomy, Physiology, etc.)
- Card grid (3 per row):
  - Subject-colored icon placeholder (top half of card)
  - Title, page count, bookmark toggle icon
  - ProgressBar: "Last read: page 42/312"
  - "Open" button
- Clicking "Open" → PDF Viewer panel slides in from right:
  - Large grey area simulating PDF content (styled with dummy Lorem Ipsum paragraphs, chapter headers)
  - Top bar: document title, page X of Y (interactive: change page number), zoom in/out (decorative), download icon (toast: "Download requires Pro plan")
  - Bookmark button

**Video Tab:**
- Subject filter chips
- Card grid:
  - Gradient colored thumbnail placeholder with ▶ play icon
  - Title, subject badge, duration, watched % badge
  - ProgressBar: watch progress
- Clicking "Open" → Video Player panel slides in:
  - Large styled rectangle simulating player (dark bg with centered ▶ button)
  - Play/Pause toggle, progress scrubber (draggable range input), time display (00:00 / 12:34)
  - Chapters list below player: timestamp + label, clicking updates scrubber position
  - "🤖 Ask AI about this topic" button → navigate to AI Tutor with video context pre-filled

---

### Analytics `/student/analytics`

**Tabs:** Overview | Strengths & Weaknesses | Test History

**Overview Tab:**
- 4 KPI StatCards: Avg Score / Qs Answered / Study Streak / Total Hours
- Score Trend: Recharts LineChart (30-day score history, smooth curve)
- Performance by Subject: Recharts BarChart (horizontal, subject vs. avg score)
- Study Hours: Recharts BarChart by week (12 weeks)

**Strengths & Weaknesses Tab:**
- AI Diagnostic Callout card at top:
  - "🧠 AI Analysis: Your errors in Renal Pathology appear to stem from a clinical reasoning gap, not a foundational knowledge deficit. Recommended action: Practice application-style questions."
- Heatmap grid:
  - Rows: 9 subjects
  - Columns: 3–4 subtopics per subject
  - Each cell: score % as number + background color (red <50, yellow 50–74, green ≥75)
  - Clicking a cell → Modal:
    - "Renal Pathology — Glomerulonephritis: 4/12 correct (33%)"
    - "AI Diagnosed Root Cause: Clinical reasoning gap"
    - Recommended actions:
      - "Practice 15 more questions →" (CTA)
      - "🎥 Watch: Glomerulonephritis Overview — 14:22 →" (deep-link)
    - Close button

**Test History Tab:**
- Sortable table: Date · Subject Focus · Mode · Score · Duration · Action
- Action: "Review" → `/student/test-review` (loads that test's dummy data)
- Filter: by subject, by mode, by date range

---

### Leaderboard `/student/leaderboard`

**Tabs:** Global | This Week | My Cohort

**Top 3 Podium:**
- Three cards arranged: 2nd (left, silver) · 1st (center, tallest, gold crown) · 3rd (right, bronze)
- Each: avatar ring (medal color), name, score %, badge icon
- Animated entry (Framer Motion bounce)

**Ranked List (4th onward):**
- Table rows: Rank · Rank Change badge (▲3 green / ▼1 red) · Avatar · Name · Score % · Qs Answered · Streak · Badge
- Live indicator: pulsing green dot + "Updated 2 min ago" (fake auto-refresh every 30s that shuffles ±1 minor changes)

**Current User Row:**
- Sticky at bottom of the list
- Light blue background highlight
- "📍 You are #14"

---

### Study Partners `/student/partners`

**Two sections:**

**My Matches:**
- Heading: "Students matched to your study profile"
- 3–4 match cards:
  - Avatar + Name + Compatibility score badge: "92% Match"
  - Shared strengths chips: "✅ Pharmacology, Anatomy"
  - Shared weak areas chips: "⚠️ Renal Pathology"
  - Schedule overlap: "Both study evenings"
  - Progress similarity: "Both in Week 3 of 12"
  - CTA: "Connect"
    - Click → Modal: "Send connection request to [Name]? They'll see your profile." → Confirm → card status changes to "Request Sent" badge
    - If mutually connected (dummy pre-set for 1 card):
      - Status badge: "Connected ✅"
      - "📞 Reveal Contact" button → blurred phone number + "Tap to reveal" → click removes blur, shows dummy number
      - Note: "Both students must consent before contact info is shown"

**Explore Students:**
- Filter bar: Study Time (Morning/Afternoon/Evening) · Subject Strengths · Compatibility %
- Student list cards: avatar, name, exam, compatibility %, subject chips, "View Profile"
- "View Profile" → Modal:
  - Avatar + name + exam + Study schedule + Top subjects + Weak subjects
  - Small score trend mini-chart
  - "Connect" button (same flow as above)

---

### Notes `/student/notes`

**Layout:** Two panels.

**Left — Notes List:**
- "+ New Note" button at top
- Search input
- List of note cards: title, date, subject tag, first line preview
- Click → loads in right panel

**Right — Note Editor:**
- Fake rich-text toolbar (Bold · Italic · Underline · Bullet list · H1/H2 buttons — visual only, no actual formatting implementation needed for demo, or basic contentEditable)
- Title input (large, top)
- Subject tag selector (dropdown chips)
- "Link to Question" selector (optional, dropdown of question IDs — dummy)
- Large text area for note content
- "Save Note" button (updates list, shows toast)
- "Delete Note" (red, shows confirmation modal)

---

## Page Specifications — Admin Portal

---

### Admin Login `/admin/login`

**Layout:** Centered card, navy-themed.

**Elements:**
- Admin shield icon + "Admin Portal"
- Email + Password inputs
- "Sign In" CTA (no register link)
- Dummy: `admin@nextgen.com / admin123`
- Subtle footer: "Unauthorized access is prohibited"

---

### Admin Layout `layouts/AdminLayout.tsx`

**Sidebar:** Navy/dark blue (#0D2D5E)
- Platform logo + "Admin Panel" label
- Nav: Overview · Student Insights · Global Metrics · Financials · Comment Moderation
- Bottom: admin avatar + Logout

**Top Bar:** lighter navy, page title, admin name, logout icon

---

### Admin Dashboard `/admin/dashboard`

**KPI Row (4 StatCards):**
- Total Students: 248
- Active This Week: 189 (76%)
- Platform Avg. Score: 71%
- At-Risk Students: 12 (score <50% for 7+ days, shown in red)

**Charts Row:**
- Daily Active Users: Recharts AreaChart (7-day)
- Score Distribution: Recharts BarChart histogram (score buckets: 0–20, 20–40, 40–60, 60–80, 80–100)

**Recent Activity Feed:**
- Scrollable list of 10 dummy events:
  - "[Name] completed a 40Q Timed Test — Score: 78% · 5m ago"
  - "[Name] joined the platform · 12m ago"
  - "[Name] hasn't logged in for 7 days ⚠️ · 2hr ago"

---

### Student Insights `/admin/students`

**Filters + Search bar:**
- Search by name
- Filter by: Subscription Tier · Score Range · Last Active · Status

**Student Table:**
Columns: Avatar+Name · Exam · Tier badge · Overall Score · Last Active · Status badge (Active/At-Risk/Inactive)

**Row click → Right Drawer:**
- Student name + avatar + exam + subscription
- Score trend: mini Recharts LineChart (14-day)
- Subject performance: mini horizontal BarChart
- Heatmap summary (compact)
- AI Diagnosis callout: "Root cause: Foundational gap in Biochemistry"
- Admin Notes: textarea (dummy save, shows toast)
- "📩 Send Nudge" button → toast: "Notification sent to [Name]"

---

### Global Metrics `/admin/metrics`

**Section 1 — Cohort Averages:**
- Horizontal BarChart: avg score per subject across all students
- Highlights lowest subject (red bar) + highest (green bar)

**Section 2 — Most Missed Questions:**
- Table: # · Question stem snippet · Subject · Miss Rate %
- Top 10 rows

**Section 3 — Engagement Funnel:**
- Recharts FunnelChart or stacked horizontal bars:
  - Registered: 248
  - Completed Onboarding: 231
  - Took First Test: 198
  - Active (7-day): 189
  - Retained (30-day): 156

**Section 4 — DAU / WAU Trend:**
- Recharts AreaChart (30-day, two lines: DAU + WAU)

---

### Financials `/admin/financials`

**KPI Row:**
- MRR: $12,400
- ARR: $148,800
- New Subscriptions This Month: 34
- Churn Rate: 2.1%
- All with trend arrows vs. last month

**Charts Row:**
- Revenue Over Time: Recharts LineChart (6 months)
- Subscription Breakdown: Recharts PieChart (Monthly 45% / Quarterly 30% / Annual 25%)

**Transactions Table:**
Columns: Student Name · Plan · Date · Amount · Status badge (Active/Past Due/Cancelled)
- Sortable by date and amount
- 15 dummy transactions

**Payment Plan Health:**
- 3 summary cards:
  - Active: 218 (88%)
  - Past Due: 19 (8%)
  - Cancelled: 11 (4%)

---

### Comment Moderation `/admin/comments`

**Filter Bar:**
- Filter by: Status (All / Visible / Hidden) · Subject · Date range

**Bulk Actions:**
- Checkbox select all → "Show Selected" / "Hide Selected" buttons

**Comments Table:**
Columns: ☐ · Student Name · Subject · Comment Preview (40 chars) · Date · Status · Toggle

**Toggle:** Each row has a Toggle switch (Visible = green ON / Hidden = grey OFF)
- Clicking toggle instantly flips `visible` flag in dummy state + shows toast: "Comment [shown/hidden]"

**Comment expand:** Clicking a row expands it to show full comment text

---

## Subscription Tier Access (Frontend-Only Simulation)

Dummy student user has a `tier` field: Basic | Pro | Elite.
Certain UI elements display upgrade prompts for lower tiers:

| Feature | Basic | Pro | Elite |
|---|---|---|---|
| Questions per test | Max 40 | Max 120 | Unlimited |
| AI Tutor (sessions/day) | 5/day prompt | Unlimited | Unlimited |
| Content Hub | PDFs only | PDFs + Videos | All + Downloads |
| PDF Download | Lock icon + "Upgrade" toast | ✅ | ✅ |
| Video playback | Lock overlay | ✅ | ✅ |
| Real-time roadmap recalc | "Pro feature" badge | ✅ | ✅ |
| Study Partners | View only | Connect | Connect + Priority Match |

These are visual-only gates — clicking locked features shows an "Upgrade to Pro" modal with a dummy pricing table (no Stripe).

---

## Upgrade Modal (Global)

Triggered by clicking any locked feature.
- Title: "Unlock [Feature Name]"
- Three plan cards: Basic · Pro · Elite (monthly price, feature list checkmarks)
- Pro card highlighted as "Most Popular"
- "Upgrade Now" CTA → toast: "Redirecting to payment… (coming soon)"
- Close / "Maybe Later"

---

## Notification System (Dummy)

Bell icon in top bar shows badge count (3).
Dropdown shows:
- "Your test results are ready — Scored 72%"
- "New study partner match: Sarah K. (92% compatible)"
- "Roadmap reminder: 2 sessions behind schedule ⚠️"

Clicking each navigates to relevant page.

---

## Command Palette (Search Modal)

Triggered by search icon in top bar. Keyboard shortcut hint shown (⌘K).
- Text input
- Results update as you type (filtered against dummy list of pages + topics)
- Results: page links → navigate on click
- Sections: Pages · Topics · Questions

---

## Page Transitions & Animations

| Trigger | Animation |
|---|---|
| Route change | Fade in/out (Framer Motion AnimatePresence) |
| Onboarding step | Slide left + fade |
| Stat card mount | Count-up number (useCountUp hook) |
| DonutChart mount | Arc draw-in (CSS stroke-dasharray) |
| Roadmap cards | Staggered slide-up (0.04s delay per card) |
| Test answer reveal | Color flash + explanation slide-up |
| Leaderboard entry | Stagger + bounce |
| Rank change | Flash highlight + number slide |
| AI typing | 3-dot bounce loop |
| Modal open/close | Scale + fade |
| Shimmer (recalculate/loading) | Left-to-right shimmer sweep |
| Sidebar collapse | Width transition (260px → 64px) |
| Drawer open | Slide in from right |

---

## Build Order

1. Install dependencies
2. Design tokens (globals.css, animations.css, fonts)
3. UI component library (all components in components/ui/)
4. Dummy data files (src/data/)
5. Contexts + Hooks
6. Route guards
7. App.tsx router setup
8. Landing page
9. Student auth pages (Login, Register)
10. Onboarding wizard
11. Student layout (sidebar + topbar)
12. Student pages (Dashboard → Roadmap → QBank → Test Session → Test Review → AI Tutor → Content Hub → Analytics → Leaderboard → Study Partners → Notes)
13. Admin login
14. Admin layout
15. Admin pages (Dashboard → Student Insights → Global Metrics → Financials → Comments)
16. Global: Upgrade modal, Notification dropdown, Command palette
17. Animations pass (Framer Motion across all pages)
18. Responsive pass (mobile/tablet)
19. Final QA walkthrough
