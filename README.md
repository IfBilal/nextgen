# NextGen Medical Platform: The Ultimate Full-Stack Master Specification

This document is the exhaustive, granular, definitive blueprint for the NextGen Medical Exam Platform. 
It covers every mathematical formula, database interaction, security protocol, API endpoint, and AI inference mechanism required to take the highly polished React frontend into full scalable production.

---

## CHAPTER 1: EXECUTIVE SUMMARY & PLATFORM PHILOSOPHY

### 1.1 The Vision
The NextGen platform is designed to be a premium, high-stakes educational environment for medical students preparing for rigorous examinations (such as the USMLE). It fundamentally relies on two unbreakable principles:
1.  **Absolute Zero Hallucination:** The AI features must never invent medical facts, guess physiological mechanisms, or generate inaccurate diagrams. 
2.  **Absolute Intellectual Property Protection:** Premium video and PDF resources are highly valuable. They must be aggressively protected from scraping, downloading, and unauthorized peer-to-peer sharing.

### 1.2 The User Journey
When a new user signs up, the system must feel completely alive and tailored to them:
- They are rapidly navigated through an onboarding matrix.
- Their study schedule is mathematically generated the moment they hit submit.
- As they study, their performance actively warps and morphs their future schedule.
- They are connected to peers in the background, without feeling forced into social networking.
- Their performance is constantly evaluated, gamified via a global leaderboard, and displayed in beautiful diagnostic matrices.

### 1.3 The Administrative Mandate
Simultaneously, the platform must allow Administrators to retain total control:
- Admins must be able to view global financial health instantly.
- Admins must have the power to eradicate abusive comments instantly across all users globally.
- Admins must have macro-level telemetry on system health.

---

## CHAPTER 2: THE DECOUPLED SYSTEM ARCHITECTURE

To achieve zero-latency AI responses while keeping hosting costs extremely low, the platform uses a heavily decoupled architecture.

### 2.1 The Presentation Layer (Frontend)
- **Framework:** React 18, Vite.
- **Routing:** React Router DOM (v6+).
- **Styling:** Modular CSS. Tailwind is explicitly avoided to maintain a unique, premium design system.
- **Hosting:** Vercel. 
- **Reasoning:** Vercel allows for global Edge-Caching, meaning the heavy React bundles load in under 50 milliseconds regardless of if the student is in New York or Tokyo.

### 2.2 The Backend API Gateway
- **Runtime:** Node.js powered by Express (TypeScript).
- **Hosting:** Render, Railway, or Heroku.
- **Functionality:** This layer intercepts all web traffic. It checks JSON Web Tokens (JWTs), processes Stripe webhooks, and manages the database transactions.

### 2.3 The Core Database (Supabase)
- **Engine:** PostgreSQL 15+.
- **Why Supabase?:** Supabase acts as the undisputed backbone because it natively provides the Relational Database, User Authentication, Video Storage, and crucially, `pgvector` all inside a single managed dashboard.

### 2.4 The Caching Layer (Redis)
- **Role:** High-speed, in-memory caching.
- **Usage:** PostgreSQL will crash if 50,000 students query a leaderboard simultaneously. Redis handles the high-throughput scoring logic smoothly.

### 2.5 The AI Inference Engine (Groq)
- **Model:** `llama3-70b-8192`.
- **Infrastructure:** LPUs (Language Processing Units).
- **Reasoning:** ChatGPT wrappers are slow and expensive. Groq processes LLM tokens nearly 10x faster than traditional GPUs, providing an instant real-time chat experience for the student, at almost zero cost.

---

## CHAPTER 3: THE SUPABASE DATABASE SCHEMA (SQL)

You must explicitly implement these tables in your Supabase PostgreSQL instance.

### 3.1 Authentication & Tiers
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE role_type AS ENUM ('student', 'admin');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro_monthly', 'elite_annual');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role role_type DEFAULT 'student',
    tier subscription_tier DEFAULT 'free',
    target_exam VARCHAR(100) DEFAULT 'USMLE Step 1',
    exam_target_date DATE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### 3.2 Roadmap Tables
```sql
CREATE TYPE session_status AS ENUM ('upcoming', 'completed', 'missed', 'skipped');

CREATE TABLE roadmap_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    subject VARCHAR(150) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    estimated_duration_minutes INT NOT NULL,
    status session_status DEFAULT 'upcoming',
    is_ai_remediation BOOLEAN DEFAULT FALSE, 
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_roadmap_user_date ON roadmap_sessions(user_id, scheduled_date);
```

### 3.3 Analytics & Test Attempts
```sql
CREATE TABLE test_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(150) NOT NULL,
    target_topic VARCHAR(255),
    total_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    score_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((correct_answers::numeric / total_questions) * 100) STORED,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.4 Community Content
```sql
CREATE TABLE premium_content (
    id VARCHAR(100) PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    supabase_storage_path VARCHAR(500) NOT NULL
);

