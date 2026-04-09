# Master Frontend Execution Plan

> **NOTE TO DEVELOPERS (HUMAN & AI):** This document outlines the exact, step-by-step sequence required to finish the entire NextGen USMLE frontend. It acts as a sequential ticket system. Before starting any phase, ensure you have read `docs/implementation_plan.md` for specific design tokens (colors, animations) and dummy data schemas.

**Pre-requisites:** Student Authentication, Onboarding, Roadmap Preview, and Student Dashboard are already COMPLETE.

---

### Phase 1: The "Create Test" Page
- **Goal:** Build `/student/create-test`. A screen where users configure tests inherently tied to their roadmap.
- **Files to Create:**
  - `src/pages/student/CreateTestPage.tsx`
  - `src/components/student/create-test/AutoTestBuilder.tsx`
  - `src/components/student/create-test/TimelineAdjuster.tsx`
  - `src/data/createTest.ts` (Dummy configuration mapping)
- **Developer Instructions:** Ensure the UI defaults to the user's roadmap timeline. The "Timeline Adjuster" lets them modify duration.
- **Success Criteria:** Sliders and toggles update state locally; clicking "Start" routes to Phase 2.

### Phase 2: Active Test Session
- **Goal:** Build `/student/test-session`. The execution engine for MCQs.
- **Files to Create:**
  - `src/pages/student/TestSessionPage.tsx`
  - `src/components/student/test-session/QuestionHeader.tsx` (Timer & navigator)
  - `src/components/student/test-session/QuestionBody.tsx` (Vignette & choices)
  - `src/components/student/test-session/TutorExplanationDrawer.tsx` (AI breakdown)
  - `src/data/questions.ts` (30-40 dummy MCQs)
- **Developer Instructions:** Must handle strict "Tutor" Mode (instant reveal) vs "Timed" (review at end). No sidebar or layout wrapper should show here (Full-screen focus).
- **Success Criteria:** User can select a choice and the `TutorExplanationDrawer` animates up revealing the correct answer.

### Phase 3: Post-Test Review
- **Goal:** Build `/student/test-review`. Immediate post-test analytics.
- **Files to Create:**
  - `src/pages/student/TestReviewPage.tsx`
  - `src/components/student/test-review/ScoreHeader.tsx`
  - `src/components/student/test-review/AiWeaknessWarning.tsx`
  - `src/components/student/test-review/AnswerReviewList.tsx`
- **Developer Instructions:** Displays fake score percentage and highlights the worst performed subtopic. Allows user to drill down into explanations again.
- **Success Criteria:** Clicking an incorrect answer in the list expands to show the full vignette and explanation.

### Phase 4: Content Hub
- **Goal:** Build `/student/content`. The passive media library.
- **Files to Create:**
  - `src/pages/student/ContentHubPage.tsx`
  - `src/components/student/content/PdfLibraryGrid.tsx`
  - `src/components/student/content/VideoLibraryGrid.tsx`
  - `src/data/contentVault.ts` (Dummy PDF/Video metadata)
- **Developer Instructions:** Visual tabs for PDFs vs Videos. Clicking a card should not download, but open a slick fake in-app viewer.
- **Success Criteria:** Responsive grid renders cards with "Watch/Read Progress" bars.

### Phase 5: AI Tutor Chat
- **Goal:** Build `/student/ai-tutor`. The RAG-powered tutor interface.
- **Files to Create:**
  - `src/pages/student/AiTutorPage.tsx`
  - `src/components/student/tutor/ChatStream.tsx`
  - `src/components/student/tutor/RAGContextPanel.tsx` (Shows pulled images)
- **Developer Instructions:** 60/40 Split screen. Typing in chat simulates a 2-second delay, then renders a preset AI response citing a dummy document on the right panel.
- **Success Criteria:** User message appends to chat; typing indicator fires; AI replies with a chip reading `🎥 See Video at 14:22`.

### Phase 6: Analytics & Diagnostics
- **Goal:** Build `/student/analytics`. High-level performance tracking.
- **Files to Create:**
  - `src/pages/student/AnalyticsPage.tsx`
  - `src/components/student/analytics/PerformanceHeatmap.tsx` (Grid of red/yellow/green)
  - `src/components/student/analytics/TrendCharts.tsx` (Recharts implementation)
  - `src/data/analytics.ts`
- **Developer Instructions:** Leverage `recharts` heavily here. The Heatmap must map subjects to subtopics.
- **Success Criteria:** Charts render beautifully without errors; hovering graph plots shows tooltips.

### Phase 7: Leaderboard
- **Goal:** Build `/student/leaderboard`. Global rankings.
- **Files to Create:**
  - `src/pages/student/LeaderboardPage.tsx`
  - `src/components/student/leaderboard/PodiumStage.tsx` (Top 3)
  - `src/components/student/leaderboard/RankingsTable.tsx`
- **Developer Instructions:** Gamified styling. Pin the current logged-in user to the bottom of the table list if they aren't top 10.
- **Success Criteria:** Podium renders distinctly from the table list.

### Phase 8: Study Partners Matchmaking
- **Goal:** Build `/student/partners`. Networking UI.
- **Files to Create:**
  - `src/pages/student/StudyPartnersPage.tsx`
  - `src/components/student/partners/MatchCard.tsx`
  - `src/data/students.ts` (Dummy peers)
- **Developer Instructions:** Tinder-style or professional directory. Card highlights "Shared Weakness" or "Shared Schedule".
- **Success Criteria:** Clicking "Connect" toggles a "Request Sent" badge state.

### Phase 9: Notes System
- **Goal:** Build `/student/notes`. Text scratchpad.
- **Files to Create:**
  - `src/pages/student/NotesPage.tsx`
  - `src/components/student/notes/NoteSidebarLink.tsx`
  - `src/components/student/notes/RichTextSimulator.tsx`
- **Developer Instructions:** Simple left-pane list, right-pane editor. 

### Phase 10: Admin Framework
- **Goal:** Initial creation of the secondary portal.
- **Files to Create:**
  - `src/pages/admin/AdminLoginPage.tsx`
  - `src/layouts/AdminLayout.tsx`
- **Developer Instructions:** Ensure `AdminLayout` has a very distinct dark/navy sidebar with totally separate routing from the Student portal.
- **Success Criteria:** Navigating to `/admin/login` looks distinctly different than `/student/login`.

### Phase 11: Admin Metrics
- **Goal:** Build `/admin/dashboard` & `/admin/metrics`.
- **Files to Create:**
  - `src/pages/admin/AdminDashboardPage.tsx`
  - `src/pages/admin/GlobalMetricsPage.tsx`
  - `src/components/admin/DauChart.tsx`
- **Developer Instructions:** High-level platform snapshots (revenue, global DAU, most missed platform-wide questions).

### Phase 12: Admin Drill-down
- **Goal:** Build `/admin/students`.
- **Files to Create:**
  - `src/pages/admin/StudentManagementPage.tsx`
  - `src/components/admin/StudentSearchTable.tsx`
- **Developer Instructions:** A searchable, sortable data table allowing admin to "click" into a student and view their heatmaps and logs.
- **Success Criteria:** Responsive table; clicking a row simulated a slide-out drawer showing student metadata.
