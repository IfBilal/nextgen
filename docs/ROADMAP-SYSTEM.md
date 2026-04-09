# Roadmap System: Dynamic & Adaptive Learning

> **How the AI-powered study plan adjusts to user performance**

## 🎯 Overview

The roadmap is the **core of NextGen USMLE**. Unlike static study schedules, our roadmap:
- Starts with a personalized 12-week plan
- **Monitors** every test performance
- **Adapts** automatically when user struggles
- **Recalibrates** if user falls behind or speeds ahead
- **Optimizes** for exam date (never overshoots)

---

## 📅 Initial Roadmap Generation

### Input (From Onboarding)
```javascript
{
  examType: "USMLE Step 1",
  examDate: "2025-06-20",    // 84 days from now
  hoursPerDay: 3,
  weakSubjects: ["Pathology", "Microbiology"],
  studyStyle: ["Read first, then practice", "I need repetition"],
  studySchedule: "Evening"
}
```

### AI Processing
1. **Calculate timeline**
   - Days available: 84
   - Study days: 72 (minus 12 rest days)
   - Total hours: 72 × 3 = 216 hours

2. **Allocate by subject** (USMLE Step 1 blueprint)
   - Pathology: 20% → 43 hours (extra due to weak)
   - Physiology: 18% → 39 hours
   - Microbiology: 15% → 32 hours (extra due to weak)
   - Pharmacology: 15% → 32 hours
   - Biochemistry: 12% → 26 hours
   - Anatomy: 10% → 22 hours
   - Others: 10% → 22 hours

3. **Structure phases**
   - **Weeks 1-3**: Foundation (basics of each subject)
   - **Weeks 4-6**: Integration (systems-based)
   - **Weeks 7-9**: Practice (heavy question focus)
   - **Weeks 10-12**: Mock exams + review

4. **Inject weak subject boosters**
   - Pathology: Extra practice days in Weeks 4, 6, 8
   - Microbiology: Extra review in Weeks 5, 7, 9

5. **Output: 12-week roadmap**
   ```javascript
   {
     roadmapId: "rm_123",
     totalWeeks: 12,
     phases: [
       { weeks: [1-3], name: "Foundation", goal: "Cover all subjects" },
       { weeks: [4-6], name: "Integration", goal: "Connect concepts" },
       { weeks: [7-9], name: "Practice", goal: "Master application" },
       { weeks: [10-12], name: "Assessment", goal: "Exam simulation" }
     ],
     sessions: [
       // 84 daily sessions
       {
         id: "session_001",
         week: 1,
         day: "Monday",
         date: "2024-04-04",
         subject: "Pathology",
         topic: "Cell Injury & Adaptation",
         subtopics: ["Hypoxia", "Free radicals", "Apoptosis"],
         estimatedHours: 2,
         type: "study",  // study | review | practice | mock | rest
         status: "upcoming",
         content: {
           videos: ["video_12", "video_45"],
           pdfs: ["pathology_ch1"],
           recommendedQuestions: 15
         }
       },
       // ... 83 more
     ]
   }
   ```

---

## 🔄 Dynamic Adaptation Triggers

### Trigger 1: Low Test Performance

**Scenario:**
```
User completes test on "Immunology - Hypersensitivity"
Score: 55% (9/15 correct)
Threshold: 75%
```

**AI Analysis:**
```javascript
{
  subject: "Immunology",
  topic: "Hypersensitivity",
  score: 55,
  threshold: 75,
  gap: -20,  // performance gap
  
  incorrectQuestions: [
    { id: "q_34", topic: "Type IV Hypersensitivity", rootCause: "concept_gap" },
    { id: "q_67", topic: "Type III vs IV", rootCause: "clinical_reasoning" },
    ...
  ],
  
  diagnosis: "Fundamental understanding gap in T-cell mediated responses",
  recommendation: "add_focused_review_session"
}
```

**Adaptation Decision Tree:**

```
Performance: 55%
    ↓
Gap = -20 points (severe)
    ↓
Check: Is there time for review?
    ├─ Yes (exam in 60 days) → Add 2 review sessions
    └─ No (exam in 14 days) → Flag topic, add to final week cram
    ↓
Add sessions where?
    ├─ Next available practice day
    └─ Before related topics (if any upcoming)
    ↓
Adjust subsequent weeks to fit
    ↓
Generate insight for user
```

