# How NextGen USMLE Works - Quick Reference

> **Full Details:** See `/docs/system-architecture.md`

## 🎯 The Big Picture

NextGen USMLE is a **self-adjusting** study platform. Everything works together in a continuous loop:

```
Roadmap guides → Tests validate → Results adapt roadmap → Repeat
```

---

## 🔄 The Core Loop

### 1. **Roadmap Sets the Plan**
- AI generates 12-week study schedule based on exam date
- Each day has assigned subjects + topics + hours
- Weak subjects (from onboarding) get extra practice sessions

### 2. **User Studies + Practices**
- Watches videos, reads PDFs
- Takes tests **linked to roadmap sessions**
- Tests auto-suggested based on today's topic

### 3. **Results Feed Back to Roadmap**
- Test scores → analyzed by AI
- Low performance (<75%) → roadmap adjusts
- Adds review sessions, reorders topics, extends timeline

### 4. **Dashboard Shows Everything**
- Current progress (score, streak, hours)
- Today's plan
- AI insights about weak areas
- Recent test results

---

## 📚 Question Bank: Smart Defaults

**What makes it smart:**

When user opens Question Bank, system says:
> "Based on today's roadmap: Pharmacology - CNS Drugs
> 40 questions, Tutor mode"

**Why this matters:**
- One click to start relevant practice ✓
- Test results link to roadmap session ✓
- AI knows which topic was validated ✓
- Progress feels connected ✓

**User can always customize:**
- Choose different subjects
- Adjust question count
- Switch modes (Tutor/Timed/Mock Exam)
- Filter by weak areas only

---

## 🧠 Test Modes

### Tutor Mode (Learning)
- Answer → Instant feedback
- See explanation immediately
- Video links + diagrams shown
- Best for: New topics

### Timed Mode (Practice)
- 1.5 min/question
- No instant feedback
- Review all at end
- Best for: Building speed

### Mock Exam Mode (Assessment)
- 80 questions, 110 minutes
- Full exam simulation
- Comprehensive report
- Best for: Progress checks

---

## 🔄 How Adaptation Works

**Example:**

```
User takes "Immunology" test → Scores 55%
                ↓
AI analyzes: "Hypersensitivity Type IV is weak"
                ↓
AI decides: "Add review session + suggest video"
                ↓
Roadmap updates: Week 4, Day 5 → "Immunology Review"
                ↓
Dashboard shows: "AI Insight: Focus on Type IV..."
                ↓
User follows updated plan
```

**Adaptation triggers:**
- Score <75% on any topic
- Mock exam completed (weekly/biweekly)
- User marks topic as "too hard"
- User skips a day (reschedules content)

**What AI adjusts:**
- Adds review sessions
- Moves hard topics earlier (more time to practice)
- Extends total weeks if falling behind
- Reduces hours/day if burnout detected

---

## 🎓 AI Tutor: Context-Aware Help

**AI knows:**
- What you're studying today (from roadmap)
- Your recent test results
- Your weak subjects
- Which video you're watching

**Example interaction:**

```
User: "Why did I get this renal question wrong?"

AI: "You're currently on Week 3 - Renal Physiology.
     You confused Type III vs Type IV hypersensitivity.
     
     Type III = Immune complex (antibody-mediated)
     Type IV = T-cell mediated (delayed)
     
     Your test showed 2/5 on Type IV questions.
     Watch: 'T-Cell Immunity' at 14:22
     
     I've also added a review session to Week 5.
     
     Want me to explain the difference more?"
```

---

## 📊 Progress Tracking

### Dashboard Level (Home Screen)
- Overall score (all-time correct %)
- QBank usage (questions used / total)
- Study streak (consecutive days)
- Weekly hours

### Roadmap Level (Study Plan)
- Current week / total weeks
- Sessions completed / remaining  
- Phase progress (Foundation → Integration → Practice → Mock)

### Subject Level (Analytics Page)
- Per-subject scores
- Topic mastery heatmap
- Weak areas flagged with recommendations

---

## 🗂️ Content Hub Integration

**Videos:**
- AI can **deep-link** to exact timestamps
- "Watch: Beta Blockers at 8:22"
- Clicking navigates to video + auto-seeks to 8:22