CREATE TABLE video_comments (
    comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(100) REFERENCES premium_content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes INT DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.5 The RAG Vector Database
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_embeddings (
    chunk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_filename VARCHAR(255) NOT NULL,
    subject VARCHAR(150),
    raw_content TEXT NOT NULL,
    embedding VECTOR(1024), 
    verified_image_storage_url VARCHAR(500) 
);

CREATE INDEX knowledge_embedding_idx ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## CHAPTER 4: RETRIEVAL-AUGMENTED GENERATION (RAG) ALGORITHMS

The AI must only answer questions based on official medical PDFs. 

### 4.1 Ingestion Logistics
1.  **Uploading Phase:** Admins upload verified clinical PDFs (e.g., *Pathophysiology Core Concepts*).
2.  **Extraction:** The Node.js server utilizes `langchain.js` `PDFLoader` to rip the raw text from the document.
3.  **Semantic Formatting:** The text is passed into `RecursiveCharacterTextSplitter`. 
    -   *Chunk Size:* 1000 characters.
    -   *Overlap:* 200 characters.
    -   *Why?* Medical concepts span multiple sentences. Overlap ensures that a sentence explaining a disease mechanism is not disconnected from the preceding sentence describing its symptoms.
4.  **Embedding Generation:** Each chunk is passed to an Embedding model (e.g., HuggingFace `bge-large-en`). The model returns a massive array of numbers `[0.012, -0.45, ...]`.
5.  **Storage:** This vector array is inserted into the `knowledge_embeddings` SQL table.

### 4.2 The AiTutor Chat Engine (Live Inference)
When a student types a question in the React Chat UI, here is the chronological workflow:
1.  **Frontend Dispatch:** React sends a POST request with the text `"Explain Heart Failure"`.
2.  **Vector Calculation:** The Node.js backend converts `"Explain Heart Failure"` into its own Vector mathematical array.
3.  **Cosine Similarity:** The backend runs a Supabase RPC function checking the student's vector against the millions of chunks in `knowledge_embeddings`. It fetches the Top 3 "Closest" textbook paragraphs.
4.  **Groq Injection:** The backend connects to Groq API.
5.  **Hard Guardrails:** The system prompt forces constraints:
    -   *System Prompt:* `"You are a medical examiner. You MUST answer the user's question using ONLY the following verified textbook context. DO NOT hallucinate. [Textbook Paragraphs 1, 2, 3]"`
6.  **Instant Delivery:** Groq processes the answer in ~400ms and sends it down to the React frontend.

### 4.3 Verified Visuals
Because AI models are notorious for drawing physically inaccurate body organs when asked to generate images, we strictly bypass AI Image Generation.
-  When a textbook paragraph is put into the database at Step 1, it is tagged manually with a corresponding diagram URL directly from the AWS/Supabase storage bucket.
-  When the React Context Panel updates, it simply parses that URL and renders `<img src={...} />`.

---

## CHAPTER 5: THE ADAPTIVE ROADMAP ALGORITHMS

The Roadmap algorithm is highly responsive to student performance.

### 5.1 The Genesis Matrix
When the student inputs an exam date 90 days away, the algorithm divides those 90 days using the real-world USMLE weighting rubric. 
-   If Pathology is 20% of the USMLE, 20% of the 90 days (18 days) is assigned to Pathology topics.
-   The backend loops 90 times, inserting chronological rows into `roadmap_sessions`.

### 5.2 The "Ghost Protocol" (Compressing Missed Days)
If a student disappears for 3 days due to illness:
1.  A midnight server-side **Cron Job** executes.
2.  It queries `roadmap_sessions` looking for rows where `date < TODAY` but `status = 'upcoming'`.
3.  It updates those rows to `status = 'missed'`.
4.  It automatically finds dates ahead of 'TODAY' tagged as "Rest Days" and re-allocates the missed subject material explicitly into the future. This prevents the student's final exam date from being illegally delayed.

### 5.3 The Intervention Algorithm (Failing Grades)
1.  A student submits an MCQ test. The Node server calculates a score of **45%**.
2.  Because the score is `< 60%`, the backend halts normal operations and initiates an Intervention.
3.  It queries the upcoming timeline for a date where `SUM(estimated_duration_minutes) < 180` (A day with less than 3 hours of studying).
4.  It explicitly injects a new row: `INSERT INTO roadmap_sessions (topic, is_ai_remediation) VALUES ('REMEDIATION: Failed Concepts', TRUE)`.
5.  In the React frontend, the UI spots `is_ai_remediation = TRUE` and morphs the HTML, rendering a glaring RED intervention block to catch the user's eye.

---

## CHAPTER 6: GLOBAL GAMIFICATION AND ANALYTICS

### 6.1 The Leaderboard Engine (Redis)
Ordering 50,000 students via SQL `ORDER BY points DESC` destroys relational database performance. 
-   **Awarding XP:** When a task is marked 'completed', the backend fires an `O(1)` command to Redis: `ZINCRBY nextgen_global_board 50 user_uuid`.
-   **Fetching Ranks:** `LeaderboardPage.tsx` asks the server for the board. The backend runs `ZREVRANGE nextgen_global_board 0 49` to fetch the top 50, and `ZREVRANK nextgen_global_board user_uuid` to fetch the student's specific hidden rank natively.

### 6.2 The Dashboard Diagnostics
To populate the circular CSS Donut Rings in `DashboardPage.tsx`:
1.  The backend runs a massive aggregation query in SQL calculating `AVG(score_percentage)` for every specific `target_topic` logged by the student.
2.  If the average score for Cardiology is 84, the server returns the Float `84.0`.
3.  The React app natively places the value into the `stroke-dashoffset` parameter dynamically, calculating the exact geometry required to draw a circle spanning 84% of its perimeter.

---

## CHAPTER 7: PEER MATCHMAKING ENGINE

In `PartnersPage.tsx`, mentors and peers are paired optimally.

### 7.1 The Distance Heuristics Matrix
A Cron Job executes every night at 3:00 AM UTC. It loops through all `users` where `opt_in_matchmaking = TRUE` and derives a Compatibility Score (Max 100).
1.  **Temporal Proximity (40 pts):** Calculate the absolute difference between Exam Dates. Ex: `Score = MAX(0, 40 - (DaysDiff * 2))`.
2.  **Schedule Alignment (30 pts):** If User A and User B both prefer `Evening` study hours, award 30 points.
3.  **The Symbiotic Exchange (30 pts):** If User A's weakest documented subject matches User B's strongest subject, they receive 30 points, fostering ideal peer-tutoring.

### 7.2 The Consent Handshake
Contact numbers are physically encrypted in the database.
-   When matched, the frontend renders a blurred identity card.
-   If User A and User B concurrently click `Accept`, the backend executes `user_a_consent = TRUE` and `user_b_consent = TRUE`. The next API fetch decrypts their raw phone numbers for external communication.

---

## CHAPTER 8: FIN-TECH & INTELLECTUAL PROPERTY SECURITY

The absolute core of the business is the Content Hub. We cannot let a free user access premium videos. 

### 8.1 JWT Roles & Stripe Webhooks
1.  When a user pays the $49.00 fee on Stripe's Checkout Portal, Stripe fires a POST request to your backend `/api/webhooks/stripe`.
2.  The backend confirms cryptographic signatures from Stripe.
3.  It updates the database table directly: `UPDATE users SET tier = 'pro_monthly'`.
4.  The user's next authenticated login issues them a secure JWT explicitly carrying the `tier='pro_monthly'` payload.

### 8.2 Security Guard Middleware
Every request from the React app sends this JWT. Your Express API intercepts the request immediately.
-   If the API routes to `/api/v1/content/videos` and reads the JWT payload `tier='free'`, the API abruptly terminates the call with a `403 Forbidden` status. The database is never even queried.

### 8.3 The Self-Destructing Media Files
If a premium student tries to scrape a video and leak the URL online:
1.  The Node.js backend does not send the raw generic URL holding the video file.
2.  Instead, the Node.js backend commands Supabase Storage to cryptographically mint a "Signed URL".
3.  The Signed URL represents a highly specific, encrypted link parameterized to explode.
4.  The server sets `Expires: 3600`.
5.  In exactly 60 minutes, the Signed URL permanently terminates. If the student reposted the link to Reddit, it will result in an "Access Denied" error for anyone attempting to view the pirated material.

---

## CHAPTER 9: THE ADMINISTRATIVE COMMAND CENTER (OVERSIGHT & MODERATION)

The Admin Portal (`/admin`) is a completely separate high-security environment designed for platform owners to manage the business, monitor system health, and enforce community standards. It is composed of four distinct, high-performance modules.

### 9.1 The Executive Dashboard (Global Telemetry)
The Admin Dashboard provides a bird's-eye view of the entire NextGen ecosystem. It does not focus on individual users, but on system-wide health.
- **Key Metrics:** It tracks total active students, server uptime, and AI inference latency.
- **Data Pipeline:** These stats are pulled from a combination of the PostgreSQL `users` table count and a **Telemetry Service** that logs Every time a student interacts with the Groq API.
- **UI Logic:** We use high-contrast "Status Cards" that glow Green when systems are healthy and Pulse Red if the AI response time exceeds 1.5 seconds, allowing Admins to spot infrastructure bottlenecks immediately.

### 9.2 Student Management (The CRM Hub)
The **Students** tab serves as the platform's internal CRM. It allows administrators to search, filter, and drill down into every registered account.
- **User Records:** Displays the student's name, email, subscription tier, and "Last Active" timestamp.
- **Administrative Actions:** From this UI, an Admin can manually override a student's tier (e.g., granting a 7-day 'Elite' trial for support reasons), reset passwords, or ban users who violate terms of service.
- **Architecture:** This page uses a **Virtualized Table** to handle thousands of rows efficiently, ensuring the browser doesn't lag even if the platform has 100,000+ registered medical students.

### 9.3 The Financials Engine (MRR & LTV Tracking)
This is the most critical business module. To maintain 100% accounting accuracy, it bypasses the local database and queries the **Stripe API** directly in real-time.
- **Metric 1: Monthly Recurring Revenue (MRR):** Calculated by aggregating all active `pro_monthly` and `elite_annual` subscriptions via the `stripe.subscriptions.list` endpoint.
- **Metric 2: Churn Rate:** The system monitors `customer.subscription.deleted` webhooks to track how many students are leaving vs. joining, displayed as a percentage.
- **Metric 3: Lifetime Value (LTV):** An algorithmic estimation of how much a student will pay over their entire time on the platform.
- **Visualization:** Data is piped into **Custom CSS Bar Charts** that allow the Admin to see growth trends over 30, 60, and 90-day windows.

### 9.4 The Moderation Hub (Security & Safety)
The Moderation Hub is where the Admin enforces the platform's professional standards. It specifically targets the **Community Discussion** threads beneath every video.
- **Real-Time Feed:** It surfaces every new comment posted globally into a centralized list.
- **One-Click Obfuscation:** Next to every comment is a "Hide Access" toggle. When clicked, the Node.js backend updates the `is_hidden` column in the `video_comments` table.
- **The Cloaking Mechanism:** Once hidden, the comment is not deleted (to preserve legal records of abuse), but it is "Cloaked." On the student-facing side, the React component replaces the text with: `[This comment was hidden by an administrator for violations of community guidelines.]`
- **Flagged Content:** Any comment containing "Banned Words" (defined in a server-side regex list) is automatically moved to the top of this list and highlighted in orange for immediate Admin review.

---

## 10. CONCLUSION

## 11. NOTES PERSISTENCE CONTRACT

Backend should store note text in markdown form to preserve formatting and derive a plain text field for search.

Required fields in notes table:
- note_id as UUID primary key
- user_id as UUID foreign key to users
- title
- subject (default General)
- content_markdown as source of truth
- content_plain as stripped searchable text
- content_json as optional rich text JSON for future editor upgrades
- is_pinned
- created_at, updated_at, deleted_at

Save rules for backend:
- Save endpoint should accept title, subject, contentMarkdown, and isPinned.
- Persist content_markdown exactly as sent from frontend.
- Derive content_plain on server side by stripping markdown markers.
- Update updated_at with server timestamp.
- Enforce ownership using authenticated user id.

Pin/Unpin contract (must implement):
- The `is_pinned` column is the single source of truth for note pin state.
- Expose `PATCH /api/v1/notes/:noteId/pin` with payload `{ "isPinned": true | false }`.
- On pin toggle, update both `is_pinned` and `updated_at`.
- Frontend list ordering should always be:
    1) `is_pinned = TRUE` first
    2) then by `updated_at DESC`
