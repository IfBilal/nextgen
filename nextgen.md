# NextGen Platform: The Master Execution Blueprint

This document serves as the absolute, definitive guide for the NextGen development team. It combines the rigorous intelligence of our AI-driven Adaptive Medical Study Platform with the complex operational demands of a Live Online Sessions Learning Management System (LMS). 

---

# PART 1: WHAT HAS BEEN DONE

The platform currently exists as a highly polished, fully functional Frontend UI Prototype backed by foundational authentication infrastructure. 

## 1.1 Frontend Architecture & UI/UX Foundation
The frontend is built on **React 18, Vite, and TypeScript**, utilizing strict routing isolation.
- **Routing Isolation:** React Router v6 effectively partitions the `/student` ecosystem from the `/admin` console, preventing cross-pollution. Route guards actively block unauthenticated users and redirect them to role-specific login portals.
- **Aesthetic & Design System:** A complete CSS token system handles sizing, thematic colors (Navy, Light Blue, White), typography (Plus Jakarta Sans, Inter), and micro-animations through Framer Motion (bounce effects, staggered mounting, page fade transitions).
- **Global Error Handling:** robust error utilities (`errorUtils.ts`, `observability.ts`) intercept uncaught exceptions and render graceful UI fallbacks to ensure application stability.

## 1.2 The Student Portal (Prototype)
A massive suite of student-oriented React components operates fluidly using sophisticated local mock data states:
- **Auth & Onboarding:** Views for gathering student constraints (exam date, prep hours, weak topics, study style) to generate a simulated adaptive calendar.
- **Main Dashboard Shell:** Renders KPI stat blocks, current roadmap agendas, simulated AI advisory alerts, and UWorld-style correctness donut charts.
- **Timeline & Roadmap Predictor:** A vertical chronological pipeline displaying past, present, and future study slots with UI toggles to skip/reschedule sessions. 
- **QBank & Assessment Rig:** A test constructor filtering mock questions by subject and incorrect tags. It outputs to a distraction-free, full-screen Timed Test Session view, which transitions into an exhaustive post-test Review Panel explaining logic and deep-linking to multimedia.
- **AI Tutor Interface:** Split-pane interface simulating RAG workflows. Chat history on the left, context panel rendering inline document citations (PDF, videos) on the right.
- **Gamification:** Global leaderboard podium UI. Tinder-style Study Partner matching interface displaying percentage compatibility.
- **Content Libraries:** Grids mapping localized URLs for video playback and PDF reading progress.
- **Analytics:** Data-dense matrices rendering subject-topic heatmaps natively using Recharts.

## 1.3 The Admin Portal (Prototype)
The overarching command center UI for operations:
- **Global Metrics Dashboard:** Charts depicting DAU trendlines, engagement score distributions, and real-time activity feeds.
- **Student CRM Directory:** Deep-dive student profiles showing individualized MRR, test scores, roadmap adherence, and granular notes.
- **Financial Center:** Dummy data rendering total MRR, total ARR, and a breakdown of subscription blocks alongside raw transaction/invoice tables.
- **Moderation Queue:** Table interfaces processing student comments with swift "hide/show" toggles.

## 1.4 The Backend Foundation
A foundational base exists via **Node.js, Express, and Supabase**.
- **Auth Mechanics:** Express routes fully bound to the Supabase Auth system (`POST /api/v1/auth/student/register`, `POST /api/v1/auth/student/login`).
- **Authorization Context:** Secure server-side validation against Supabase JWKS logic to ensure JWT validity, automatically rejecting requests failing `role` checks.
- **Initial Schema (`001_profiles_and_authz.sql`):** `profiles` are linked to JWTs with rigid Row Level Security policies. Admins cannot be registered freely; they must be generated securely from the backend. Base infrastructure for plan catalogs (`002_billing_foundation.sql`) lies dormant but ready.

---
---

# PART 2: WHAT HAS TO BE DONE (THE MASTER EXECUTION FLOW)

The following acts as the chronological development timeline. Developers must progress sequentially through these specialized, feature-focused modules.

### MODULE 1: Database Architecture, Security & Base Product Mapping
- **Phase 1.1:** Build `roles` and `permissions` tables mapped directly to user profiles (Admin, Editor, Teacher, Student, Affiliate). 
- **Phase 1.2:** Design the `products` table for "Online Sessions" structures. Define pricing objects and enrollment blocks.
- **Phase 1.3:** Configure secure multi-tenant Row Level Security (RLS) deep inside Supabase.
- **Phase 1.4:** Construct `GET` routes executing database parsing for the dynamic Public Homepage.