**PDFs:**
- AI retrieves page numbers
- "Source: Pharmacology Ch.4, Page 112"
- Clicking opens PDF at that page

**Diagrams:**
- AI shows **verified images** from content
- Never generates/hallucinates new images
- "Figure 4.2 - Beta-1 Receptor Pathway"

---

## 💡 What Makes This Different from UWorld?

| Feature | UWorld | NextGen USMLE |
|---------|--------|---------------|
| Question Bank | ✅ Yes | ✅ Yes |
| Stats Dashboard | ✅ Yes | ✅ Yes (similar UI) |
| Study Plan | ❌ No | ✅ AI-generated roadmap |
| Roadmap Adaptation | ❌ No | ✅ Auto-adjusts based on performance |
| AI Tutor | ❌ No | ✅ Context-aware chat |
| Video Deep-Links | ❌ No | ✅ Timestamp-level linking |
| Content Hub | ❌ No | ✅ Videos + PDFs integrated |
| Study Partners | ❌ No | ✅ Matchmaking system |
| Leaderboard | ❌ No | ✅ Competitive ranking |

**Key insight:** UWorld is a question bank with stats.
NextGen USMLE is a **complete adaptive learning system** that happens to include a question bank.

---

## 🔐 Premium Features (Subscription Tiers)

### Basic (Free Trial / Entry)
- Access to question bank
- Basic stats
- Static roadmap (no AI adaptation)
- Limited content access

### Pro (Most Popular)
- Full question bank
- AI roadmap adaptation
- AI Tutor (unlimited)
- All videos + PDFs
- Mock exams
- Analytics dashboard
- Study partner matching

### Elite (Premium)
- Everything in Pro +
- Priority AI tutor (faster responses)
- Admin 1-on-1 intervention if struggling
- Advanced analytics
- Custom roadmap templates
- Early access to new features

---

## 🎯 Summary: The User Experience

**First-time user:**
1. Signup → Onboarding (4 steps)
2. AI generates roadmap
3. Sees preview → Clicks "Get Started"
4. Lands on dashboard → Sees today's plan
5. Follows roadmap → Takes tests → Improves

**Returning user:**
1. Login → Dashboard
2. Sees: "Today: Pharmacology - CNS Drugs"
3. Studies content → Takes test
4. Reviews incorrect answers
5. Next day: Roadmap advances automatically

**User behind schedule:**
1. Misses 2 days
2. Opens roadmap → Sees "Missed" badges
3. System says: "Content rescheduled to Week 4"
4. Roadmap auto-extends by 1 week
5. User catches up without stress

**User struggling:**
1. Scores <60% on Immunology
2. Dashboard shows AI insight
3. Roadmap adds 2 review sessions
4. AI Tutor suggests specific videos
5. Next test on topic: 78% ✅

---

## 🛠️ Backend Integration Points

**What Frontend Expects:**

```javascript
// Dashboard data
GET /api/dashboard → {
  stats: { overallScore, questionsAnswered, streak },
  todaySessions: [...],
  recentTests: [...],
  aiInsight: "Your renal scores..."
}

// Roadmap data
GET /api/roadmap/:id → {
  sessions: [
    { week, day, subject, topic, status: "completed" | "today" | "upcoming" }
  ]
}

// Test creation
POST /api/tests/create → {
  testId, questions: [...]
}

// Test submission (CRITICAL)
POST /api/tests/:id/submit → {
  testId,
  answers: [...],
  roadmapSessionId // ← Links test to roadmap
}

// Automatic adaptation
POST /api/roadmap/adapt (triggered by backend after analysis)
```

**See `/docs/system-architecture.md`** for complete API specs.

---

## 📁 Key Files

**Current Frontend:**
- `/src/data/dashboard.ts` - Dummy dashboard data
- `/src/data/roadmap.ts` - Hardcoded 12-week plan
- `/src/pages/student/DashboardPage.tsx` - Home screen
- `/src/pages/student/RoadmapPreviewPage.tsx` - Roadmap view
- `/src/pages/student/OnboardingPage.tsx` - New user flow

**Backend (Future):**
- See full API structure in `/docs/system-architecture.md`

---

**Questions?** Read the full architecture doc for complete workflows, data structures, and technical details.
