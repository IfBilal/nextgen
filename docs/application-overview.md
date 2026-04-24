NextGen Medical Mastery

1. Executive Summary
   NextGen Medical Mastery is a comprehensive, premium educational ecosystem designed to dominate the medical examination preparation market (USMLE, PLAB, etc.). The platform integrates Synchronous Learning (Live Sessions), Asynchronous AI Tutoring (LangGraph RAG), and a Conversion-Focused Business Logic (Affiliates, Installments, and Demo triggers).
   This document serves as the definitive source of truth for the entire platform, covering architecture, permissions, operational flows, and the development roadmap.

2. Technology Stack (The "Master Stack")
   To achieve ultra-low latency, high security, and a premium modular UI, the following technologies are utilized:
   • Frontend: React 19, Vite, Modular CSS (no Tailwind), Framer Motion, Recharts.
   • Backend: Node.js (TypeScript), Express.
   • Database: Supabase (PostgreSQL + pgvector).
   • AI Orchestration: LangGraph (Stateful Multi-Agent workflows) + Groq (Llama 3 70B).
   • Live Infrastructure: Zoom Meeting SDK (Embedded) + WhatsApp/SendGrid/OneSignal APIs for notifications.
   • Caching & Optimization: Redis (Leaderboards/Real-time state).

3. User Roles & Permission Matrix
   Access is strictly role-based, governed by a granular permission system. 1. Admin: Absolute control. Manages products, users, financial overrides, and global settings. 2. Editor: High-level support. Can manage content, schedule sessions, and supervise student-teacher interactions. 3. Teacher: Instructional access. Can manage their own classes, start sessions, and interact with students in their assigned courses. 4. Student: Consumer access. Can access paid content, join live sessions, and interact with the AI Tutor. 5. Affiliate: Growth partner. Access to enrollment analytics, referral tracking, and commission payouts (transparency-only).

4. Platform Modules & Features
   4.1 AI Orchestration & The "Doctor" Tutor
   • The Diagnostic Agent: Uses LangGraph to manage stateful conversations. It maintains a "memory" of a student's conceptual gaps.
   • Semantic RAG: Grounded in verified clinical PDFs using hybrid vector search via pgvector.
   • Persona: The AI behaves like a senior "Attending Physician" — professional, mentor-focused, and evidence-based.

4.2 Class & Session Management (Synchronous)
• The "One-Button" Launch: Teachers start sessions with a single click. Attendance only triggers once the teacher is "Checked In."
• Zoom Integration: Meetings are embedded via Zoom SDK.
• Internal Telemetry (Hidden from Students):
◦ Actual duration vs. Scheduled duration.
◦ Per-student engagement time.
◦ Attendance logs.
• Countdown Logic: Real-time timers visible to all roles for upcoming classes. Any change in timing requires a "Change Note" for audit.

4.3 Communication & Supervision
• Supervised Chat: Student-Teacher chat is high-privacy. Admin and Editors can monitor these channels in real-time for quality control.
• Notice Board: Course-specific boards for PDFs, downloadable clinical materials, and urgent announcements.
• Notification Engine: Tri-channel alerts via WhatsApp, Email, and Push Notifications when a session goes live.

4.4 The "Conversion" Demo Logic
• The 48-Hour Trigger: Free users get a 2-day countdown-limited demo.
• The FOMO Roadmap: Demos show a "What you are missing" view of the roadmap, emphasizing the content locked behind the paywall.
• History Gating: Demo users can only see the current day's recorded lecture; all archived sessions remain locked until enrollment.

5. The Business & Payment Engine
   5.1 Payment Models
   • Upfront Payment: Single transaction with an Admin-configurable percentage discount.
   • Installment Model: Automatic recurring billing (Subscription style) with a self-service "Unsubscribe" option for students.
   • Coupon System: Dynamic discount codes manageable via the Admin Dashboard.

5.2 Affiliate Management (The Referral Portal)
• Enrollment Tracking: Affiliates see a persistent list of referrals (even if the user deactivates).
• Commission Slider: Admin sets a percentage (e.g., 20%) that calculates live "Accrued Earnings" for the affiliate.
• Financial Separation: Shows earnings only; actual payouts happen via external banking but are logged here to prevent disputes.

6. Public Web Presence
   • Homepage: Conversion-focused, displaying all "Products" (Course Sessions, Q-Banks, etc.).
   • About/Contact/FAQs: Standard SEO-optimized pages for trust-building.

7. Operational Flows
   7.1 Teacher Workflow 6. Check-in: Teacher logs in and clicks "Start Session." 7. Notification: System fires WhatsApp/Email/Push to all enrolled students. 8. Conduct: Class runs via embedded Zoom. 9. Closing: Session ends; recording is automatically processed and mapped to the course library.

7.2 Student Enrollment Flow 10. Signup: Normal student registration (Manual approval not required). 11. Demo: 2-day access starts automatically. 12. Purchase: Selects Upfront or Installment. 13. Full Access: Dashboard unlocks full roadmap, AI Tutor, and session history.

8. Technical Architecture
   8.1 Adaptive Roadmap Engine
   • Dynamic Rescheduling: If a student is inactive, the logic shifts "Rest Days" and "Study Units" forward to keep the exam date fixed.
   • Remediation: Failing an MCQ triggers an automatic "Remediation Block" via the LangGraph Planner Agent.

8.2 Security & Data Privacy
• Signed URLs: Videos and PDFs expire in 60 minutes for IP protection.
• Supervised Channels: Student data is obfuscated from Teachers (privacy control) and only visible to Admin/Supervisors.

9. Development Phases & Timelines
   Module 1: Foundation (1.5 Weeks)
   • Auth system with 5 roles.
   • Admin dashboard (Basic).
   • Public Website (Home, About, Contact, FAQs).

Module 2: LMS Core (3-4 Weeks)
• Class scheduling & Teacher check-in logic.
• Attendance tracking & Countdown timers.
• WhatsApp/Email/Push Notification triggers.
• Supervised Student-Teacher chat.

Module 3: Student Experience (2-3 Weeks)
• Dynamic Circular Progress UI.
• Recorded session library.
• "Doctor" AI Tutor (LangGraph + RAG).
• Learning Roadmap Preview.

Module 4: Monetization & Demo (2-3 Weeks)
• Stripe Integration (Recurring & Upfront).
• 2-Day Demo logic & Timer.
• Affiliate Dashboard & Commission tracking.
• Coupon system.
