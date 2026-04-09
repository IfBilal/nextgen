# NextGen USMLE - System Architecture & Workflow

> **Related Documents:**
> - `/docs/description.md` - Product vision and business requirements
> - `/docs/implementation_plan.md` - Complete frontend implementation guide
> - `/docs/dashboard_plan.md` - Dashboard UI specifications
> - `/docs/dashboard/` - Visual references and implementation details

## 📋 Table of Contents
1. [Overview](#overview)
2. [User Journey](#user-journey)
3. [Core Features Integration](#core-features-integration)
4. [Roadmap System](#roadmap-system)
5. [Question Bank Integration](#question-bank-integration)
6. [AI Tutor Integration](#ai-tutor-integration)
7. [Progress Tracking](#progress-tracking)
8. [Data Flow](#data-flow)
9. [Backend API Structure](#backend-api-structure)
10. [Premium Features](#premium-features)

---

## 🎯 Overview

NextGen USMLE is an **AI-powered adaptive learning platform** for medical exam preparation (USMLE Step 1/2/3, MCCQE, specialty boards). The system dynamically adjusts study plans based on user performance, creates personalized question sets, and provides intelligent tutoring.

**Core Philosophy:**
- **Adaptive Learning**: Roadmap adjusts based on performance
- **Context-Aware**: Tests, content, and AI insights tied to current roadmap phase
- **Progress-Driven**: Everything updates based on real user activity
- **RAG Architecture**: AI retrieves from verified content (PDFs/videos), never hallucinates
- **Subscription Model**: Tiered access (Basic/Pro/Elite) with premium features

**Key Differentiators:**
- Active AI diagnosis of learning gaps (not just subject scores)
- Video deep-linking with timestamps
- Dynamic roadmap recalibration
- Study partner matchmaking
- Admin moderation of community comments

---

## 🚀 User Journey

### First-Time User Flow
```
Login/Signup
    ↓
Onboarding (4 steps)
    ├─ Choose Exam (USMLE Step 1/2/3)
    ├─ Set Exam Date
    ├─ Set Daily Hours (slider)
    └─ Select Weak Subjects
    ↓
AI Generates Personalized Roadmap
    ↓
Roadmap Preview (12-week timeline)
    ↓
Dashboard (Home)
```

### Returning User Flow
```
Login
    ↓
Dashboard (Home)
    ├─ See today's sessions
    ├─ View progress stats
    └─ Navigate to features
```

---

## 🔄 Core Features Integration

### 1. **Dashboard** (Home Page)
**Purpose**: Daily overview and progress tracking

**Shows:**
- Greeting + Exam countdown
- Overall score (donut chart: Correct %)
- QBank usage (donut chart: Used %)
- Score breakdown table
- QBank stats table

**NOT showing** (separate pages):
- Today's Plan → "My Roadmap" page
- AI Insights → "AI Tutor" page
- Recent Tests → "Analytics" page

### 2. **My Roadmap** (Study Plan)
**Purpose**: Shows the adaptive study plan

**Current Week View:**
```
Week 3 (Apr 18 - Apr 24) ← Current
├─ Monday: Pathology - Immunopathology (2h) ✓
├─ Tuesday: Physiology - Respiratory (2h) ✓
├─ Wednesday: Pharmacology - CNS Drugs (2h) ← TODAY
├─ Thursday: Microbiology (2h)
├─ Friday: Pathology Advanced (2h)
├─ Saturday: Week 3 Practice (3h)
└─ Sunday: Rest (1h)
```

**Features:**
- ✅ Mark sessions as complete
- 📊 Progress bar per week
- 🔄 AI adjustments based on performance
- 📅 Upcoming weeks preview

### 3. **Question Bank** (Practice)
**Purpose**: Create and take practice tests

**Test Creation Options:**
```
┌─────────────────────────────────┐
│ Create New Test                 │
├─────────────────────────────────┤
│ Mode:                           │
│  ○ Based on Today's Roadmap     │ ← Smart Default
│  ○ Custom (manual selection)    │
│  ○ Weak Areas Only              │
│  ○ Mock Exam                    │
├─────────────────────────────────┤
│ Subject: [Auto from roadmap]    │
│ Topics: [Auto selected]         │
│ # Questions: 40                 │
│ Type: ○ Tutor  ○ Timed         │
└─────────────────────────────────┘
```

**How it works with Roadmap:**
- If user is on "Pathology - Immunopathology" today
- **Default test** = 40 questions on Immunopathology (Tutor mode)
- User can override and create custom tests anytime

### 4. **AI Tutor**
**Purpose**: Intelligent tutoring and insights

**Features:**
- Chat with AI about any medical topic
- Get explanations for incorrect answers
- Ask "Why did I get this wrong?"
- Request concept clarifications

**Roadmap Integration:**
- AI knows what user is studying today
- Proactive insights: "Your renal scores dropped 14% — focus on clinical reasoning"

---

## 🗺️ Roadmap System

### Initial Generation
When user completes onboarding:

```javascript
POST /api/roadmap/generate
{
  examType: "USMLE Step 1",
  examDate: "2025-06-20",
  hoursPerDay: 3,
  weakSubjects: ["Pathology", "Microbiology"]
}

Response:
{
  roadmapId: "rm_123",
  totalWeeks: 12,
  sessions: [
    // 84 daily sessions (12 weeks × 7 days)
    {
      week: 1,
      day: "Monday",
      date: "2024-04-04",
      subject: "Pathology",
      topic: "Cell Injury & Adaptation",
      hours: 2,
      content: [...],
      questions: [...],
      status: "upcoming"
    }
  ],
  phases: [
    { weeks: [1-3], phase: "Foundation" },
    { weeks: [4-6], phase: "Integration" },
    { weeks: [7-9], phase: "Practice" },
    { weeks: [10-12], phase: "Mock Exams" }
  ]
}
```

### Dynamic Adaptation

**Trigger:** User completes a test or weekly review

```javascript
// User takes test on Pathology
POST /api/tests/submit
{
  testId: "test_456",
  answers: [...],
  roadmapSessionId: "session_123" // Links test to roadmap
}

// Backend analyzes performance
Analysis:
{
  subject: "Pathology",
  topic: "Immunopathology",
  score: 65%, // Below threshold (75%)
  weakAreas: ["Hypersensitivity", "Autoimmune disorders"]
}

// AI adjusts roadmap
POST /api/roadmap/adapt (automatic)
{
  roadmapId: "rm_123",
  trigger: "low_performance",
  analysis: {...}
}

Response (Updated Roadmap):
{
  changes: [
    {
      week: 4,
      day: "Friday",
      old: "Pathology - Neoplasia Advanced",
      new: "Pathology - Immunopathology Review" // ← AI added review
    },
    {
      week: 5,
      day: "Wednesday",
      new: "Pathology - Hypersensitivity Deep Dive" // ← New session
    }
  ],
  message: "Added 2 sessions to strengthen Immunopathology"
}
```

### Adaptation Logic

**Performance Thresholds:**
- **75%+** → Continue as planned
- **60-74%** → Add 1 review session
- **<60%** → Add 2 review sessions + reduce new topics

**Adaptation Types:**
1. **Add Review Sessions**: Extra time on weak topics
2. **Reorder Topics**: Move challenging topics earlier
3. **Extend Weeks**: Add buffer weeks if behind
4. **Intensity Adjustment**: Reduce hours/day if burnout detected

---

## 📚 Question Bank Integration

### Roadmap-Linked Tests

**The Default Flow (Recommended):**
When a user opens the Question Bank, the system **intelligently suggests** a test based on their current roadmap session.

**Scenario 1: Following Today's Roadmap**
```
User's Today Session: "Pharmacology - CNS Drugs (2 hours)"

User navigates to /student/qbank

System auto-suggests:
┌────────────────────────────────────┐
│ 📋 Recommended Test                │
├────────────────────────────────────┤
│ Based on today's roadmap session   │
│                                    │
│ Subject: Pharmacology              │
│ Topic: CNS Drugs                   │
│ Questions: 40 (Recommended)        │
│ Mode: Tutor (Best for learning)    │
│                                    │
│ This aligns with:                  │
│ Week 3, Day 3 - CNS Drugs (2h)     │
│                                    │
│ [Start Test]  [Customize]          │
└────────────────────────────────────┘
```

**Why this matters:**
1. **Reduces friction**: One click to start relevant practice
2. **Maintains context**: Test results link back to roadmap session
3. **Enables adaptation**: AI knows which roadmap session the test validates
4. **Tracks completion**: Marks roadmap session as "practiced"

**Scenario 2: Custom Test (User has specific needs)**
```
User clicks "Customize" or "Create Custom Test"

┌────────────────────────────────────────┐
│ Custom Test Builder                    │
├────────────────────────────────────────┤
│ Test Name: [My Renal Review]          │
│                                        │
│ Mode:                                  │
│  ○ Tutor Mode (instant feedback)       │
│  ● Timed Mode (1.5 min/question)       │
│  ○ Mock Exam (80Q, full simulation)    │
│                                        │
│ Subject Selection:                     │
│  ☑ Pathology                          │
│  ☐ Pharmacology                       │
│  ☑ Physiology                         │
│  ☐ Biochemistry                       │
│  [Select All] [Deselect All]          │
│                                        │
│ Topic Filters:                         │
│  [Multi-select dropdown]               │
│  Selected: Renal Pathology,            │
│            Renal Physiology            │
│                                        │
│ Question Pool:                         │
│  ○ All Questions                       │
│  ● Unused Only (recommended)           │
│  ○ Previously Incorrect                │
│  ○ Flagged Questions                   │
│                                        │
│ # Questions: ━━━●━━━━━━ 60            │
│                                        │
│ Difficulty: ○ All  ○ Hard  ○ Mixed    │
│                                        │
│ [Create Test]  [Save as Template]      │
└────────────────────────────────────────┘
```

**Advanced Features:**
- **Save Templates**: "Renal Deep Dive" template for quick re-use
- **Weak Areas Auto-Fill**: Button to auto-select subjects with <70% score
- **Mock Exam Mode**: Fixed 80 questions, mixed subjects, 110 min timer

### Test Modes Explained

**1. Tutor Mode** (Learning focused)
```
Answer → Immediate feedback
         ↓
      ✅ or ❌
         ↓
    Explanation panel appears:
    - Why correct answer is right
    - Why each wrong answer is wrong
    - Related video timestamp
    - Diagram (if relevant)
    - "Ask AI Tutor" button
         ↓
    User clicks "Next Question"
         ↓
    Repeat
```

**Use case**: Learning new topics, reviewing weak areas

**2. Timed Mode** (Exam simulation lite)
```
1.5 min countdown per question
Answer → Mark for review (optional)
         ↓
    No immediate feedback
         ↓
    Next question
         ↓
    Repeat until all answered or time expires
         ↓
    Review page (see all answers + explanations)
```

**Use case**: Building speed, exam day preparation

**3. Mock Exam Mode** (Full simulation)
```
80 questions
110 minutes total (not per question)
Mixed subjects (weighted by exam blueprint)
No pause, no exit (unless emergency)
    ↓
Submit → Comprehensive report:
         - Overall score
         - Per-subject breakdown
         - Time management analysis
         - Percentile vs cohort
         - Weak areas flagged
    ↓
AI generates roadmap adjustments
```

**Use case**: Weekly/biweekly progress checks, final prep

### Test Completion Flow (Critical for Integration)

```
┌──────────────────────────────────────────────┐
│ 1. User Completes Test                       │
│    - Answers all questions                   │
│    - Clicks "Submit Test"                    │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 2. Frontend → Backend                        │
│    POST /api/tests/:testId/submit            │
│    {                                         │
│      testId: "test_789",                     │
│      answers: [                              │
│        {                                     │
│          questionId: "q_45",                 │
│          selectedChoice: "B",                │
│          timeSpent: 82, // seconds           │
│          flagged: false                      │
│        },                                    │
│        ...                                   │
│      ],                                      │
│      roadmapSessionId: "session_123", // ← KEY │
│      mode: "tutor"                           │
│    }                                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 3. Backend Processing                        │
│    a) Score Test                             │
│       - Compare answers to correct answers   │
│       - Calculate percentage                 │
│       - Track time per question              │
│                                              │
│    b) Update User Stats                      │
│       - Increment questionsAnswered          │
│       - Update overallScore (rolling avg)    │
│       - Update correct/incorrect counts      │
│       - Update QBank usage (%)               │
│                                              │
│    c) Link to Roadmap Session (if provided) │
│       - Mark session as "practiced"          │
│       - Store test score for that session    │
│       - Flag weak topics in session          │
│                                              │
│    d) Identify Weak Areas                    │
│       - Group incorrect by subject/topic     │
│       - Calculate per-topic accuracy         │
│       - Compare to user's historical avg     │
│                                              │
│    e) Save Test Record                       │
│       - Store complete test data             │
│       - Enable later review                  │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 4. AI Analysis (Async)                       │
│    Triggered if:                             │
│    - Score <75% on any topic                 │
│    - Mock exam completed                     │
│    - Weekly review test done                 │
│                                              │
│    AI analyzes:                              │
│    - Error patterns                          │
│    - Root cause (knowledge vs reasoning)     │
│    - Topic correlations                      │
│    - Generates recommendations               │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 5. Roadmap Adaptation (if needed)            │
│    POST /api/roadmap/adapt (automatic)       │
│    {                                         │
│      roadmapId: "rm_123",                    │
│      trigger: "low_performance",             │
│      testId: "test_789",                     │
│      analysis: {                             │
│        subject: "Pharmacology",              │
│        topic: "CNS Drugs",                   │
│        score: 65%,                           │
│        diagnosis: "clinical_reasoning_gap",  │
│        recommendation: "add_review_session"  │
│      }                                       │
│    }                                         │
│                                              │
│    Backend updates roadmap:                  │
│    - Adds review session next week           │
│    - Adjusts topic difficulty curve          │
│    - Generates insight card for dashboard    │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 6. Frontend Receives Results                 │
│    Response:                                 │
│    {                                         │
│      testId: "test_789",                     │
│      score: 72,                              │
│      correct: 29,                            │
│      incorrect: 11,                          │
│      timeSpent: 2280, // seconds             │
│      subjectBreakdown: {                     │
│        "Pharmacology": { score: 65, count: 20 }, │
│        "Physiology": { score: 85, count: 20 } │
│      },                                      │
│      weakAreas: [                            │
│        {                                     │
│          topic: "CNS Drugs",                 │
│          score: 60,                          │
│          recommendation: {                   │
│            video: {                          │
│              title: "Beta Blockers Overview", │
│              timestamp: "8:22"               │
│            },                                │
│            addedReviewSession: true,         │
│            message: "Added review on Week 4, Day 5" │
│          }                                   │
│        }                                     │
│      ],                                      │
│      roadmapUpdated: true,                   │
│      insight: {                              │
│        message: "Your CNS Drugs performance suggests...", │
│        actionable: true                      │
│      }                                       │
│    }                                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 7. User Sees Results Page                    │
│    /student/test-review/:testId              │
│                                              │
│    Displays:                                 │
│    - Score card (72%, 29/40)                 │
│    - Time taken (38 minutes)                 │
│    - vs Cohort avg (+4%)                     │
│    - Weak area callout (with video link)     │
│    - "Roadmap Updated" badge                 │
│    - Option to review each question          │
│    - "Retake" button                         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ 8. Dashboard Updates (Next Visit)            │
│    - Overall score: 74% → 76%                │
│    - Questions answered: 312 → 352           │
│    - QBank usage: 9% → 10.4%                 │
│    - New AI Insight card appears:            │
│      "Based on recent CNS test, review       │
│       scheduled for Week 4"                  │
│    - Recent tests list updated               │
└──────────────────────────────────────────────┘
```

### Why Roadmap Linking Matters

**Without linking:**
```
User takes Pharmacology test → Good score → But:
- System doesn't know WHICH topics were tested
- Can't mark roadmap session as "validated"
- AI can't adjust remaining roadmap intelligently
- Progress feels disconnected
```

**With linking:**
```
User takes test on "CNS Drugs" (today's roadmap topic)
     ↓
Test results link to: Week 3, Day 3, Session 2
     ↓
System knows:
- User practiced today's material ✓
- Performance on this specific topic: 65%
- Should add review session: Yes
- Mark roadmap session: "practiced, needs review"
     ↓
Next week's roadmap auto-adjusts
User sees coherent learning journey
```

---

## 🤖 AI Tutor Integration

### Context Awareness

The AI knows:
- Current roadmap session
- Recent test performance
- Weak subjects/topics
- Study phase (Foundation/Integration/Practice)

**Example Chat:**
```
User: "Why did I get this immunology question wrong?"

AI Context:
{
  currentSession: "Pathology - Immunopathology",
  recentTest: {
    subject: "Pathology",
    score: 65%,
    weakTopics: ["Type IV Hypersensitivity"]
  }
}

AI Response:
"You missed the key distinction between Type III and Type IV 
hypersensitivity. Since you're currently on Immunopathology 
in your roadmap, let's clarify:

Type III = Immune complex (antibody-mediated)
Type IV = T-cell mediated (delayed)

Your weak area is Type IV. I've flagged this for your roadmap 
— expect a focused review session next week.

Would you like a deep dive on T-cell responses?"
```

### Proactive Insights

**Dashboard AI Insight Card:**
```
┌─────────────────────────────────────┐
│ 🤖 AI Insight                       │
├─────────────────────────────────────┤
│ Your Renal Pathophysiology scores   │
│ dropped 14% this week. Root cause:  │
│ clinical reasoning gap — not        │
│ foundational knowledge.             │
│                                     │
│ Recommended:                        │
│ Watch: "Glomerulonephritis Overview"│
│ (Start at 14:22)                    │
│                                     │
│ [Ask AI Tutor] [Adjust Roadmap]    │
└─────────────────────────────────────┘
```

---

## 📊 Progress Tracking

### Key Metrics

**Dashboard Level:**
- Overall score (all-time correct %)
- QBank usage (questions used / total)
- Study streak (consecutive days)
- Weekly hours

**Roadmap Level:**
- Current week / total weeks
- Sessions completed / remaining
- Phase progress (Foundation → Integration → Practice → Mock)

**Subject Level:**
- Per-subject scores
- Topic mastery percentages
- Weak areas flagged

### Data Updates

**Real-time:**
- Test submission → immediate dashboard update
- Session completion → roadmap progress bar

**Periodic (Daily):**
- Streak calculation (midnight)
- Weekly summary (Sunday night)

**AI-Triggered:**
- Roadmap adaptations (after significant tests)
- Insights generation (weekly analysis)

---

## 🔌 Data Flow

### Component → Backend → Component

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Dashboard ← displays stats                        │
│      ↑                                              │
│      │ GET /api/dashboard                           │
│      │                                              │
│  Roadmap ← shows sessions                          │
│      ↑                                              │
│      │ GET /api/roadmap/:id                         │
│      │                                              │
│  QBank ← creates tests                             │
│      ↓                                              │
│      │ POST /api/tests/create                       │
│      │ POST /api/tests/submit                       │
│      │                                              │
└─────────────────────────────────────────────────────┘
           ↓                    ↑
    ┌──────────────────────────────────┐
    │         BACKEND API              │
    ├──────────────────────────────────┤
    │ Receives test results            │
    │ Analyzes performance             │
    │ Updates dashboard stats          │
    │ Triggers AI adaptation           │
    │ Generates insights               │
    └──────────────────────────────────┘
           ↓                    ↑
    ┌──────────────────────────────────┐
    │         DATABASE                 │
    ├──────────────────────────────────┤
    │ users                            │
    │ roadmaps                         │
    │ roadmap_sessions                 │
    │ tests                            │
    │ test_results                     │
    │ questions                        │
    │ user_progress                    │
    └──────────────────────────────────┘
```

---

## 🗄️ Backend API Structure

### Endpoints

#### Authentication
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

#### Onboarding & Roadmap
```
POST /api/onboarding              # Save onboarding data
POST /api/roadmap/generate        # Create initial roadmap
GET  /api/roadmap/:id             # Fetch user's roadmap
PUT  /api/roadmap/:id/session/:sessionId/complete  # Mark session done
POST /api/roadmap/adapt           # Trigger AI adaptation
```

#### Dashboard
```
GET /api/dashboard                # All dashboard data
  {
    stats: { overallScore, qbankUsage, streak, ... },
    todaySessions: [...],
    recentTests: [...],
    aiInsight: {...}
  }
```

#### Question Bank
```
GET  /api/questions/recommended   # Based on roadmap
POST /api/tests/create            # Create test
  {
    mode: "tutor" | "timed",
    source: "roadmap" | "custom" | "weak-areas",
    filters: { subjects, topics, count }
  }

GET  /api/tests/:id               # Get test questions
POST /api/tests/:id/submit        # Submit answers
  {
    testId,
    answers: [{ questionId, answerId, timeSpent }],
    roadmapSessionId (optional)
  }

GET  /api/tests/:id/results       # View results
```

#### AI Tutor
```
POST /api/ai/chat                 # Chat with AI
  {
    message: "Why did I get this wrong?",
    context: {
      questionId (optional),
      currentRoadmapSession (optional)
    }
  }

GET  /api/ai/insights             # Get proactive insights
```

#### Analytics
```
GET /api/analytics/overview       # Charts, trends
GET /api/analytics/subjects       # Per-subject breakdown
GET /api/analytics/weak-areas     # Flagged topics
```

---

## 🔄 Key Workflows

### Workflow 1: Daily Study Session (Complete Flow)

```
┌─────────────────────────────────────────────┐
│ Morning: User logs in                        │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Dashboard Shows:                             │
│ - "Good morning, Alex! 👋"                   │
│ - Today's plan: "Pharmacology - CNS Drugs"  │
│ - Study streak: 8 days 🔥                    │
│ - Overall score: 74%                         │
│                                              │
│ AI Insight card (if any):                    │
│ "You're on track! Keep momentum going."      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User clicks "My Roadmap"                     │
│                                              │
│ Roadmap Page Shows:                          │
│ Week 3 of 12 (22% complete)                  │
│                                              │
│ This Week:                                   │
│ ✅ Mon: Pathology (done)                     │
│ ✅ Tue: Physiology (done)                    │
│ 🔵 Wed: Pharmacology - CNS Drugs ← TODAY    │
│ ⬜ Thu: Microbiology (upcoming)              │
│ ⬜ Fri: Pathology Review (upcoming)          │
│ ⬜ Sat: Practice Test (upcoming)             │
│ ⬜ Sun: Rest                                 │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User reads/watches content:                  │
│ - Opens Content Hub                          │
│ - Watches "CNS Drugs" video (30 min)         │
│ - Reads PDF chapter (45 min)                 │
│ - Takes notes                                │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User clicks "Question Bank"                  │
│                                              │
│ QBank auto-suggests:                         │
│ "📋 Based on today's roadmap:                │
│  Pharmacology - CNS Drugs                    │
│  40 questions, Tutor mode"                   │
│                                              │
│ User clicks [Start Test]                     │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Test Session (Tutor Mode)                    │
│                                              │
│ Q1: Clinical vignette about beta-blocker...  │
│ User selects answer → Immediate feedback:    │
│ ✅ Correct! Explanation appears below.       │
│                                              │
│ Q2: Vignette about SSRI side effects...      │
│ User selects wrong answer → ❌ Feedback:     │
│ "Incorrect. Correct answer: C. Here's why..."│
│ - Full explanation                           │
│ - Video link: "SSRIs Deep Dive - 12:30"      │
│ - Diagram shown                              │
│                                              │
│ User continues → 40 questions total          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User clicks "Submit Test"                    │
│                                              │
│ Backend receives:                            │
│ {                                            │
│   testId: "test_456",                        │
│   answers: [...],                            │
│   roadmapSessionId: "week3_day3_session2",   │
│   mode: "tutor"                              │
│ }                                            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Backend Processing (1-2 seconds):            │
│                                              │
│ 1. Scores test: 32/40 = 80%                  │
│ 2. Updates user stats:                       │
│    - Overall score: 74% → 75%                │
│    - Questions answered: 312 → 352           │
│    - QBank usage: 9% → 10.4%                 │
│    - Pharmacology score: 72% → 76%           │
│                                              │
│ 3. Links to roadmap session:                 │
│    - Marks "Week 3, Day 3" as "practiced"    │
│    - Stores test score (80%) for session     │
│    - Status: "completed" ✅                  │
│                                              │
│ 4. Analyzes weak areas:                      │
│    - Beta-blockers: 4/5 correct (good)       │
│    - SSRIs: 2/5 correct (weak) ⚠️            │
│    - Benzodiazepines: 3/5 correct (ok)       │
│                                              │
│ 5. AI Decision:                              │
│    - SSRI performance <60% → Flag            │
│    - Check roadmap for SSRI review           │
│    - Week 5 has "Pharmacology Review"        │
│    - Decision: Add SSRI focus to that day    │
│    - Generate insight for dashboard          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Results Page Shows:                          │
│                                              │
│ ┌───────────────────────────────┐            │
│ │ Score: 80% (32/40)           │            │
│ │ Time: 52 minutes             │            │
│ │ vs Cohort: +6%               │            │
│ └───────────────────────────────┘            │
│                                              │
│ ⚠️ Weak Area Detected:                       │
│ "SSRIs: 2/5 correct. We've added extra       │
│  review time to Week 5, Day 3.               │
│  Recommended: Watch 'SSRI Mechanisms' (7:45)"│
│                                              │
│ ✅ Roadmap session marked complete           │
│                                              │
│ [Review Incorrect] [Retake] [Return to QB]   │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User clicks "Review Incorrect"               │
│                                              │
│ Shows 8 incorrect questions:                 │
│ Each with:                                   │
│ - Full question                              │
│ - Your answer (red)                          │
│ - Correct answer (green)                     │
│ - Explanation                                │
│ - Video deep-link                            │
│ - "Ask AI Tutor" button                      │
│                                              │
│ User clicks "Ask AI Tutor" on SSRI question  │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ AI Tutor Opens with Pre-Filled Context:      │
│                                              │
│ User: "Why did I get this SSRI question wrong?"│
│                                              │
│ AI (knows context from test):                │
│ "You selected Serotonin Syndrome, but the    │
│  question described Discontinuation Syndrome. │
│  Key difference: Serotonin Syndrome happens  │
│  with drug interaction (SSRI + MAOI),        │
│  while Discontinuation happens when stopping │
│  SSRI abruptly.                              │
│                                              │
│  Since you're on Week 3 focusing on CNS      │
│  Drugs, this aligns with your current study. │
│  I recommend reviewing 'SSRI Mechanisms'     │
│  video at timestamp 7:45.                    │
│                                              │
│  Would you like me to explain the difference │
│  in more detail?"                            │
│                                              │
│ 📄 Source: Pharmacology Ch.8, Pg 234         │
│ 🎥 See: SSRI Mechanisms - 7:45               │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ User Returns to Dashboard (End of Day)       │
│                                              │
│ Dashboard Now Shows:                         │
│ - Overall score: 75% (was 74%) ↑             │
│ - Questions answered: 352 (was 312)          │
│ - Study streak: 9 days 🔥 (incremented)      │
│ - Hours today: 2.5 hrs                       │
│                                              │
│ AI Insight (New):                            │
│ "🧠 Your CNS Drugs test showed 80% - great!  │
│  But SSRIs need focus. We've adjusted your   │
│  Week 5 schedule to include extra review."   │
│                                              │
│ Recent Tests:                                │
│ - Pharmacology · 80% · Tutor · Today [Review]│
│ - Pathology · 78% · Tutor · Apr 3            │
│ - Mixed · 65% · Timed · Apr 1                │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Next Day: User logs in                       │
│                                              │
│ Roadmap Shows:                               │
│ ✅ Wed: Pharmacology - CNS Drugs (80%)       │
│ 🔵 Thu: Microbiology ← NEW TODAY             │
│                                              │
│ Cycle continues...                           │
└─────────────────────────────────────────────┘
```

---

### Workflow 2: Poor Performance → AI Adaptation (Detailed)

```
1. User logs in
    ↓
2. Dashboard shows:
   "Today: Pharmacology - CNS Drugs (2h)"
    ↓
3. User clicks "My Roadmap" → sees today highlighted
    ↓
4. User clicks "Create Test" (auto-suggests CNS Drugs questions)
    ↓
5. User takes test (40 questions, Tutor mode)
    ↓
6. Submit → Backend:
   - Scores test
   - Updates dashboard (74% → 76%)
   - Links to roadmap session
   - Marks session as "completed"
    ↓
7. User sees results + option to review
    ↓
8. Next day: Roadmap advances to next session
```

### Workflow 2: Poor Performance → Adaptation

```
1. User scores 55% on Immunopathology test
    ↓
2. Backend detects below threshold (75%)
    ↓
3. AI analyzes:
   - Weak topics: Hypersensitivity Type IV, Autoimmune
   - Root cause: Clinical reasoning gap
    ↓
4. AI adapts roadmap:
   - Adds review session next week
   - Suggests content: Video on Type IV
    ↓
5. Generates insight for dashboard:
   "Immunopathology needs focus — watch [video]"
    ↓
6. User sees notification on next login
    ↓
7. User can accept/modify AI suggestions
```

### Workflow 3: Mock Exam Week

```
1. User reaches Week 4 (Mock Exam phase)
    ↓
2. Roadmap Saturday session: "Mock Exam - 80 questions"
    ↓
3. User clicks "Start Mock Exam"
    ↓
4. System creates timed test (80 Qs, 110 mins, mixed subjects)
    ↓
5. User completes under exam conditions
    ↓
6. Submit → Backend generates detailed report:
   - Overall: 68%
   - By subject: Pathology 75%, Pharm 60%, Physio 70%
   - Time management: 82 seconds/question (good)
    ↓
7. AI adjusts remaining roadmap:
   - More Pharmacology sessions
   - Less Pathology (strong)
    ↓
8. User reviews report + incorrect answers
```

---

## 🧩 Summary: How It All Works Together

### The Integration Loop

```
Roadmap
    ↓ guides daily study
Question Bank
    ↓ creates tests based on roadmap
Test Results
    ↓ update stats & trigger adaptation
AI Analysis
    ↓ adjusts roadmap + generates insights
Dashboard
    ↓ displays everything
User
    ↓ follows updated plan
[Loop continues...]
```

### Key Principles

1. **Roadmap is the Source of Truth**
   - Everything references roadmap sessions
   - Tests link to sessions for context

2. **Performance Drives Adaptation**
   - AI monitors all test results
   - Roadmap updates automatically
   - User can override AI suggestions

3. **Context-Aware Features**
   - QBank suggests questions from today's topic
   - AI Tutor knows what user is studying
   - Dashboard highlights current session

4. **Minimal User Friction**
   - Smart defaults (roadmap-based tests)
   - One-click test creation
   - Automatic progress tracking

5. **Backend-Ready Frontend**
   - All data from dummy files can swap to API calls
   - Structure matches expected API responses
   - Easy to replace hardcoded data

---

## 🚧 Implementation Phases

### Phase 1: Frontend (Current)
- ✅ Dashboard UI
- ✅ Roadmap display
- ✅ Onboarding flow
- ✅ Hardcoded data

### Phase 2: Backend Foundation
- User authentication
- Database schema
- Basic CRUD endpoints
- Question bank seeding

### Phase 3: Core Features
- Test creation & submission
- Score tracking
- Roadmap session completion
- Progress calculations

### Phase 4: AI Integration
- Performance analysis
- Roadmap adaptation logic
- Insight generation
- AI Tutor chat

### Phase 5: Advanced Features
- Mock exam mode
- Analytics dashboard
- Study partners
- Content recommendations

---

## 📝 Notes for Backend Development

**Current Frontend Assumptions:**
```javascript
// Dashboard expects this structure
GET /api/dashboard
{
  name: string,
  overallScore: number,      // % correct all-time
  questionsAnswered: number,
  totalQuestions: number,
  correctQs: number,
  incorrectQs: number,
  omittedQs: number,
  examDate: string,
  roadmapWeek: number,
  // ... (see src/data/dashboard.ts)
}

// Roadmap expects
GET /api/roadmap/:id
{
  roadmapId: string,
  totalWeeks: number,
  currentWeek: number,
  sessions: [
    {
      week: number,
      day: string,
      subject: string,
      topic: string,
      hours: number,
      status: "completed" | "in-progress" | "upcoming"
    }
  ]
}

// Test creation expects
POST /api/tests/create
{
  source: "roadmap" | "custom",
  roadmapSessionId?: string,    // If from roadmap
  filters?: {                   // If custom
    subjects: string[],
    topics: string[],
    count: number
  },
  mode: "tutor" | "timed"
}
Response:
{
  testId: string,
  questions: [
    {
      id: string,
      text: string,
      options: [...],
      subject: string,
      topic: string
    }
  ]
}
```

---

**End of Document**

*This architecture ensures all features work together seamlessly while maintaining flexibility for AI-driven adaptations.*