- API list queries should return rows in this order so all clients stay consistent.

Read rules for backend:
- Notes listing should support subject filter and search query.
- Search should run on content_plain and title.
- Soft-deleted notes must be excluded where deleted_at is null.

Delete rule:
- Use soft delete only (set deleted_at timestamp), do not hard delete by default.

This gives backend a reliable way to preserve exactly which text is bold or italic today, while allowing a future migration to fully structured rich text JSON.

By strictly executing this technical blueprint across Node.js, Supabase, Groq, and Redis, the NextGen Medical platform will instantaneously transition from its fully functional React User Interface Prototype directly into a scalable, high-performance SaaS enterprise application capable of supporting tens of thousands of active medical students simultaneously.

---

## 12. REAL-TIME ADMIN MONITORING IMPLEMENTATION PLAN (PRODUCTION)

This section explains exactly how the current Admin Overview frontend (charts, activity feed, risk tables) should be wired to real users and real production data in near real-time.

### 12.1 Goals and Real-Time SLAs

For Admin pages (`/admin/dashboard`, `/admin/students`, `/admin/metrics`, `/admin/financials`, `/admin/comments`), define three update speeds:

1. **Live stream (1–5s latency):**
    - Active user counters (DAU online now)
    - Moderation queue updates
    - High-risk alerts (sudden score drops, abuse spikes)

2. **Near-real-time (15–60s latency):**
    - Activity feed events
    - At-risk student table
    - AI latency and system health cards

3. **Batch (5–60 min latency):**
    - Financial aggregates (MRR trend, churn cohorts)
    - Most-missed-question reports
    - Deep diagnostics summaries

### 12.2 Production Architecture (High-Level)

1. **Operational Database (PostgreSQL / Supabase):**
    - Source of truth for users, tests, attempts, comments, subscriptions snapshot, moderation actions.

2. **Event Bus / Stream Layer (choose one):**
    - **Redis Streams** (fast, simpler operations) or
    - **Kafka / Redpanda** (higher scale, partitioned history).

3. **Metrics Aggregation Workers:**
    - Consumers process raw events into admin-friendly aggregates.
    - Write rolled-up metrics into dedicated read tables (materialized style).

4. **Admin API Layer (Node + Express/Fastify):**
    - Serves snapshots via REST endpoints.
    - Pushes updates via WebSocket or Server-Sent Events.

5. **Frontend Admin App (React):**
    - Initial page load from REST snapshot.
    - Real-time patch updates from WebSocket/SSE channel.

### 12.3 Event Model (What Gets Emitted)

Emit events for every key action:

- `student.login`
- `test.started`
- `test.submitted`
- `test.scored`
- `roadmap.adjusted`
- `ai.request.started`
- `ai.request.completed`
- `comment.created`
- `comment.flagged`
- `comment.hidden`
- `subscription.created`
- `subscription.renewed`
- `subscription.canceled`

Each event should include:

- `event_id` (UUID)
- `event_type`
- `occurred_at` (UTC timestamp)
- `user_id` / `admin_id` (if relevant)
- `correlation_id` (trace across services)
- `payload` (JSON)

### 12.4 Database Design for Admin Read Performance

Keep transactional tables separate from admin read models.

**Core transactional tables** (examples):
- `users`
- `test_attempts`
- `test_attempt_items`
- `video_comments`
- `subscriptions`

**Admin read-model tables** (examples):
- `admin_kpi_snapshots` (time-bucketed KPI values)
- `admin_dau_timeseries` (minute/hour buckets)
- `admin_score_distribution_buckets`
- `admin_risk_students_current`
- `admin_activity_feed_recent`
- `admin_financial_rollups_daily`
- `admin_moderation_queue_current`

This avoids heavy joins on every dashboard request and keeps chart APIs fast.

### 12.5 How Admin Overview Works with Real Data

Current UI (`AdminDashboardPage.tsx` + `admin-overview.css`) can map directly:

1. **KPI Cards:**
    - API: `GET /api/admin/overview/kpis`
    - Source: `admin_kpi_snapshots` latest row.

2. **DAU 7-Day Line Chart:**
    - API: `GET /api/admin/overview/dau?range=7d`
    - Source: `admin_dau_timeseries`.

3. **Score Distribution Bar Chart:**
    - API: `GET /api/admin/overview/score-distribution`
    - Source: precomputed buckets from scoring pipeline.

4. **Recent Platform Events Feed:**
    - API: `GET /api/admin/overview/activity?limit=50`
    - Source: event stream consumer writes concise feed records.

5. **At-Risk Students Table:**
    - API: `GET /api/admin/overview/at-risk`
    - Source: risk scoring job updates `admin_risk_students_current`.

### 12.6 Real-Time Delivery: WebSocket/SSE Pattern

Recommended frontend flow for admin pages:

1. Page mount:
    - Fetch snapshot via REST.

2. Open real-time channel:
    - `GET /api/admin/stream` (SSE) **or** `wss://.../admin-stream` (WebSocket).

3. Server pushes delta messages:
    - Example message types: `kpi.updated`, `feed.new_event`, `risk.updated`, `moderation.queue.updated`.

4. Frontend applies patches:
    - Update chart series and cards in-place without full reload.

5. Reconnect strategy:
    - Exponential backoff, heartbeat ping, and stale banner if disconnected.

### 12.7 Backend Services Breakdown

Implement as logical modules (single repo or microservices):

1. **Ingestion Service:**
    - Validates and publishes domain events.

2. **Aggregation Service:**
    - Computes counters and timeseries windows (1m, 5m, 1h, 1d).

3. **Risk Scoring Service:**
    - Continuously scores students with weighted signals:
      - rolling test score,
      - study inactivity,
      - repeated weak topic failures,
      - missed roadmap sessions.

4. **Moderation Service:**
    - Handles flags, hide/show actions, audit logs.

5. **Financial Sync Service:**
    - Consumes Stripe webhooks.
    - Updates canonical subscription state + daily rollups.

### 12.8 Student Insights (Admin CRM) at Scale

For `/admin/students` production behavior:

- Use cursor pagination, not offset for large tables.
- Server-side filtering and sorting only.
- API: `GET /api/admin/students?cursor=&tier=&risk=&last_active_before=`
- Drawer endpoint: `GET /api/admin/students/:id/profile`
- Keep heavy charts summarized (14d/30d pre-aggregates).

### 12.9 Financial Monitoring (Reliable and Accurate)

Financial dashboard should be driven by Stripe events + internal ledger snapshots.

1. Stripe webhooks endpoint:
    - Verify signature.
    - Persist raw payload in `stripe_webhook_events`.
    - Idempotency by `event_id`.

2. Normalize to internal records:
    - `subscription_state`
    - `invoice_events`
    - `refund_events`

3. Rollups:
    - MRR, ARR, net revenue, churn, reactivations.

4. Reconciliation job:
    - Daily sync against Stripe API to catch missed webhooks.

### 12.10 Moderation in Real Time

For `/admin/comments`:

- New comments appear in moderation queue within seconds.
- Flag rules run async (keyword model + abuse classifier).
- Admin actions (`hide/show`) write to:
  - `video_comments.is_hidden`
  - `moderation_actions` audit table (`who`, `when`, `why`).
- Push queue size + action results to admin stream instantly.

### 12.11 Security, RBAC, and Auditability

1. **Strict RBAC:**
    - `admin`, `moderator`, `finance_admin`, `support_admin` roles.
    - Scope endpoints by role and tenant/org if needed.

2. **JWT + Session Controls:**
    - Short-lived access tokens + refresh rotation.
    - Revoke on suspicious activity.

3. **Audit log (immutable):**
    - Every admin action must produce an audit record.
    - Include IP, user-agent, request-id.

4. **PII minimization:**
    - Redact sensitive fields in general admin feeds.
    - Full PII only for privileged roles.

### 12.12 Observability and On-Call Readiness

Use OpenTelemetry + centralized logs + metrics:

- **Tracing:** request-to-event-to-worker pipeline tracing.
- **Metrics:**
  - API p95 latency,
  - stream lag,
  - worker backlog,
  - webhook failure rate,
  - DB query p95,
  - dashboard staleness age.
- **Alerts:**
  - no events ingested for N minutes,
  - admin stream disconnect spikes,
  - high queue lag,
  - Stripe webhook failure bursts.

### 12.13 Frontend Implementation Pattern (Admin React)

For each admin page:

1. `useAdminSnapshot()` hook
    - Loads initial REST payload.

2. `useAdminRealtime()` hook
    - Subscribes to channel and returns delta patches.

3. Local cache (React Query recommended)
    - Snapshot is query cache.
    - Realtime deltas mutate cache entries.

4. Staleness UX
    - Show "Live" badge when connected.
    - Show "Reconnecting" banner when disconnected.

### 12.14 Scaling Plan by Stage

1. **Stage A (0–10k users):**
    - Postgres + Redis Streams + single worker pool.

2. **Stage B (10k–100k users):**
    - Partitioned event stream, dedicated read replicas, heavier pre-aggregation.

3. **Stage C (100k+ users):**
    - Kafka/Redpanda, horizontally scaled consumers, OLAP sidecar (ClickHouse/BigQuery) for deep analytics.

### 12.15 Concrete API Contract Starter

- `GET /api/admin/overview/snapshot`
- `GET /api/admin/overview/kpis`
- `GET /api/admin/overview/dau?range=7d`
- `GET /api/admin/overview/score-distribution`
- `GET /api/admin/overview/activity?limit=50`
- `GET /api/admin/overview/at-risk?limit=50`
- `GET /api/admin/students?...filters...`
- `GET /api/admin/students/:id/profile`
- `POST /api/admin/comments/:id/hide`
- `POST /api/admin/comments/:id/show`
- `GET /api/admin/financials/summary?range=30d`
- `GET /api/admin/stream` (SSE) or `/ws/admin-stream`

### 12.16 Delivery Roadmap (Execution Order)

1. Finalize event schema + read-model tables.
2. Implement ingestion + aggregation workers.
3. Implement overview snapshot APIs.
4. Add SSE/WebSocket admin stream.
5. Wire frontend pages to snapshot + realtime hooks.
6. Implement moderation + financial reconciliation pipelines.
7. Add observability dashboards + alerts.
8. Run load tests and tune indexes/caches.

With this plan, the existing admin frontend can evolve from static demo data to true production-grade, near-real-time operational telemetry for real users.

## 13) VIDEO PROGRESS TRACKING IMPLEMENTATION PLAN (PRODUCTION)

This section defines exactly how to implement reliable, scalable, and fair video progress tracking so both students and admins can trust completion data.

### 13.1 Goals

1. Track watched progress per user per video accurately.
2. Resume from last valid position across devices.
3. Mark completion only when real watch criteria are met.
4. Provide admin analytics without overloading primary tables.
5. Prevent simple abuse (seek-to-end, tab-idle inflation).

### 13.2 Data Model (Backend + DB)

Use two-layer storage:

1. **State table (authoritative latest progress):**
    - `video_progress`
    - one row per `(user_id, video_id)`

2. **Event table (optional but strongly recommended):**
    - `video_watch_events`
    - append-only stream for analytics, anomaly detection, and audits.

Suggested schema (Postgres):

`video_progress`
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `video_id` (uuid, indexed)
- `last_position_seconds` (int, default 0)
- `max_watched_seconds` (int, default 0)
- `watched_seconds_total` (int, default 0)
- `duration_seconds` (int)
- `completion_percent` (numeric(5,2), default 0)
- `is_completed` (bool, default false)
- `completed_at` (timestamptz, nullable)
- `last_event_at` (timestamptz)
- `updated_at` (timestamptz)
- unique constraint: `(user_id, video_id)`

`video_watch_events`
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `video_id` (uuid, indexed)
- `session_id` (uuid, indexed)
- `event_type` (text: `heartbeat|pause|seek|ended|start|visibility_change`)
- `position_seconds` (int)
- `delta_watched_seconds` (int)
- `playback_rate` (numeric)
- `tab_visible` (bool)
- `client_ts` (timestamptz)
- `server_ts` (timestamptz, indexed)
- `metadata` (jsonb)

### 13.3 Completion Rules (Canonical)

Use deterministic rules to avoid ambiguity:

1. `completion_percent = (max_watched_seconds / duration_seconds) * 100`.
2. Mark complete when both are true:
    - `completion_percent >= 95` (or 90 for short clips), and
    - at least `min( duration_seconds * 0.6, duration_seconds - 30 )` valid watched time.
3. Completion is monotonic:
    - once `is_completed = true`, never revert to false.

### 13.4 API Contract

1. `GET /api/videos/:videoId/progress`
    - returns current progress row for authenticated user.

2. `POST /api/videos/:videoId/progress/events`
    - batched events endpoint (recommended every 10–20s or on pause/end).
    - body: `{ sessionId, durationSeconds, events: [...] }`

3. `PUT /api/videos/:videoId/progress/position`
    - lightweight fallback endpoint for latest position only.

4. `POST /api/videos/:videoId/progress/complete`
    - optional explicit complete endpoint for `ended` signal; backend still validates rules.

Idempotency and safety:
- Require `X-Idempotency-Key` for event batch writes.
- Ignore duplicate batch keys.
- Reject impossible jumps (example: +300 watched seconds in 5 real seconds).

### 13.5 Frontend Player Behavior (React)

On player lifecycle:

1. On load:
    - fetch progress via `GET`.
    - seek to `last_position_seconds` (bounded by duration).

2. During playback:
    - emit heartbeat every 10 seconds while all are true:
      - playing,
      - tab visible,
      - playback rate within allowed range (for example 0.75x–2x).

3. On `pause`, `seeked`, `ended`, and `beforeunload`:
    - flush pending event batch immediately.

4. Local resilience:
    - queue unsent events in memory + optional localStorage fallback.
    - retry with exponential backoff.

5. UI rules:
    - progress bar shows backend-confirmed `completion_percent`.
    - badge states: `Not Started`, `In Progress`, `Completed`.

### 13.6 Anti-Gaming and Data Integrity

Validate on server, not client:

1. Cap credited watch delta by wall-clock elapsed time.
2. Do not credit watch time while tab hidden for long intervals.
3. Treat large seek forward as position change, not watched time.
4. Store both `last_position_seconds` and `max_watched_seconds`.
5. Flag anomalies:
    - extreme completion speed,
    - repetitive end-seeking patterns,
    - unrealistic concurrent sessions.

### 13.7 Admin Real-Time Monitoring Integration

Expose video-learning telemetry in admin dashboards:

1. Aggregate tables/materialized views:
    - completion rate by course/module/video,
    - median time-to-complete,
    - drop-off points by timestamp bucket.

2. Snapshot APIs:
    - `GET /api/admin/videos/overview?range=7d`
    - `GET /api/admin/videos/:videoId/funnel`
    - `GET /api/admin/videos/:videoId/dropoff`

3. Realtime:
    - publish progress updates/events to stream bus.
    - push admin delta updates via SSE/WebSocket.

### 13.8 Performance and Scaling Strategy

1. Write path:
    - ingest event batches asynchronously when traffic grows.
    - update `video_progress` in upsert transaction.

2. Read path:
    - cache `GET progress` responses (short TTL).
    - use pre-aggregated read models for admin analytics.

3. Partitioning:
    - partition `video_watch_events` by month or hash of `video_id` at scale.

4. Retention:
    - keep raw events 90–180 days (or policy-defined), then compact.

### 13.9 Security and Privacy

1. Require auth on all progress endpoints.
2. Enforce tenant and role checks for admin analytics.
3. Minimize PII in event payloads.
4. Audit admin access to individual learner progress details.

### 13.10 Rollout Plan (Recommended)

Phase A (MVP reliable progress)
1. Implement `video_progress` table + `GET/PUT` endpoints.
2. Frontend sends position on interval + pause/end.
3. Resume playback and basic completion badge.

Phase B (Robust tracking)
1. Add `video_watch_events` + batch ingestion endpoint.
2. Add anti-gaming validations and idempotency.
3. Backfill/compute improved completion metrics.

Phase C (Admin intelligence)
1. Add admin video analytics snapshot APIs.
2. Add realtime stream updates to admin dashboard.
3. Add anomaly alerts and observability metrics.

### 13.11 Test Checklist

Backend tests:
- upsert correctness for repeated batches,
- idempotency key duplicate handling,
- completion threshold transitions,
- anti-gaming validation paths.