### MODULE 2: Custom Authentication & Approval Flows
- **Phase 2.1:** Implement the `POST /auth/teacher` pipeline, intercepting and assigning a `status='pending'` tag.
- **Phase 2.2:** Build the `PATCH /admin/users/:id/approve` endpoint for Administrators to legitimize pending Teachers.
- **Phase 2.3:** Expose `POST /admin/users/editor` to safely instantiate non-public Editor accounts.

### MODULE 3: Taxonomy & Categorization Systems
- **Phase 3.1:** Create `exams` schema mapping top-level targets.
- **Phase 3.2:** Map `exam_subjects` parent dependencies.
- **Phase 3.3:** Map `subject_topics` sub-dependencies with strict uniqueness constraints.

### MODULE 4: Class & Instructor Provisioning (The LMS Base)
- **Phase 4.1:** Map `classes` logically downstream from `products`.
- **Phase 4.2:** Mount specific verified `teacher_ids` directly onto localized `class_ids`.
- **Phase 4.3:** Build `GET /student/classes` queries referencing exact enrollment objects natively.

### MODULE 5: Live Session Lifecycle & Attendance Engine
- **Phase 5.1:** Design `live_sessions` mapping chronologies to parent class objects.
- **Phase 5.2:** Build `POST /teacher/session/:id/start`. Flip database variables natively from `waiting` to `live`.
- **Phase 5.3:** Create automated attendance logging rows firing strict algorithms exclusively when instances register `live`.
- **Phase 5.4:** Write database auditing arrays to capture explicit `reasons` when backend timing endpoints are altered manually.

### MODULE 6: Notification Broadcasting & Links
- **Phase 6.1:** Connect backend generation hooks parsing distinct Zoom/Google-Meet URLs.
- **Phase 6.2:** Engineer the trigger dispatching meeting links utilizing a broadcast-worker executing upon Check-In.
- **Phase 6.3:** Wire Service Worker endpoints parsing VAPID keys for Web Push alerts natively.
- **Phase 6.4:** Map SendGrid and WhatsApp Business API gateways.

### MODULE 7: Internal Analytics & Platform Surveillance
- **Phase 7.1:** Construct hidden DB logs analyzing raw timestamps converting intervals into exact minute class durations.
- **Phase 7.2:** Parse rows rendering distinct Admin Dashboard matrix logic evaluating Teacher performance blindly.
- **Phase 7.3:** Write API middleware enforcing rigid blockages preventing Student roles from reading internal telemetry.

### MODULE 8: Supervised Communications & Noticeboards
- **Phase 8.1:** Configure secure WebSockets aligning Student identities directly to authorized Instructors.
- **Phase 8.2:** Insert all array strings flowing across connections persistently into `chat_logs`.
- **Phase 8.3:** Wire invisible socket hooks permitting Admins to tail streams silently.
- **Phase 8.4:** Build CRUD layers accommodating Teacher `course_notices` distributed properly to active enrollments.

### MODULE 9: The Core Question Bank Architecture
- **Phase 9.1:** Build the `question_bank` columns isolating `stem`, `difficulty`, `hashes`, and comprehensive `explanations`.
- **Phase 9.2:** Bind foreign keys mapping `QBank` variables directly to `subject_topics` UUIDs.

### MODULE 10: Examination Assembly & Real-Time Grading
- **Phase 10.1:** Draft `POST /tests/generate` algorithms returning array segments of un-answered question IDs matching precise topic constraints.
- **Phase 10.2:** Draft `test_attempts` and `attempt_question_results` isolating binary correctness efficiently.
- **Phase 10.3:** Design `POST /tests/submit_grading` transaction executing multi-row insertions securely.

### MODULE 11: The Sub-Topic Performance Heatmapper
- **Phase 11.1:** Develop background worker sweeps scraping internal rows stored via `attempt_question_results`.
- **Phase 11.2:** Calculate raw median correct/incorrect percentage integers mapped strictly via relational `topic_ids`.
- **Phase 11.3:** Build `GET /student/:id/heatmap` mapping logic piping directly to UI matrix heatmaps.

