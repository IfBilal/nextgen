# Student Portal: Remaining Tabs Technical Specification

> **NOTE TO FUTURE DEVELOPERS (HUMAN & AI):** This document contains the exhaustive technical plan and AI implementation guidelines for the remaining sidebar tabs in the NextGen USMLE platform. It is strictly aligned with the Intent Capture Document (v2.0) to ensure the final product meets the premium, adaptive, and hallucination-free standards.

---

## 1. Content Hub Tab (`/student/content`)
*Aligns with: Module A (Premium Content Hub)*

### A. Frontend UI Plan
- **Unified Library Interface:** A highly polished view with two sub-tabs: **PDFs** and **Videos**.
- **PDF Viewer:** A custom/integrated PDF viewer. The UI must support highlighting, bookmarking, and jump-to-page functionality.
- **Video Player:** Embedded custom player with chapter markers, playback speed controls, and timestamp linking.
- **Progress Tracking:** Every resource has an embedded progress bar (e.g., "Page 45 of 200", "Watched 85%"). 
- **Security Restrictions:** Premium feel, no standard right-click download options (frontend deterrence). 

### B. Backend / Infrastructure Spec
- **Secure Hosting:** Media will be served via signed URLs (e.g., AWS S3 + CloudFront) with short expiry times to prevent unauthorized sharing. Subscription tier checks occur *before* issuing the signed URL.
- **RAG Data Ingestion (Critical):** 
  - Every PDF uploaded directly hits an OCR pipeline and is chunked by Section/Header.
  - Every Video uploaded has an auto-generated VTT/SRT transcript mapped to exact timestamps.
  - These are embedded into the Vector Database. **This is the lifeblood of the AI Assessment Engine.**

---

## 2. AI Tutor Tab (`/student/ai-tutor`)
*Aligns with: Module B (AI Assessment & Retrieval Engine)*

### A. Frontend UI Plan
- **Split-Screen Chat:**
  - **Left Panel (60%):** Conversational chat interface.
  - **Right Panel (40%):** Contextual Evidence Panel. Here, the platform displays the exact source artifacts (Verified Images, PDF Snippets, Video Links) that the AI is referring to.
- **Deep-Link Chips:** When the AI mentions a concept, it renders an interactive chip (e.g., `🎥 Cardio Pharm at 14:22`). Clicking this chip pauses the chat and opens a mini picture-in-picture video player dialed exactly to that timestamp.

### B. Backend & AI Logic 
- **Anti-Hallucination Guardrails:** The LLM powering the tutor operates purely in RAG mode. 
- **System Prompting:** 
  > *"You are a medical tutor. You may ONLY answer questions using the supplied context retrieved from the database. Do NOT generate novel anatomical diagrams. You must append a citation array (Doc ID and Timestamp/Page) to every technical claim."*
- **Visual Retrieval:** If the student asks to visualize a pathway, the backend queries the Vector Database for image metadata and returns an exact diagram sourced explicitly from the verified textbook/client material. **No images are diffusion-generated.**

---

## 3. Analytics & Diagnostics Tab (`/student/analytics`)
*Aligns with: Module C (Adaptive Analytics & AI Diagnostic Profiling)*

### A. Frontend UI Plan
- **Strengths & Weaknesses Matrix:** A bold, visual heatmap showing topics vs subtopics. Red (Weak), Yellow (Medium), Green (Strong).
- **AI Diagnostic Callouts:** Large warning/success cards at the top. E.g., *"🧠 AI Assessment: Your performance in Pathology is dipping. The root cause appears to be a clinical reasoning gap, not basic recall."*
- **Trend Graphs:** Recharts-based graphs mapping score trajectory over the previous 30/60/90 days against cohort averages.

### B. Backend & AI Logic
- **Active Diagnostic Profiling Algorithm:** 
  - The AI doesn't just average scores. It analyzes the *types* of questions missed. 
  - If a student misses a 1st-order question (What is X?), the root cause is **"Foundational Knowledge Gap"**.
  - If a student misses a 3rd-order question (Patient has X, what is the mechanism of the best treatment?), the root cause is **"Clinical Reasoning Gap"**.
- **Schema Response:** The Analytics API runs an LLM summarization pipeline nightly on the user's test history, outputting a structured JSON diagnostic that the frontend renders as text.

---

## 4. Leaderboard Tab (`/student/leaderboard`)
*Aligns with: Module F (Student Ranking)*

### A. Frontend UI Plan
- **The Podium:** Top 3 students featured visually with gold/silver/bronze styling.
- **Live Ranking List:** A dynamic table showing ranks. The table prominently features the current user's position pinned at the bottom if they are not in the top 10.
- **Metrics Evaluated:** Rank is calculated based on a proprietary score combining "Tests Taken", "Average Score", and "Streak".
- **Anonymity Toggle:** Users can opt to display only their initials if they prefer privacy.

### B. Backend Logic
- **Caching:** Ranked queries are notoriously expensive. The leaderboard is calculated via a scheduled background job (e.g., Redis z-sets) updated every 15-30 minutes, not calculated freshly on every client request.

---

## 5. Study Partners Tab (`/student/partners`)
*Aligns with: Module F (Study Partner Matchmaking)*

### A. Frontend UI Plan
- **Match Cards:** Tinder-style or professional professional directory cards showing matched students.
- **"Why you matched" Badges:** Highlights shared attributes: `Both study Evenings`, `Both weak in Pharmacology`, `Same Exam Date`.
- **Consent Mechanism:** A clear "Send Request" button. Contact information (phone numbers) is heavily blurred until both parties mutually consent.

### B. Backend Logic (Matchmaking Algorithm)
- The Matchmaking engine compares users based on a multi-point distance formula prioritizing:
  1. **Exam Target & Date** (Must match within ~14 days).
  2. **Study Schedule** (Morning vs Evening availability).
  3. **Complementary or Similar Weaknesses** (Does Student A excel in the subject Student B is failing?).
- **Opt-In Requirement:** Users must explicitly enable Matchmaking during onboarding or in settings for their profile to enter the pool.