**Roadmap Changes:**
```javascript
// Before
Week 4, Day 5: "Pharmacology - Cardiovascular Drugs" (2h)

// After
Week 4, Day 5: "Immunology - Hypersensitivity REVIEW" (1.5h)
             + "Pharmacology - Cardiovascular Drugs" (1.5h)
// Total hours same, split focus

// Also added
Week 5, Day 3: "Immunology - Type IV Deep Dive" (NEW session, 1h)
// Next week adjusted: removed 1h from strong subject
```

**User sees:**
```
Dashboard AI Insight:
"🧠 Your Hypersensitivity test (55%) showed gaps in Type IV mechanisms.
 We've added focused review sessions to Week 4 & 5.
 Recommended: Watch 'T-Cell Immunity' at 14:22"
 
 [View Updated Roadmap] [Ask AI Tutor]
```

---

### Trigger 2: Missed Days

**Scenario:**
```
User plans to study Monday & Tuesday
User actually studies: (nothing - sick/busy)
```

**AI Response:**
```javascript
// Tuesday night (automated check)
{
  missedDays: 2,
  missedContent: [
    "Pathology - Neoplasia",
    "Pharmacology - ANS Drugs"
  ],
  
  decision: "reschedule",
  strategy: "push_forward_with_compression"
}
```

**Adaptation:**
```
Option 1: Extend roadmap (+2 days)
    ├─ If exam date allows
    └─ Pushes all content forward

Option 2: Compress into next week
    ├─ If exam date tight
    └─ Saturday/Sunday get extra content

Option 3: Drop less critical content
    ├─ If exam date very tight
    └─ AI prioritizes high-yield topics only

User sees:
"⚠️ You missed 2 days this week.
 We've rescheduled content to Week 3, Days 6-7.
 This adds 1 extra day to your plan (now 85 days total).
 Still on track for your exam! 💪"
```

---

### Trigger 3: Mastery Claim

**Scenario:**
```
User clicks: "I've mastered Biochemistry - Metabolism"
```

**AI Validation:**
```javascript
// Check performance
{
  subject: "Biochemistry",
  topic: "Metabolism",
  recentTests: [
    { date: "Apr 1", score: 95 },
    { date: "Apr 8", score: 92 }
  ],
  avgScore: 93.5,
  threshold: 90,
  
  verdict: "confirmed_mastery"
}
```

**Adaptation:**
```
AI removes:
- Week 6, Day 2: "Biochemistry - Metabolism Review" (REMOVED)
- Week 9, Day 5: "Biochemistry Practice Test" (Metabolism section removed, test shortened)

AI reallocates hours:
- Freed hours: 3.5
- Add to: "Pharmacology" (user's next weakest)

User sees:
"✅ Confirmed: Your Metabolism scores are excellent (93% avg).
 We've removed redundant review sessions and added 3.5 hours
 to Pharmacology instead.
 
 New plan updated. You're crushing it! 🚀"
```

---

### Trigger 4: Weekly Mock Exam Results

**Scenario:**
```
User takes Week 4 Mock Exam (80 questions, mixed subjects)
Results:
{
  overall: 68%,
  breakdown: {
    "Pathology": 75%,      // Target met ✓
    "Pharmacology": 60%,   // Below target ⚠️
    "Physiology": 70%,     // Slightly below
    "Microbiology": 55%,   // Weak ⚠️
    "Biochemistry": 80%    // Above target ✓
  }
}
```

**AI Analysis:**
```javascript
{
  strengths: ["Pathology", "Biochemistry"],  // reduce time here
  weaknesses: ["Pharmacology", "Microbiology"],  // increase time here
  neutral: ["Physiology"],  // maintain
  
  overallTrend: "slightly_behind",
  daysRemaining: 56,
  
  recommendation: "major_rebalance"
}
```

**Adaptation (Weeks 5-12):**
```
Biochemistry: -6 hours (strong, reduced)
Pathology: -4 hours (strong, reduced)
    ↓
    Freed: 10 hours
    ↓
Pharmacology: +6 hours (weak, increased)
Microbiology: +4 hours (weak, increased)

Specific changes:
- Week 5, Day 3: Add "Pharmacology - Antibiotics Review"
- Week 6, Day 5: Add "Microbiology - Virology Deep Dive"
- Week 7, Day 2: Change from "Biochemistry" to "Pharmacology Practice Test"
- Week 8: Entire week rebalanced (more Pharm/Micro, less Path/Biochem)

User notification:
"📊 Week 4 Mock Exam analyzed!
 
 Strong: Pathology (75%), Biochemistry (80%)
 Needs work: Pharmacology (60%), Microbiology (55%)
 
 We've rebalanced your remaining 8 weeks:
 ✅ More Pharmacology & Microbiology
 ⬇️ Less Pathology & Biochemistry
 
 You're still on track. Let's focus where it matters! 💪
 
 [View Updated Roadmap]"
```