Frontend tests:
- resume from saved position,
- heartbeat batching and flush behavior,
- offline queue + retry,
- completed badge and progress bar sync with backend response.

Load tests:
- event ingestion throughput,
- p95 latency for `GET progress`,
- stream lag for admin realtime panel.

With this implementation, video progress becomes accurate enough for learner UX, trustworthy for certification/completion logic, and actionable for real-time admin monitoring.

## 14) DOCUMENT (PDF) PROGRESS TRACKING IMPLEMENTATION PLAN (PRODUCTION)

This section defines robust tracking for document learning progress (PDFs, notes, handouts) so the percentage bar is accurate, resumable, and admin-reportable.

### 14.1 Goals

1. Track per-user progress per document reliably.
2. Resume users at their last meaningful reading position.
3. Prevent fake completion by fast scrolling/skipping.
4. Provide document analytics to admin in near real time.
5. Keep write path efficient under high traffic.

### 14.2 Data Model (Backend + DB)

Use two layers, same pattern as video:

1. **State table (authoritative latest progress):** `document_progress`
2. **Event table (analytics + audit):** `document_read_events`

Suggested schema (Postgres):

`document_progress`
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `document_id` (uuid, indexed)
- `last_page` (int, default 1)
- `max_page_reached` (int, default 1)
- `page_count` (int)
- `unique_pages_read` (int, default 0)
- `active_read_seconds_total` (int, default 0)
- `completion_percent` (numeric(5,2), default 0)
- `is_completed` (bool, default false)
- `completed_at` (timestamptz, nullable)
- `last_event_at` (timestamptz)
- `updated_at` (timestamptz)
- unique constraint: `(user_id, document_id)`

`document_read_events`
- `id` (uuid, pk)
- `user_id` (uuid, indexed)
- `document_id` (uuid, indexed)
- `session_id` (uuid, indexed)
- `event_type` (text: `open|heartbeat|page_change|scroll|close|visibility_change`)
- `page_number` (int)
- `scroll_percent` (numeric(5,2), nullable)
- `delta_active_seconds` (int)
- `tab_visible` (bool)
- `client_ts` (timestamptz)
- `server_ts` (timestamptz, indexed)
- `metadata` (jsonb)

### 14.3 Completion Logic (Canonical)

Do not base completion only on final page reached.

1. `completion_percent` can be computed by weighted signal:
    - 70% weight from `max_page_reached / page_count`,
    - 30% weight from `unique_pages_read / page_count`.

2. Mark complete when all are true:
    - `completion_percent >= 90`,
    - `unique_pages_read >= ceil(page_count * 0.75)`,
    - `active_read_seconds_total >= min(page_count * 12, 900)`.

3. Completion is monotonic:
    - once complete, never revert to incomplete.

### 14.4 API Contract

1. `GET /api/documents/:documentId/progress`
    - returns progress row for authenticated learner.

2. `POST /api/documents/:documentId/progress/events`
    - accepts batched read events every 10–20s and on page-change/close.
    - body: `{ sessionId, pageCount, events: [...] }`

3. `PUT /api/documents/:documentId/progress/state`
    - lightweight fallback for last page + percent sync.

4. `POST /api/documents/:documentId/progress/complete`
    - optional explicit completion call; backend re-validates rules.

Idempotency and integrity:
- Require `X-Idempotency-Key` for event batch endpoint.
- Ignore duplicate keys and out-of-order stale updates.
- Reject impossible jumps (example: 1 → 120 pages in 2 seconds).

### 14.5 Frontend Reader Behavior (React)

For a PDF reader component/page:

1. On open:
    - fetch progress and seek to `last_page`.
    - create a `session_id` for this reading session.

2. During reading:
    - emit heartbeat every 10 seconds only if document is visible and user is active.
    - emit `page_change` events when current page changes.
    - debounce rapid scroll/page events before batching.

3. On close/unload:
    - flush pending events immediately.

4. Progress bar UI:
    - always render backend-confirmed `completion_percent`.
    - show states: `Not Started`, `Reading`, `Completed`.

5. Resilience:
    - queue unsent batches locally and retry with exponential backoff.

### 14.6 Anti-Gaming and Data Integrity

Validate server-side:

1. Credit active read time only when tab visible and user interaction exists.
2. Treat fast multi-page jumps as navigation, not read-time credit.
3. Cap credit per time window to realistic values.
4. Detect anomaly signals:
    - ultra-fast completions,
    - repetitive open-close loops,
    - extremely low dwell with high page traversal.

### 14.7 Admin Real-Time Monitoring Integration

Expose document telemetry in admin views:

1. Snapshot APIs:
    - `GET /api/admin/documents/overview?range=7d`
    - `GET /api/admin/documents/:documentId/funnel`
    - `GET /api/admin/documents/:documentId/dropoff`

2. Read models/materialized views:
    - completion by document,
    - median active read time,
    - page-level drop-off hotspots.

3. Realtime feed:
    - publish document progress deltas to stream bus.
    - surface live changes in admin dashboard via SSE/WebSocket.

### 14.8 Performance and Scalability

1. Ingest events in batches (not per scroll tick).
2. Upsert `document_progress` in a short transaction.
3. Partition `document_read_events` monthly when volume grows.
4. Keep raw events with retention policy (e.g., 90–180 days), then compact.

### 14.9 Security and Privacy

1. Auth required for all document progress endpoints.
2. Tenant/role scoping for admin visibility.
3. Do not expose sensitive document metadata unnecessarily.
4. Audit admin reads for learner-level progress records.

### 14.10 Rollout Plan (Recommended)

Phase A (MVP)
1. Add `document_progress` table.
2. Implement `GET` + lightweight `PUT` state endpoint.
3. Frontend resume + progress bar sync.

Phase B (Robust)
1. Add `document_read_events` + batched events API.
2. Add idempotency and anti-gaming validation.
3. Move completion rules fully server-side.

Phase C (Admin Intelligence)
1. Add admin document snapshot APIs and read models.
2. Stream live document progress deltas to admin UI.
3. Add anomaly alerts and observability dashboards.

### 14.11 Test Checklist

Backend tests:
- upsert behavior with duplicate and out-of-order batches,
- completion transitions at thresholds,
- impossible jump rejection,
- idempotency-key behavior.

Frontend tests:
- resume from saved page,
- heartbeat + page-change batching,
- unload flush behavior,
- progress bar reflects backend values.

Load tests:
- event ingestion throughput,
- p95 latency for `GET /progress`,
- stream lag for admin document dashboards.

With this implementation, PDF/document progress bars become trustworthy for learners, useful for admin monitoring, and robust enough for production growth.

## 15) ADMIN STUDENT OPS IMPLEMENTATION PLAN (PRODUCTION)

This section defines how Admin Student Operations should work end-to-end in a full-stack architecture so future developers can implement it consistently across backend, database, and frontend.

### 15.1 Objectives

1. Give admins a single operational surface to manage learners.
2. Support fast student search, triage, and intervention workflows.
3. Enable safe account/content actions with strong audit trails.
4. Provide near-real-time visibility into learner status.
5. Enforce role-based controls and compliance for sensitive operations.

### 15.2 Core Product Modules

1. **Student Directory**
    - Paginated table with filters (`cohort`, `subscription`, `risk`, `last_active`, `onboarding_status`, `completion_band`).
    - Search by name, email, phone, enrollment ID.
    - Saved filter views for support/ops teams.

2. **Student 360 Profile**
    - Identity + account state + subscription state.
    - Learning summary (test attempts, video/pdf progress, streaks, weak areas).
    - Activity timeline (auth, study events, purchases, support interactions).

3. **Operational Actions**
    - Account actions: activate/deactivate, soft suspend, force logout, password reset link trigger.
    - Learning actions: unlock/lock modules, assign remedial track, adjust deadlines.
    - Support actions: add notes, set follow-up date, assign owner.

4. **Intervention Queue**
    - Rule-based at-risk queue (low activity, low score trend, churn signals).
    - SLA tracking (`new`, `in_progress`, `resolved`, `escalated`).
    - Owner assignment and outcome logging.

5. **Bulk Operations**
    - Multi-select student actions (tag, assign cohort mentor, send reminder campaign).
    - Async job execution with progress and rollback-safe behavior.

### 15.3 Data Model (Backend + DB)

Use normalized OLTP tables plus optional read models.

Primary tables:

`students`
- `id` (uuid, pk)
- `email` (text, unique, indexed)
- `full_name` (text, indexed)
- `phone` (text, nullable)
- `status` (enum: `active|inactive|suspended|pending`)
- `onboarding_status` (enum: `not_started|in_progress|completed`)
- `cohort_id` (uuid, nullable, indexed)
- `created_at`, `updated_at`

`student_subscriptions`
- `id` (uuid, pk)
- `student_id` (uuid, indexed)
- `plan` (text)
- `state` (enum: `trial|active|past_due|canceled|expired`)
- `renewal_at` (timestamptz, nullable)
- `provider_customer_id` (text, nullable)

`student_flags`
- `id` (uuid, pk)
- `student_id` (uuid, indexed)
- `flag_type` (enum: `at_risk|payment_risk|academic_alert|behavioral|custom`)
- `severity` (enum: `low|medium|high|critical`)
- `is_open` (bool, default true)
- `opened_by_admin_id` (uuid)
- `opened_at`, `closed_at` (timestamptz)
- `metadata` (jsonb)

`student_notes`
- `id` (uuid, pk)
- `student_id` (uuid, indexed)
- `admin_id` (uuid, indexed)
- `note_type` (enum: `support|academic|billing|internal`)
- `body` (text)
- `visibility` (enum: `private_ops|admin_only`)
- `created_at`

`student_interventions`
- `id` (uuid, pk)
- `student_id` (uuid, indexed)
- `source` (enum: `rule_engine|manual|mentor`)
- `reason` (text)
- `owner_admin_id` (uuid, nullable)
- `status` (enum: `new|in_progress|resolved|escalated`)
- `due_at` (timestamptz, nullable)
- `resolved_at` (timestamptz, nullable)

`student_assignments`
- `id` (uuid, pk)
- `student_id` (uuid, indexed)
- `content_type` (enum: `video|pdf|test|module|track`)
- `content_id` (uuid, indexed)
- `assigned_by_admin_id` (uuid)
- `deadline_at` (timestamptz, nullable)
- `state` (enum: `assigned|started|completed|overdue`)

`admin_actions_audit`
- `id` (uuid, pk)
- `actor_admin_id` (uuid, indexed)
- `target_student_id` (uuid, indexed)
- `action_type` (text, indexed)
- `reason` (text)
- `before_state` (jsonb)
- `after_state` (jsonb)
- `request_id` (text)
- `ip` (inet, nullable)
- `user_agent` (text, nullable)
- `created_at` (timestamptz, indexed)

Recommended read model tables (optional for scale):
- `student_ops_snapshot`
- `student_risk_scores`
- `student_activity_rolling_7d`

### 15.4 API Contract (Admin)

Directory and profile:
- `GET /api/admin/students?query=&status=&cohort=&risk=&subscription=&page=&limit=&sort=`
- `GET /api/admin/students/:studentId/profile`
- `GET /api/admin/students/:studentId/activity?cursor=`

Flags/notes/interventions:
- `POST /api/admin/students/:studentId/flags`
- `PATCH /api/admin/students/:studentId/flags/:flagId`
- `POST /api/admin/students/:studentId/notes`
- `GET /api/admin/interventions?status=&owner=&severity=&page=`
- `PATCH /api/admin/interventions/:interventionId`

Operational actions:
- `POST /api/admin/students/:studentId/actions/activate`
- `POST /api/admin/students/:studentId/actions/suspend`
- `POST /api/admin/students/:studentId/actions/force-logout`
- `POST /api/admin/students/:studentId/actions/reset-password-link`
- `POST /api/admin/students/:studentId/assignments`

Bulk actions:
- `POST /api/admin/students/bulk-actions`
  - body: `{ studentIds: [], actionType, payload, reason }`
  - returns `jobId` for async status tracking.
- `GET /api/admin/jobs/:jobId`

CSV export:
- `POST /api/admin/students/export`
  - async export job + signed download URL.

### 15.5 Business Rules and Guardrails

1. Require `reason` for all sensitive actions (`suspend`, `unlock`, `override`, `force-logout`).
2. Restrict destructive actions by role (see RBAC matrix below).
3. Enforce idempotency for action endpoints using `X-Idempotency-Key`.
4. Always write audit rows for mutation endpoints in the same transaction.
5. Do not hard-delete notes/interventions; use soft-close/archive semantics.

### 15.6 Role-Based Access Control (RBAC)

Roles:
- `support_agent`
- `ops_manager`
- `super_admin`

Minimum permission policy:
- `support_agent`: read directory/profile, add notes, open intervention.
- `ops_manager`: all support permissions + assignment actions + non-destructive account actions.
- `super_admin`: all actions including suspend/reactivate, bulk critical actions, export PII-rich datasets.

Field-level access:
- PII fields (`phone`, billing identifiers) masked unless permitted.
- Audit trail read access restricted to managerial roles.

### 15.7 Frontend Implementation (Admin React)

Primary screens:
1. `AdminStudentsPage`
    - server-side table with query-state in URL.
    - sticky filters, quick chips, saved views.

2. `AdminStudentProfilePage` (or drawer)
    - tabs: `Overview`, `Learning`, `Billing`, `Timeline`, `Notes`, `Interventions`.
    - action bar with guarded action buttons.

3. `AdminInterventionsPage`
    - queue board/list by status with owner filters and SLA badges.

Suggested frontend data layer:
- React Query for REST snapshots.
- SSE/WebSocket hook for delta updates:
  - online state,
  - intervention changes,
  - latest activity ping.

UX guardrails:
- confirmation modal for high-impact actions,
- inline rationale input where required,
- optimistic UI only for reversible actions.

### 15.8 Realtime Architecture

Event producers:
- auth events,
- learning progress events,
- payments/subscription events,
- admin mutation events.

Pipeline:
1. append domain event,
2. update read models,
3. publish admin delta to SSE/WebSocket channels (`students`, `interventions`, `alerts`).

Frontend behavior:
- snapshot on load,
- patch with deltas,
- reconnect with backoff,
- show `Live`/`Reconnecting` indicators.

### 15.9 Observability and Operations

Metrics:
- `admin_student_query_p95_ms`
- `admin_action_write_p95_ms`
- `intervention_open_count`
- `bulk_job_failure_rate`
- `audit_write_failure_rate`
- realtime connection health and stream lag

Alerts:
- elevated mutation failure rate,
- missing audit writes,
- export job backlog,
- realtime disconnect spikes.

Logs/tracing:
- request tracing with `request_id`,
- structured action logs including `actor`, `target`, `action_type`.

### 15.10 Security and Compliance

1. Enforce SSO/MFA for admin accounts.
2. Session hardening for admin panel (shorter TTL, IP/device risk checks).
3. Encrypt sensitive fields at rest where required.
4. Record immutable audit logs and protect against tampering.
5. Add privacy-safe defaults for exports and profile views.

### 15.11 Delivery Roadmap (Execution Order)

Phase A (Foundation)
1. Implement core tables + migrations.
2. Build student directory + profile read APIs.
3. Render frontend directory with filters and profile panel.

Phase B (Operations)
1. Add mutation endpoints (notes, flags, assignments, account actions).
2. Add audit logging and reason enforcement.
3. Add intervention queue and ownership workflow.

Phase C (Scale + Realtime)
1. Introduce read models and async bulk job pipeline.
2. Add SSE/WebSocket updates across admin student ops views.
3. Add observability dashboards and alerting.

### 15.12 Test Strategy

Backend tests:
- RBAC matrix enforcement,
- audit row persistence for every mutation,
- idempotency behavior,
- transactional integrity for action + audit writes,
- bulk action partial-failure handling.

Frontend tests:
- filter/query-state behavior,
- guarded action flows (reason + confirmation),
- optimistic update rollbacks,
- realtime patch handling and reconnect state.

Integration/load tests:
- high-cardinality student directory queries,
- concurrent admin mutations on same student,
- SSE/WebSocket fanout under peak ops usage.

With this plan, Admin Student Ops becomes a production-safe operational system: fast for daily support workflows, secure for sensitive actions, and auditable for compliance and accountability.

### 15.13 Screen-by-Screen Metric Mapping (Current UI)

This subsection maps every visible Student Ops element (as currently shown in `AdminStudentsPage`) to backend and DB implementation so there is no ambiguity during full-stack build.

#### A) KPI Strip (Top Cards)

1. **Total Students**
     - UI meaning: count of all students visible to the admin tenant/scope.
     - Backend source: `COUNT(*) FROM students WHERE tenant_id = :tenantId AND deleted_at IS NULL`.
     - Update cadence: near-real-time (refresh every 60s + push deltas).

