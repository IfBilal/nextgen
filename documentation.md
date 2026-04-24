# NextGen Medical Mastery: Definitive Master Specification

## 1. Executive Summary
NextGen Medical Mastery is a high-performance, enterprise-grade educational ecosystem. It integrates **Synchronous LMS (Live Sessions)**, **Stateful AI Tutoring (LangGraph)**, and an **Adaptive Roadmap Engine** with a robust **Affiliate & Monetization System**. This platform is designed to take students from initial medical exam preparation through high-stakes assessment using a conversion-focused, data-driven approach.

---

## 2. The Master Technology Stack
*   **Frontend**: React 19, Vite, TypeScript, Framer Motion, Recharts.
*   **Backend**: Node.js (TypeScript), Express, BullMQ (for background jobs).
*   **Database**: Supabase (Postgres) + `pgvector` for semantic RAG.
*   **AI Orchestration**: LangGraph (Stateful Multi-Agent) + Groq (Llama 3 70B).
*   **Real-time Operations**: Redis (Leaderboards, BullMQ, Session State) + Server-Sent Events (SSE) for Admin Telemetry.
*   **Communications**: Zoom SDK (Embedded), WhatsApp Business API, SendGrid, OneSignal (Push).
*   **Payments**: Stripe (Upfront, Installments, Coupons).

---

## 3. Advanced User Roles & Access
1.  **Admin**: Full system control; manages products, affiliates, and global interventions.
2.  **Editor**: Content and moderation supervisor; monitors supervised chats and sessions.
3.  **Teacher**: Instructional head; manages classes, check-ins, and student notices.
4.  **Student**: The learner; consumes content via adaptive roadmap and AI tutoring.
5.  **Affiliate**: Growth partner; tracks referrals and earnings via a dedicated, isolated portal.

---

## 4. Feature Modules: Detailed Specification

### 4.1 AI & The "Doctor" Tutor (Stateful RAG)
*   **LangGraph Orchestration**: AI conversations are stateful. A **Diagnostic Agent** tracks student confusion across multiple turns.
*   **Dual-Agent Validation**: A secondary LLM node validates the primary node's output to ensure absolute zero hallucination in medical facts.
*   **Vector Diagram Retrieval**: The AI bypasses generative imaging and instead retrieves verified textbook diagrams via indexed image matrices.
*   **Document/Media Ingestion**: Automated chunking of clinical PDFs and video transcripts with temporal (time-stamped) markers.

### 4.2 Adaptive Roadmap Engine
*   **Genesis Matrix**: Initial 90-day schedule generated from onboarding constraints (Exam date, hours per day).
*   **Ghost Protocol**: Automated nightly recalibration for missed study blocks.
*   **Machine Recalibration**: Weekly mock-test performance (scores <60%) triggers an automatic reshuffle of upcoming study units to focus on weaknesses.
*   **Mastery Claim**: Students can "claim mastery" of a topic (if score >90%), pruning the roadmap to optimize prep time.

### 4.3 LMS & Live Sessions
*   **Teacher Lifecycle**: One-click "Session Start" logic with mandatory teacher check-in.
*   **Attendance Tracking**: Automated logging of student presence; logs are hidden from students to maintain instructional integrity.
*   **Supervised Chat**: Real-time student-teacher interaction with a "Silent Tail" feature for Admins/Editors to monitor quality.
*   **Notice Board**: Course-specific announcements with per-student read/unread tracking.

### 4.4 The QBank & Assessment Rig
*   **SM-2 Spaced Repetition**: Flashcards integrated with the SuperMemo-2 algorithm for long-term active recall.
*   **Navigator Matrix**: A grid-based navigation system for exams that tracks flagged, answered, and unvisited questions in real-time.
*   **State Recovery**: Persistent test session state via Redis; students can resume a test exactly where they left off if they lose connection.

---

## 5. Monetization & Growth Systems

### 5.1 Payment & Coupon Logic
*   **Upfront vs. Installments**: Supports single-payment discounts and automated recurring monthly billing via Stripe.
*   **Admin-Generated Coupons**: 
    *   Admins can generate custom discount codes (e.g., `SUMMER30`).
    *   **Adjustable Percentage**: Admins can configure the exact discount percentage (e.g., 10% to 50%) and expiration dates directly from the dashboard.
*   **Feature Tier Mapping**:
    *   **Demo**: 2-day countdown-limited access; Roadmap capped at 2 weeks; restricted content.
    *   **Basic**: Full adaptive roadmap and content hub; no leaderboard or peer matching.
    *   **Standard**: Adds Leaderboard gamification.
    *   **Premium**: Unlocks Peer Matching and Elite Marathon templates.

### 5.2 The Affiliate Ecosystem
*   **Isolated Portal**: Completely separate UI for affiliates to track their business.
*   **Conversion Ledger**: Every transaction involving a referral code executes real-time float math (`Payment * Affiliate %`) and updates the affiliate's balance.
*   **Transparency Table**: Affiliates see a list of referrals with "Active vs. Deactivated" billing status to track their own churn.
*   **Ledger Reconciliation**: Admin-side state machine for marking payouts as "Paid" and resetting internal balances after external bank transfers.

---

## 6. Admin CRM & Intelligence (Command Center)
*   **360-Degree Profile**: Single-pane view of a student's invoices, test metrics, AI reports, and roadmap progress.
*   **Automated Intervention Engine**: A daily CRON job flags students at risk of churn (e.g., no login for 5 days) for immediate manual outreach.
*   **Bulk Operations**: Async nudges (mass email/push) powered by BullMQ to prevent server-thread blocking.
*   **Live Telemetry**: Server-Sent Events (SSE) push live activity delta patches to the Admin UI without browser refresh.
*   **Data Export**: Secure CSV extraction for high-level administrative reporting.

---

## 7. Security & Privacy
*   **Signed URLs**: 600-second expiring tokens for all PDF and Video assets to prevent link-sharing and piracy.
*   **Sub-Second Resumption**: Playback tracking for videos and PDFs to ensure seamless cross-device resumption.
*   **Anonymity Toggles**: Students can hide their identity on the leaderboard to preserve privacy.

---

## 8. Implementation Phases (65 Modules Summary)
1.  **Modules 1-5 (Foundations)**: Roles, Permissions, Product Mapping, Base Auth.
2.  **Modules 6-11 (Core Systems)**: Notifications, LMS Basics, QBank Architecture, Analytics.
3.  **Modules 12-19 (Monetization & Affiliates)**: Stripe, Coupons, Demo triggers, Affiliate Portals.
4.  **Modules 20-26 (AI & Roadmap Intelligence)**: RAG, LangGraph, Adaptive mutations, Gamification.
5.  **Modules 27-36 (Advanced CRM)**: Telemetry, Interventions, Bulk dispatches, Data exports.
6.  **Modules 37-50 (Learning Experience)**: Spaced Repetition, Notebooks, Resumption, Command Palette.
7.  **Modules 51-65 (Polishing & Elite Features)**: Stateful AI, Mastery mechanics, Navigator Matrix, Tier Gating.

---
*Document Version: 3.0.0*
*Created: 2026-04-23*
*Status: Authoritative Master Documentation for NextGen Medical Mastery*