---

## 🧠 AI Decision-Making Logic

### Performance Thresholds

```javascript
const adaptationRules = {
  score_90_plus: {
    action: "reduce_future_sessions",
    message: "You've mastered this!"
  },
  score_75_to_89: {
    action: "maintain_as_planned",
    message: "On track, keep going!"
  },
  score_60_to_74: {
    action: "add_one_review_session",
    message: "Almost there, added review"
  },
  score_below_60: {
    action: "add_multiple_reviews_and_flag",
    message: "Let's strengthen this area"
  }
}
```

### Adaptation Constraints

```javascript
const constraints = {
  max_hours_per_day: 8,  // Never exceed burnout threshold
  min_rest_days_per_week: 1,  // At least 1 rest day
  exam_date_buffer: 3,  // Stop new content 3 days before exam
  max_total_weeks: 16,  // Never extend beyond 16 weeks
  min_session_duration: 0.5,  // Don't create <30min sessions
  
  priority_order: [
    "exam_date",  // Never miss exam date
    "user_wellbeing",  // Avoid burnout
    "high_yield_topics",  // Cover critical content
    "comprehensive_coverage",  // Cover everything if time permits
    "extra_practice"  // Add practice if time allows
  ]
}
```

---

## 📊 Roadmap Status Indicators

### Session Statuses

```javascript
const statusTypes = {
  completed: {
    icon: "✅",
    color: "green",
    criteria: "User marked as done OR test score ≥75%"
  },
  
  today: {
    icon: "🔵",
    color: "blue",
    criteria: "Date === today",
    highlight: "glowing border"
  },
  
  in_progress: {
    icon: "⏳",
    color: "yellow",
    criteria: "Started but not completed"
  },
  
  upcoming: {
    icon: "⬜",
    color: "grey",
    criteria: "Date > today"
  },
  
  missed: {
    icon: "⚠️",
    color: "red",
    criteria: "Date < today AND status !== completed",
    action: "Show 'Reschedule' button"
  },
  
  skipped: {
    icon: "⏭️",
    color: "orange",
    criteria: "User clicked 'Skip'",
    note: "Content moved to next available day"
  },
  
  mastered: {
    icon: "🏆",
    color: "gold",
    criteria: "User claimed + AI confirmed (score ≥90%)",
    note: "Future reviews removed"
  }
}
```

---

## 🔄 Real-Time vs Batch Updates

### Real-Time (Immediate)
- Session completion (user clicks "Mark done")
- Test submission (score instantly updates roadmap status)
- Skip/reschedule actions

### Batch (Nightly/Weekly)
- Weekly mock exam analysis (runs after exam completion)
- Missed day detection (checks every night at midnight)
- Trend analysis (weekly cohort comparisons)

---

## 💡 User Control vs AI Control

### User Can:
- Mark sessions as complete ✅
- Skip sessions (content reschedules) ⏭️
- Claim mastery (AI validates) 🏆
- Manually adjust hours/day 📊
- Request roadmap recalculation 🔄
- Accept/reject AI suggestions (Pro plan) 👍👎

### User Cannot:
- Delete core sessions (exam blueprint required)
- Extend past exam date
- Set <1 hour/day (minimum for effectiveness)

### AI Automatically:
- Detects low performance → adds reviews
- Detects high performance → reduces redundancy
- Reschedules missed content
- Rebalances based on mock exams
- Optimizes session order for learning

---

## 🎯 Summary: Why This Works

**Traditional study plans:**
```
Static → User follows → Falls behind → Gives up
```

**NextGen USMLE roadmap:**
```
Dynamic → User follows → Falls behind → AI adjusts → User catches up → Success
```

**Key principles:**
1. **Start personalized** (not one-size-fits-all)
2. **Monitor continuously** (every test is data)
3. **Adapt intelligently** (not random changes)
4. **Respect constraints** (exam date, hours/day, wellbeing)
5. **Communicate clearly** (user always knows why changes happen)

---

**Result:** A study plan that evolves with the user, not against them. 🚀