2. **Active Today**
     - UI meaning: students with at least one learning/auth activity in last 24h and same UTC day boundary.
     - Backend source:
         - event table (`student_activity_events`) with `event_ts >= date_trunc('day', now())`.
         - optional cached read model (`student_activity_rolling_1d`).
     - Edge rule: if admin uses local timezone dashboards, compute by tenant timezone, not server timezone.

3. **At-Risk (High/Critical)**
     - UI meaning: count of students where computed risk band is `high|critical`.
     - Backend source: `student_risk_scores.risk_band` read model.
     - Recompute policy: every 5–15 minutes, plus immediate recompute on major events (score drop, inactivity burst, payment failure).

4. **Open Interventions**
     - UI meaning: interventions where status is not resolved.
     - Backend source:
         - `COUNT(*) FROM student_interventions WHERE status IN ('new','in_progress','escalated')`.
     - SLA support: include overdue count as secondary metric in next iteration.

5. **Suspended**
     - UI meaning: students currently suspended from platform access.
     - Backend source: `students.status = 'suspended'` (or account status projection).

#### B) Directory Summary

6. **"N matching students"**
     - UI meaning: result count after applying all filters/search.
     - Backend source:
         - `GET /api/admin/students` returns `{ rows, total, filteredTotal }`.
     - Pagination note:
         - `total` = full population in scope.
         - `filteredTotal` = count after current filter predicates.

#### C) Student Table Columns

7. **Name + Email**
     - DB: `students.full_name`, `students.email`.
     - Search index: trigram/full-text on name + case-insensitive prefix on email.

8. **Cohort**
     - DB: `cohorts.name`, joined via `students.cohort_id`.

9. **Status Chip** (`active/inactive/suspended/pending`)
     - DB: `students.status`.
     - Mutation path: admin action endpoints update status + audit row.

10. **Risk Chip** (`low/medium/high/critical`)
        - DB/read model: `student_risk_scores.risk_band`.
        - Not manually typed by admin (except overrides with expiry).

11. **Subscription** (`trial/active/past_due/canceled`)
        - DB: `student_subscriptions.state` (latest effective row).
        - Source-of-truth integration: payment provider webhooks update this state.

12. **Avg Score**
        - DB/read model:
            - aggregate from `student_test_attempts` over configured window (e.g., last 30 days),
            - persisted in `student_ops_snapshot.avg_score_30d`.

13. **Last Active**
        - DB/read model:
            - max event timestamp from `student_activity_events`,
            - denormalized to `student_ops_snapshot.last_active_at`.
        - UI formatting: relative time derived client-side from server timestamp.

#### D) Right Panel Student Profile Analytics

14. **Risk Badge**
        - comes from same `risk_band` model; must be consistent with table row.
        - consistency rule: both sourced from same API payload to avoid mismatch.

15. **Meta fields (cohort, roadmap, onboarding, phone)**
        - `cohort`: cohorts table.
        - `roadmap stage`: `student_roadmap_progress.current_stage_label`.
        - `onboarding`: `students.onboarding_status`.
        - `phone`: `students.phone` (PII-masked by role policy).

16. **Video Progress bar**
        - computed from `video_progress` aggregated by assigned curriculum scope.
        - formula (example):
            $$
            video\_progress\_pct = \frac{\sum completed\_video\_units}{\sum assigned\_video\_units} \times 100
            $$

17. **PDF Progress bar**
        - computed from `document_progress` (see section 14).
        - formula (example):
            $$
            pdf\_progress\_pct = \frac{\sum completed\_document\_units}{\sum assigned\_document\_units} \times 100
            $$

18. **Test Completion bar**
        - derived from assigned tests vs completed tests (or question-bank targets).
        - formula:
            $$
            test\_completion\_pct = \frac{completed\_assigned\_tests}{total\_assigned\_tests} \times 100
            $$

#### E) Ops Workflow Blocks

19. **Admin Actions panel**
        - actions shown in UI:
            - suspend/reactivate account,
            - force logout,
            - create intervention.
        - all actions must:
            - require permission,
            - accept `reason`,
            - write to `admin_actions_audit`,
            - publish realtime event.

20. **Internal Notes list**
        - DB: `student_notes`.
        - write endpoint: `POST /api/admin/students/:id/notes`.
        - order: newest first by `created_at`.

21. **Interventions list**
        - DB: `student_interventions`.
        - show: title, status, owner, due date.
        - queue linkage: same object appears in interventions board.

22. **Recent Activity timeline**
        - DB source: `student_activity_events` union selected admin action events.
        - UI renders latest N events (currently 6 in frontend).
        - should support cursor pagination for deep history.

### 15.14 Backend Analytics Computation Plan (Minute-Level)

To support “minute analytics” without heavy query load, implement a dual-path model:

1. **Hot path (stream updates, 15–60s):**
     - consume domain events from queue (`auth`, `learning`, `billing`, `ops`),
     - increment counters in Redis/materialized cache,
     - push deltas to connected admin clients via SSE/WebSocket.

2. **Warm path (batch reconciliation, every 5–15m):**
     - recalculate snapshot metrics from canonical DB,
     - compare with hot counters,
     - repair drift and republish corrected snapshot.

3. **Cold path (daily rebuild):**
     - nightly full recomputation of `student_ops_snapshot` and `student_risk_scores`.

Recommended workers:
- `student-activity-aggregator`
- `student-risk-scorer`
- `intervention-sla-worker`
- `subscription-state-sync-worker`

### 15.15 API Response Shapes (Recommended)

`GET /api/admin/students`
- response:
    - `rows[]` (table rows with profile summary fields),
    - `total`, `filteredTotal`,
    - `kpis` (total, activeToday, atRisk, openInterventions, suspended),
    - `serverTime`, `snapshotVersion`.

`GET /api/admin/students/:id/profile`
- response:
    - identity/meta,
    - progress metrics (`videoProgressPct`, `pdfProgressPct`, `testCompletionPct`),
    - `notes[]`, `interventions[]`,
    - `recentActivity[]`.

`GET /api/admin/students/stream` (SSE)
- event types:
    - `kpi.updated`,
    - `student.updated`,
    - `intervention.updated`,
    - `note.created`,
    - `activity.appended`.

### 15.16 DB/Read-Model Additions for Current UI

Add/ensure these read-model tables for fast page loads:

`student_ops_snapshot`
- one row per student + tenant,
- columns:
    - `student_id`, `tenant_id`,
    - `risk_band`,
    - `subscription_state`,
    - `avg_score_30d`,
    - `last_active_at`,
    - `video_progress_pct`, `pdf_progress_pct`, `test_completion_pct`,
    - `open_interventions_count`,
    - `updated_at`.

`student_ops_kpi_snapshot`
- one row per tenant/time window,
- columns:
    - `tenant_id`, `window_start`,
    - `total_students`, `active_today`, `at_risk_count`, `open_interventions`, `suspended_count`,
    - `updated_at`.

Indexes:
- on `student_ops_snapshot(tenant_id, risk_band, subscription_state, last_active_at)`
- on `student_interventions(student_id, status, due_at)`
- on `student_activity_events(student_id, event_ts desc)`

### 15.17 Monitoring and Alerting for Each Analytic

Metric correctness monitors:
1. `kpi_drift_active_today` = abs(hot_counter - batch_recompute)
2. `kpi_drift_at_risk`
3. `kpi_drift_open_interventions`
4. `snapshot_staleness_seconds`
5. `risk_score_compute_lag_seconds`

Operational monitors:
1. `student_stream_connected_clients`
2. `student_stream_reconnect_rate`
3. `student_profile_query_p95_ms`
4. `student_directory_query_p95_ms`
5. `admin_action_failure_rate`
6. `audit_write_failure_rate`

Alerts (example thresholds):
- snapshot staleness > 180s for 5m,
- KPI drift > 3% for two consecutive reconciliations,
- profile query p95 > 800ms,
- stream reconnect rate spike > baseline × 3,
- any non-zero audit write failures over 5m.

### 15.18 Frontend State Strategy for This Page

Use three query domains:
1. `students:list` (filters + pagination + KPI bundle)
2. `students:profile:{id}`
3. `students:stream` (SSE/WebSocket patches)

Patch rules:
- apply stream deltas to cache,
- if delta version gap detected, trigger full refetch,
- preserve selected student where possible.

UX fallbacks:
- show stale badge when snapshot age > 2 minutes,
- disable risky actions while stream disconnected + stale data.