### MODULE 12: Baseline Monetization Models (Stripe)
- **Phase 12.1:** Hook webhook listener functions safely processing `checkout.session.completed`.
- **Phase 12.2:** Formulate 'Upfront' transaction logic generating synchronous `PaymentIntents` calculating base discounts.
- **Phase 12.3:** Establish continuous 'Installments' establishing Stripe `Subscriptions` natively handling `cancel` endpoints.

### MODULE 13: The Conversion Machine (Demos & Limitations)
- **Phase 13.1:** Execute assignments appending a strict 7-day trial expiry (`demo_expires_at = NOW() + 7 DAYS`) universally atop demo registration objects.
- **Phase 13.2:** Intercept the Roadmap engine so the **Free Demo generates exactly 2 weeks maximum** of the study timeline, blocking deep future views.
- **Phase 13.3:** Inject hard quotas in the `/content` controllers ensuring Demo users can view a total maximum of **only 2-3 videos and PDFs**. Exceeding this quota triggers the paywall modal forcing an upgrade.
- **Phase 13.4:** Create granular UI toggles hitting `PATCH /admin/users/:id/demo_override` directly granting manual extensions.
- **Phase 13.5:** Wire DOM timers utilizing these dates rendering localized urgency countdowns.

### MODULE 14: Psychological "What You'll Miss" Roadmapping
- **Phase 14.1:** Render the full 12-week AI calendar arrays rendering elements seamlessly over React architectures natively displaying future horizons.
- **Phase 14.2:** Code layout modifiers greying out elements beyond the initial timeline, mounting explicit padlock UI pushing the user to convert.

### MODULE 15: Affiliate Portal & Authentication Architecture
- **Goal:** Isolated entry and visibility lockouts for growth partners.
- **Phase 15.1:** Generate the `/affiliate/login` frontend UI and attach to Supabase Auth.
- **Phase 15.2:** Enforce backend middleware. Accounts with the `affiliate` role must be absolutely blocked from accessing the Student LMS parameters, and Students must be blocked from Affiliate arrays. 

### MODULE 16: Admin CRM - Affiliate Generation & Configuration
- **Goal:** The mechanism by which the Admin officially instantiates new partners.
- **Phase 16.1:** Build Admin Form `/admin/affiliates/create` where the Admin dictates the Affiliate's Email, Password, Custom Referral Code (e.g., `DOCJONES10`), and Commission Percentage (e.g., 10%).
- **Phase 16.2:** API securely generates the Supabase credentials, hashes passwords, and saves the unique configuration into the `affiliates` schema table linked to that User UUID.

### MODULE 17: Stripe Webhook & Conversion Ledger Synchronization
- **Goal:** Natively redirecting raw revenue fractions directly into the internal affiliate balance tables perfectly during transactions.
- **Phase 17.1:** Modify the Student Checkout/Signup flows to accept a `referral_code` string. Upon validation against the database, this string binds permanently to the student's primary user profile.
- **Phase 17.2:** Upgrade Stripe webhooks. During `invoice.payment_succeeded`, the system actively queries the student's profile for an attached referral code. If present, it executes float math (`Revenue Amount` * `Affiliate %`), updating the Affiliate's `total_revenue`, `lifetime_share_earned`, and adding the new chunk explicitly into an active `to_be_paid` float column.
- **Phase 17.3:** If `to_be_paid` shifts above 0 during a webhook firing, the Affiliate's master status is automatically toggled from `Paid` -> `Unpaid`.

### MODULE 18: The Affiliate Dashboard
- **Goal:** Total transparency for external ambassadors.
- **Phase 18.1:** Construct the distinct React Dashboard for affiliates. Display three main KPI chunks: Total Revenue Generated, Total Share Ever Earned, and Current Owed Share (`To Be Paid`).
- **Phase 18.2:** Render the Student Pipeline Table. Fetch arrays showing every student bound to their referral code, rendering what subscription they are on, how much cash they've explicitly generated, and crucially, an "Active vs Deactivated" live billing status badge allowing affiliates to track churn explicitly.

### MODULE 19: Admin CRM - Financial Payout & Ledger Reconciliation
- **Goal:** The state machine allowing manual external bank payouts to properly reset internal software balances.
- **Phase 19.1:** Expand `/admin/financials` mapping the Affiliate Management grid. Render all active affiliates, their explicit commission %, their Lifetime Revenue, and their exact `To Be Paid` float balances.
- **Phase 19.2:** Develop the `PATCH /api/admin/affiliates/:id/mark_paid` button toggle. When clicked by an Admin (who has cut an external bank check), the system actively resets the affiliate's `to_be_paid = 0` and forcefully toggles their status string back to `"Paid"`.
- **Phase 19.3:** Build `affiliate_payout_logs` to maintain an audit trail detailing the exact date and exact dollar amount of every manual checkout the Admin executes.

### MODULE 20: The Dynamic Roadmap Initialization Core
- **Phase 20.1:** Build `POST /roadmap/initialize`. Execute JSON parsing interpreting strict constraints (Date caps, Hour limits, Failing topics).
- **Phase 20.2:** Develop algorithms intelligently distributing hours into segmented arrays tracking chronological dates generating schedule arrays.
- **Phase 20.3:** Wire the local UI pulling live mapped arrays dynamically.

### MODULE 21: Machine Recalibration Engine (Roadmap Mutation)
- **Phase 21.1:** Construct system chron operations analyzing daily rows mapping missing blocks flagging `STATUS: MISSED`.
- **Phase 21.2:** Fire intelligence pipelines shifting workflows dynamically, reallocating missed blocks cleanly and safely.
- **Phase 21.3:** Pull heatmaps daily. Upon detecting topic metrics falling `<60%`, inject strict "Review Action" blocks logically.

### MODULE 22: RAG AI - Document & Media Chunking Embeddings
- **Phase 22.1:** Activate PostgreSQL `pgvector` dependencies fully allocating index capabilities natively.
- **Phase 22.2:** Build distinct NodeJS intake routines capturing large PDF documents, precisely chunking blocks naturally into OpenAI vector indexes.
- **Phase 22.3:** Replicate transcript ingestion isolating precise `minutes:seconds` temporal markers linking vectors efficiently.

### MODULE 23: RAG AI - LLM Chat Generation (Zero Hallucination)
- **Phase 23.1:** Accept incoming user strings generating prompt vectors mapping search algorithms safely.
- **Phase 23.2:** Run cosine functions exploring internal structures detecting identical vector proximity securely natively.
- **Phase 23.3:** Execute Groq LLM generations restricting outputs applying absolute rigid prompts confining truth strictly to supplied vectors.
- **Phase 23.4:** Pre-parse output nodes mapping array citations translating JSON perfectly to ensure DOM deep-links redirect cleanly to video players.

### MODULE 24: Digital Rights Management & Security Layers
- **Phase 24.1:** Obscure raw storage URLs mapping PDF binaries behind private AWS S3 wrappers securely.
- **Phase 24.2:** Configure `GET /content/:id/secure` APIs assessing valid JWT requests calculating explicit 600-second Stripe Signed URLs.
- **Phase 24.3:** Institute polling heartbeat algorithms originating from the native video players themselves executing API hooks pushing incremental tracking updates natively destroying scrubbing behavior definitively.

### MODULE 25: High-Frequency Gamification (Leaderboards)
- **Phase 25.1:** Setup remote Redis instances exclusively maintaining `Sorted Sets` memory operations entirely.
- **Phase 25.2:** Append pipeline instructions executing fractional Redis points instantly sequentially directly after `POST /tests/submit_grading`.
- **Phase 25.3:** Build queries mapping `GET /leaderboard/top` ensuring blazing instantaneous JSON responses populating UI Podium structures consistently natively.
- **Phase 25.4:** Engineer `PATCH /student/profile/anonymity` allowing users to toggle privacy. Ensure backend leaderboard queries automatically fallback to displaying only initials if `is_anonymous = true`.

### MODULE 26: Advanced Peer Matching Affinity
- **Phase 26.1:** Execute algorithm scans indexing profiles overlapping compatible schedule configurations matching availability securely.
- **Phase 26.2:** Compute similarity matrices mapping disparate scores executing random pair allocations ensuring opposite performance mapping creating balanced tutor pairings dynamically.
- **Phase 26.3:** Map rigid Consent APIs hiding all contact integer keys exclusively replacing visible nodes revealing PII exclusively only completely if backend arrays verify successful handshake verifications strictly accurately securely.

### MODULE 27: Complete Telemetry Dashboards (Platform State)
- **Goal:** Dashboard level telemetry rendering smoothly.
- **Phase 27.1:** Construct rolling aggregate APIs measuring drop off loops (User Registered -> Took Test -> Paid Subscription).
- **Phase 27.2:** Produce native API routers counting system-wide DAU/WAU login events translating data precisely accommodating localized Recharts charts.
- **Phase 27.3:** Format Finance API structures parsing Stripe internal revenue generating total aggregated MRR over static 30-day bounds smoothly mapping line graphs comprehensively inside Admin interfaces.