### 15.19 Action Lifecycle (Suspend Example)

1. Admin clicks suspend with reason.
2. Frontend calls `POST /actions/suspend` with idempotency key.
3. Backend transaction:
     - update `students.status`,
     - append `admin_actions_audit`,
     - append domain event.
4. Worker updates read models.
5. Stream emits `student.updated` + `kpi.updated`.
6. Frontend reflects row/status chip, profile badge, KPI changes.

### 15.20 Data Freshness and Consistency Contract

Define and document SLOs:
- directory/profile snapshot freshness: < 60s,
- action-to-UI propagation: p95 < 5s,
- risk recomputation freshness: < 15m,
- KPI drift after reconciliation: < 1% steady-state.

This keeps expectations explicit for both product and engineering.

### 15.21 Expanded Test Matrix (Minute Analytics + Ops)

Backend:
- verify KPI formulas against fixture datasets,
- verify drift correction reconciles hot vs canonical counters,
- verify action side effects: status + audit + event,
- verify idempotent retries do not double-apply actions.

Frontend:
- verify filters produce expected query params,
- verify KPI cards update after stream deltas,
- verify profile bars match backend percent values,
- verify notes/interventions/activity lists stay ordered by newest-first.

End-to-end:
- create intervention → observe KPI and profile change within SLA,
- suspend student → row chip, profile badge, and KPI update,
- simulate stream disconnect/reconnect and ensure cache resync.

With these additions, every Student Ops analytic currently shown in the UI has a defined data contract, computation path, monitoring strategy, and operational lifecycle for production implementation.

## 16) ADMIN METRICS + FINANCIALS + COMMENTS IMPLEMENTATION PLAN (PRODUCTION)

This section documents the complete implementation plan for the Admin Metrics, Admin Financials, and Comment Moderation capabilities that were built in frontend demo mode and then refined to stay tightly aligned with `docs/description.md`.

It also includes the student-side comment submission/display flow that feeds moderation.

### 16.1 Scope Alignment (Description-First)

This plan is intentionally constrained to the requirements in Module E of `docs/description.md`:

1. **Global Metrics & Averages**
2. **Financial & Subscriptions Overview**
3. **Ability to Control Display of Comments** (admin show/hide)

Anything beyond those three is optional and should not block delivery.

### 16.2 What Is Implemented in Frontend Demo Today

Implemented pages:

1. `/admin/metrics`
         - KPI strip (global engagement/performance snapshot)
         - Engagement trend chart
         - Score distribution chart
         - Weekly activity snapshot table

2. `/admin/financials`
         - KPI strip for revenue/subscription health
         - Revenue + MRR trend chart
         - Subscription plan mix chart
         - Payment reconciliation feed (invoice status table)

3. `/admin/comments`
         - Moderation queue with filters
         - Comment detail panel
         - Single moderation action: **Show/Hide**
         - Moderation action history log

4. `/student/comments`
         - Student comment submission form
         - Student-visible comments list (visible only)
         - Copy and UX aligned to “comments” terminology

### 16.3 Data Contracts (Current Frontend Dummy Mode)

Core frontend dummy data source:

- `/frontend/src/data/adminMetricsFinancials.ts`
- `/frontend/src/data/adminCommentModeration.ts`

Current moderation model:

```ts
type ModerationStatus = 'visible' | 'hidden'

interface ModerationComment {
    id: string
    author: string
    text: string
    status: ModerationStatus
    createdAt: string
    actionHistory: ModerationActionLog[]
}
```

Important: There is no status complexity beyond `visible|hidden`.

### 16.4 Admin Metrics Page Plan (`/admin/metrics`)

#### A) KPI Semantics

Keep KPIs global and operationally useful:

1. Daily Active Users
2. Practice Tests Submitted (7d)
3. Study Sessions Completed (7d)
4. Avg Test Accuracy

#### B) Visual Panels

1. **Engagement Trend** (line)
2. **Score Distribution** (bar)
3. **Weekly Activity Snapshot** (table)

#### C) Production API Mapping

- `GET /api/admin/metrics/summary?range=30d`
- `GET /api/admin/metrics/engagement?range=30d`
- `GET /api/admin/metrics/score-distribution?range=30d`
- `GET /api/admin/metrics/weekly-activity?range=30d`

### 16.5 Admin Financials Page Plan (`/admin/financials`)

#### A) KPI Scope (Refined)

To stay practical and spec-safe, financial KPIs now focus on revenue and subscription state.

Current intended KPI set:

1. Monthly Recurring Revenue (MRR)
2. Annual Run Rate (ARR)
3. Active Paid Subscribers

Removed to reduce implementation complexity and scope drift:

- Net Churn Rate
- Refund Rate
- Failed Payments (as top KPI)

Note: failed/refunded states still appear in invoice table where useful.

#### B) Visual Panels

1. **Revenue + MRR Trend**
2. **Subscription Plan Mix**
3. **Payment Reconciliation Feed**

#### C) Production API Mapping

- `GET /api/admin/financials/summary?range=30d`
- `GET /api/admin/financials/revenue-trend?range=6m`
- `GET /api/admin/financials/plan-mix?range=30d`
- `GET /api/admin/financials/invoices?status=&cursor=`

### 16.6 Admin Comment Moderation Plan (`/admin/comments`)

#### A) Product Rule (Non-Negotiable)

From `docs/description.md`:

> Admin can choose which comments are shown and which are hidden.

Therefore moderation action set is intentionally minimal:

1. Show Comment
2. Hide Comment

No extra moderation states (escalated, approved, triaged) are required for MVP.

#### B) UI Contract

1. Queue with search + status filter
2. Selected comment detail
3. Show/Hide toggle button
4. Action history list

#### C) Production API Mapping

- `GET /api/admin/comments?status=visible|hidden|all&query=&cursor=`
- `PATCH /api/admin/comments/:commentId/visibility`
    - payload: `{ "status": "visible" | "hidden", "reason": "..." }`
- `GET /api/admin/comments/:commentId/history`

### 16.7 Student Comments Flow Plan (`/student/comments`)

#### A) Student UX

1. Student posts comment (`name + text` in demo mode)
2. Comment appears in visible list
3. Admin can later hide it from moderation page
4. Hidden comments are excluded from student-visible list

#### B) Production API Mapping

- `POST /api/student/comments`
    - payload: `{ "text": "..." }` (author should come from auth context in production)
- `GET /api/student/comments?status=visible`

#### C) Ownership Rules

1. Student can create comments
2. Student can view visible comments
3. Admin controls visibility globally

### 16.8 Database Plan (Production)

Recommended core table:

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('visible','hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recommended audit table:

```sql
CREATE TABLE comment_moderation_actions (
    id UUID PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id),
    actor_admin_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('show','hide')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 16.9 End-to-End Action Lifecycle (Hide Comment)

1. Admin clicks **Hide Comment** in `/admin/comments`.
2. Frontend sends `PATCH /api/admin/comments/:id/visibility`.
3. Backend transaction:
         - updates `comments.status = 'hidden'`
         - inserts audit row in `comment_moderation_actions`
4. Student comments API excludes hidden comment.
5. Admin queue reflects updated visibility immediately.

### 16.10 Realtime (Optional Upgrade)

Not required for MVP, but easy extension:

1. Publish moderation events on show/hide.
2. Push updates over SSE/WebSocket to admin + student clients.
3. Auto-refresh queue/list without manual reload.

### 16.11 Testing Checklist

#### Frontend

1. Metrics and Financials pages render on desktop/mobile.
2. Financial KPI cards match refined set (no churn/refund/failed KPI cards).
3. Student comment page submits and renders new comment.
4. Admin show/hide updates status and history in UI.

#### Backend (when implemented)

1. Visibility patch endpoint enforces admin-only access.
2. Hidden comments never appear in student-visible endpoint.
3. Every moderation action writes audit row.
4. Filters/search return stable, paginated results.

### 16.12 Delivery Phases

Phase A (already done in frontend demo):
1. Admin Metrics UI + dummy data
2. Admin Financials UI + dummy data
3. Admin Comment Moderation (show/hide only)
4. Student Comments page and left-nav route

Phase B (backend wiring):
1. Add comments and moderation tables
2. Add admin/student comments endpoints
3. Replace dummy data with API fetching

Phase C (operational hardening):
1. Add RBAC + immutable audit pipeline
2. Add realtime updates (optional)
3. Add observability, alerts, and load tests

With this plan, Admin Metrics + Financials + Comments remain practical, spec-aligned, and straightforward to ship to production without overengineering.