### MODULE 28: Pre-Launch Polish & Staging Testing
- **Phase 28.1:** Seed staging iterations passing automated random query outputs forcefully mapping structural limits detecting extreme array limitations.
- **Phase 28.2:** Execute webhook integration pipelines rigorously automating random Stripe recurring failure metrics.
- **Phase 28.3:** Eradicate completely all static dummy items replacing entirely real logic rendering final operations.

### MODULE 29: Admin CRM - Advanced Directory Filtering
- **Goal:** Allow admins to parse thousands of students instantly.
- **Phase 29.1:** Build `GET /api/admin/students` incorporating multi-dimensional query parameters (Filter by Paid/Demo, Filter by Last Login < 3 days, Filter by Exam Target).

### MODULE 30: Admin CRM - 360-Degree Profile Reconstruction
- **Goal:** Give explicit single-pane-of-glass views for support tickets.
- **Phase 30.1:** Build `GET /api/admin/students/:id/profile` executing complex joins mapping the specific user's invoices, their test metric averages, their diagnostic AI reports, and their roadmap progression rate simultaneously.

### MODULE 31: Admin CRM - Automated Intervention Engine
- **Goal:** Prevent student churn before it happens via automated risk detection.
- **Phase 31.1:** Construct a daily CRON script scanning for severe risk metrics (e.g., failed 4 tests in a row, hasn't logged in for 5 days).
- **Phase 31.2:** Mount these matches into an active `intervention_logs` queue on the Admin dashboard where support staff can press "Acknowledge" or trigger escalations.

### MODULE 32: Admin CRM - Private Activity & Note Logs
- **Goal:** Enable operational staff to leave breadcrumbs.
- **Phase 32.1:** Develop the `admin_student_notes` table and APIs, allowing admins to pin text context onto a student's profile invisibly without exposing the data to the student APIs.

### MODULE 33: Admin CRM - One-Click Re-Engagement Nudges
- **Goal:** Make manual intervention lightning fast.
- **Phase 33.1:** Build `POST /api/admin/students/:id/nudge` creating templated SendGrid calls (e.g., "Need 1-on-1 Help?", "You've been lagging!") dispatched explicitly behind the scenes when an admin clicks a button.

### MODULE 34: Admin CRM - Mass State Selection Actions
- **Goal:** Eliminate single-row repetition for large cohorts.
- **Phase 34.1:** Wire checkbox grid arrays on the React student table executing bulk ID captures holding 50+ user IDs in state contexts simultaneously cleanly natively.

### MODULE 35: Admin CRM - Asynchronous Bulk Nudging (BullMQ)
- **Goal:** Prevent massive email dispatches from crashing the Node thread.
- **Phase 35.1:** Build `POST /api/admin/bulk/email` which accepts an array of 500+ IDs and offloads the email transmission sequentially to an asynchronous worker queue (Redis/BullMQ) mapping job statuses cleanly natively smoothly.

### MODULE 36: Admin CRM - Secure CSV Data Extraction
- **Goal:** Allow cross-system reporting for administrative executives.
- **Phase 36.1:** Execute `POST /api/admin/bulk/export` running internal joins parsing identities against precise metrics producing a `.csv` stream securely downloadable.

### MODULE 37: Flashcards & SM-2 Spaced Repetition Engine
- **Goal:** Long-term active recall memory integration.
- **Phase 37.1:** Construct `flashcard_decks` tables.
- **Phase 37.2:** Execute SuperMemo-2 (SM-2) algorithms natively modifying `easiness_factor` variables directly mapping 1-4 student difficulty ratings to schedule the next repetition date automatically.

### MODULE 38: Exact Post-Test Analysis Interface
- **Goal:** Post-test explanations.
- **Phase 38.1:** Code the split-views rendering `explanation_correct` matching clearly against all generated incorrect distractors.

### MODULE 39: Centralized Student Inbox Routing
- **Goal:** Notification aggregation.
- **Phase 39.1:** Produce `GET /api/student/inbox` organizing all system push alerts, admin nudges, and pending match requests.

### MODULE 40: Rich Contextual Notebooks & Tagging
- **Goal:** Private repository logging.
- **Phase 40.1:** Wire `student_notes` allowing tags explicitly linking directly to `test_id` or `video_timestamp` arrays.

### MODULE 41: Sub-Second Video Resumption Tracking
- **Goal:** Netflix-style playback bridging.
- **Phase 41.1:** Construct `PATCH /api/content/resume_video` logging explicit player variables tracking session seconds.

### MODULE 42: Persistent PDF Page-State Tracking
- **Goal:** Document indexing.
- **Phase 42.1:** Duplicate the resume logic passing native PDF `.js` metadata objects indicating exact page variables.

### MODULE 43: Polymorphic Global Bookmark Entities
- **Goal:** "Saved for Later" libraries.
- **Phase 43.1:** Build `user_bookmarks` parsing dual references fetching videos and QBank elements indiscriminately into a single list layout.

### MODULE 44: The Explicit Mastery Claim Mechanism
- **Goal:** Pruning syllabus trees securely.
- **Phase 44.1:** Establish `POST /roadmap/claim_mastery`. The backend checks recent averages >90% before allowing the UI to mutate and delete future roadmap JSON blocks globally.

### MODULE 45: Weekly Mock-Dictated Schedule Recalibration
- **Goal:** Automatic timeline correction.
- **Phase 45.1:** Script a weekly CRON passing weekly test averages to the backend, shuffling upcoming study hours intelligently against newly verified "strong" and "weak" subject indicators.

### MODULE 46: Manual Timeline Expansion Algorithms
- **Goal:** Date extension balancing.
- **Phase 46.1:** Execute backend calculation endpoints explicitly triggering when users manually expand their 90-day timetable to 100 days, flattening the daily hour load logically.

### MODULE 47: Immutable Visual Roadmap State Tracking
- **Goal:** Visual feedback indicators.
- **Phase 47.1:** Bind exact boolean variables mapping current DOM instances displaying "green check", "red miss", "orange skip" states securely tied to backend row assertions.

### MODULE 48: Dual-Agent Medical LLM Validation Protocol
- **Goal:** Extreme LLM Fact Checking.
- **Phase 48.1:** Establish independent secondary LLM validation paths examining outputs from the initial RAG node explicitly rejecting hallucinations.

### MODULE 49: Diagnostic Deep Root-Cause Triage
- **Goal:** Intelligent feedback arrays.
- **Phase 49.1:** Program metadata parsers grouping missed inputs as explicitly "Foundational Knowledge Gap" versus "Clinical Reasoning Failure".

### MODULE 50: Universal Search Command Palette (`Cmd+K`)
- **Goal:** Platform-wide accessibility.
- **Phase 50.1:** Build global React listeners binding keyword string inputs directly pushing quick-search commands to the backend PostgreSQL indexed views.

### MODULE 51: The LangGraph Diagnostic Agent Memory
- **Goal:** Stateful AI Conversations.
- **Phase 51.1:** Migrate standard LLM routing into LangGraph state nodes enabling explicit chat memory passing backward into previous iterations logically.

### MODULE 52: Strict Vector Diagram Retrieval Injection
- **Goal:** Visual citations.
- **Phase 52.1:** Instruct LLMs strictly bypassing diffusion logic forcing prompts rendering explicit raw textbook URL assets purely relying on indexed image matrices reliably.

### MODULE 53: Strict Premium Tier Adapter Gates
- **Goal:** Paywall enforcing.
- **Phase 53.1:** Mount globally encompassing React adapter classes disabling components entirely routing users matching specific "Basic" string roles toward subscription checkout loops explicitly.

### MODULE 54: Complex Algorithmic Leaderboard Computation
- **Goal:** Meaningful competitive indexing.
- **Phase 54.1:** Wire mathematical expressions weighting explicit completion loops multiplying Test streaks alongside integer grades scoring variables cleanly populating high-score matrices.

### MODULE 55: The 6-Step Onboarding UI Wizard
- **Goal:** Capturing student constraints gracefully.
- **Phase 55.1:** Build a multi-step React flow persisting `examType`, `examDate`, `hoursPerDay`, and `weakSubjects` directly to backend user states before triggering Roadmap Generation.

### MODULE 56: Premium Elite Custom Templates & Marathon Pathways
- **Goal:** Servicing the highest pricing tier.
- **Phase 56.1:** Implement explicit "60-Day Marathon" rules natively overriding the adaptive JSON array engine, enabling Elite users to load explicitly saved custom `Template` blocks.

### MODULE 57: Admin CRM - QBank Comment Moderation Queue
- **Goal:** Sanitizing the QBank community features.
- **Phase 57.1:** Build Admin Dashboard toggles tracking user-submitted question comments, mapping "hide/show" booleans directly to `question_comments` databases preserving community integrity.

### MODULE 58: The Custom Test Builder Wizard & Saved Templates
- **Goal:** Deep manual exam configuration.
- **Phase 58.1:** Render the Custom QBank Rig enabling rigorous filter states (Unused/Incorrect/Flagged) natively.
- **Phase 58.2:** Develop `POST /tests/templates`. Allow students to save their precise mixed subject/topic configurations enabling one-click retrieval later natively.

### MODULE 59: Frontend Reliability & Observability Infrastructure
- **Goal:** Enterprise-grade failure prevention.
- **Phase 59.1:** Implement global runtime guards tying `window.unhandledrejection` to local logging safely. 
- **Phase 59.2:** Develop isolated `safeParseJson()` utilities natively guarding against malformed database strings preventing React lifecycles from crashing.

### MODULE 60: Global Admin Announcements & Push Inbox System
- **Goal:** Direct administrative broadcasts to all students.
- **Phase 60.1:** Build `POST /api/v1/admin/announcements` allowing Admins to draft and broadcast alerts.
- **Phase 60.2:** Centralize inbox routes via `GET /api/v1/student/inbox` that fetch active announcements.
- **Phase 60.3:** Engineer `announcement_reads` tables enforcing **per-student read/unread tracking**. Update topbar UI badges relying entirely on explicit backend tracking hashes.

### MODULE 61: Markdown Notes Persistence & Plaintext Search Engine
- **Goal:** End-to-end rich text context.
- **Phase 61.1:** Build `student_notes` tables explicitly storing both `content_markdown` (for UI rendering) and `content_plain` (for performant searching).
- **Phase 61.2:** Wire CRUD interfaces natively persisting in-memory rich text directly into relational PostgreSQL stores guaranteeing permanence.

### MODULE 62: Deep Conversion Upsells - Watermarking & Personalized Purchase Funnel
- **Goal:** Aggressive demo-to-paid conversion psychology.
- **Phase 62.1:** Overhaul restricted UI components. Instead of strictly hiding premium elements during demo, render them visibly but with explicit "Premium Padlocks" and greyscale watermarking.
- **Phase 62.2:** Configure End-of-Demo triggers aggressively opening a customized modal: `"Based on your performance, you need X days of focused prep" -> "Unlock Your Personalized Plan"`.

### MODULE 63: Server-Sent Events (SSE) Live Admin Telemetry
- **Goal:** Real-time stream telemetry without browser-refreshing.
- **Phase 63.1:** Introduce SSE (Server-Sent Events) push streams parsing the database domain events (auth, learning, billing).
- **Phase 63.2:** Broadcast delta patches instantly into active Admin connections rendering DAU, Live Activity rows, and pending interventions strictly real-time natively.

### MODULE 64: Subscription Tier Features Mapping & Hard Limits
- **Goal:** Strict backend/frontend mapping correctly allocating features for Demo, Basic, Standard, and Premium tiers.
- **Phase 64.1 (Demo Trial):** Maps to Basic features, but injects strict limits: Roadmap capped to exactly 2 weeks maximum, and Content Hub (Videos/PDFs) capped to 2-3 items.
- **Phase 64.2 (Basic Tier):** Grants the full adaptive roadmap engine, full unrestricted Content Hub access, and performance analytics. Explicitly blocks `leaderboard` and `peer_matching`.
- **Phase 64.3 (Standard Tier):** Grants everything in the Basic tier, and unlocks the `leaderboard` gamification perimeter.
- **Phase 64.4 (Premium Tier):** Grants everything in the Standard tier, and unlocks the `peer_matching` study partner perimeter and high-tier marathon functions.

### MODULE 65: Active Test Session Persistent State & Navigator Matrix
- **Goal:** Real-time state recovery and UX during active Timed and Mock exams.
- **Phase 65.1:** Build `test_session_states` caches (via Redis or PostgreSQL UPSERTs) explicitly tracking active test progress. If a student closes the browser, they must snap back to their exact position.
- **Phase 65.2:** Architect the backend API specifically mapping the frontend `Q Navigator Grid` states. The endpoints must track `is_answered`, `is_flagged`, and the `current_index` pointers for every question instantly to support the color-coded toggle drawer natively.
