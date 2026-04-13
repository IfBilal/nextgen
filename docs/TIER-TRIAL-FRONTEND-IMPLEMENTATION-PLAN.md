# Tier & Demo Trial Frontend Implementation Plan (Backend-Ready)

## 1) Purpose
Implement a complete frontend-only tier and trial system that matches `docs/tiers.md`, while being structured for plug-and-play backend/DB integration later.

This plan ensures:
- New user flow: landing → register/login → demo starts automatically
- Time-based demo countdown (default 7 days)
- Tiered access (Basic / Standard / Premium)
- In-app upgrade flow (simulated purchase for now)
- Admin-configurable fixed pricing and demo duration (frontend persisted)
- Clean architecture so backend integration only replaces adapters

---

## 2) Source of Truth and Current Constraints

### Product requirements from stakeholder
- Tiers and value proposition are in `docs/tiers.md`
- Prices are fixed values in UI but editable from admin portal
- Demo days default to 7, editable from admin portal
- Frontend only for now (no backend, no DB, no real payment)
- User can upgrade during demo or after expiry
- On first successful authenticated session, demo starts automatically
- Show tiers and purchase buttons; purchase should immediately grant plan in frontend
- Use brand-specific + doc-specific copy for paywalls and upgrade nudges

### Documentation gap
- `docs/trial.md` is referenced but not present in repository at planning time.
- Fallback: infer trial feature access from `docs/tiers.md` and existing UX patterns.

---

## 3) High-Level Architecture (Backend-Ready)

Use a **domain + service + adapter** structure:

1. **Domain Types**
   - `PlanId`, `FeatureKey`, `TierDefinition`, `DemoPolicy`, `UserEntitlement`
2. **Repository Interface (Adapter Contract)**
   - Methods for reading/writing billing settings and user entitlements
3. **LocalStorage Adapter (Current)**
   - Implements repository interface with browser persistence
4. **Service Layer**
   - Pure business logic (trial start, expiry checks, access matrix, purchase transition)
5. **React Context (`SubscriptionContext`)**
   - Exposes derived state and actions to UI
6. **UI + Route Guards**
   - Feature lock rendering and protected navigation behavior

### Why this is plug-and-play later
When backend arrives, keep UI + service layer; replace local adapter with API adapter implementing same interface.

---

## 4) Domain Model

### Plan IDs
- `demo`
- `basic`
- `standard`
- `premium`

### Feature Keys (frontend capability map)
- `dashboard_basic`
- `adaptive_limited`
- `adaptive_full`
- `mock_exam_limited`
- `mock_exam_full`
- `analytics_basic`
- `analytics_advanced`
- `peer_matching`
- `leaderboard`
- `marathon_preview`
- `marathon_full`
- `priority_support`

### Billing Settings
- `demoDurationDays` (default 7)
- `plans[]` with editable fixed monthly prices

### User Entitlement
- `email`
- `currentPlan`
- `demoStartedAt` (nullable)
- `demoEndsAt` (nullable)
- `mockExamsUsedInDemo` (counter)
- `createdAt`, `updatedAt`

### Derived Fields (computed, not persisted)
- `isDemoActive`
- `isDemoExpired`
- `demoDaysLeft`
- `canAccess(feature)`

---

## 5) Trial and Tier Rules

### Demo defaults (inferred from `docs/tiers.md`)
- 1 full mock exam
- limited adaptive schedule (3–5 days preview behavior)
- basic analytics
- 60-day marathon preview
- premium features visible but locked

### Locked in demo
- full question bank and full mock library
- deep analytics
- peer matching
- leaderboard boosts/rank features
- full marathon program

### Basic
- schedules + tracking
- limited mocks

### Standard
- full adaptive system
- all mocks + assessments
- progress analytics

### Premium
- everything in Standard
- advanced analytics
- priority support
- peer matching / leaderboard boosts

---

## 6) User Lifecycle Flow

### New user
1. User lands on `/`
2. Registers and/or logs in
3. On first authenticated session, trial entitlement is initialized:
   - `currentPlan = demo`
   - `demoStartedAt = now`
   - `demoEndsAt = now + demoDurationDays`

### During trial
- Countdown appears in student UI
- Feature locks are visible with upgrade CTAs
- User may upgrade anytime

### After trial expiry
- Keep core pages accessible for awareness (dashboard + upgrade)
- Block premium/progression routes with paywall/upgrade redirect

### Upgrade flow (frontend simulation)
- User opens upgrade page
- Clicks purchase button on selected plan
- Entitlement updates immediately to paid plan
- Trial countdown/expiry lock no longer blocks paid features

---

## 7) Admin Portal Behavior (Frontend-Only)

Admin billing settings page allows:
- Change fixed monthly prices per tier
- Change demo duration days
- Persist settings in localStorage
- Instant propagation to student UI and purchase cards

Validation constraints:
- price > 0
- demo days range: 1 to 30

---

## 8) Route and Feature Gating Strategy

Use a reusable gate component around route elements:
- If allowed: render page
- If blocked: show lock panel with copy and CTA to `/student/upgrade`

### Route gating examples
- `/student/dashboard`: always accessible
- `/student/qbank`: demo-limited, enforce demo mock quota
- `/student/analytics`: basic for demo/standard, deep locked unless premium
- `/student/partners`, `/student/leaderboard`: locked unless premium
- `/student/upgrade`: always accessible

---

## 9) Copy System (Brand + Doc Aligned)

Primary lock CTA examples:
- “Upgrade to unlock full performance analytics and 60-day marathon plan.”
- “Based on your performance, you need X days of focused prep.”
- Button: “Unlock Your Personalized Plan”

Tone:
- professional, outcome-driven, conversion-oriented
- avoid generic “Buy Premium”; use personalized and value-based text

---

## 10) File-by-File Implementation Blueprint

### New frontend files
- `src/types/subscription.ts`
- `src/services/subscription/subscriptionRepository.ts` (interface)
- `src/services/subscription/localSubscriptionRepository.ts` (adapter)
- `src/services/subscription/subscriptionService.ts`
- `src/context/SubscriptionContext.tsx`
- `src/components/billing/FeatureGate.tsx`
- `src/components/billing/FeatureLockCard.tsx`
- `src/pages/student/UpgradePage.tsx`
- `src/pages/admin/AdminBillingSettingsPage.tsx`
- `src/styles/billing.css`

### Existing files to update
- `src/App.tsx` (provider + routes)
- `src/context/StudentAuthContext.tsx` (plan naming harmonization)
- `src/layouts/StudentLayout.tsx` (countdown + plan label)
- `src/layouts/AdminLayout.tsx` (nav item for billing settings)
- `src/components/student/create-test/AutoTestBuilder.tsx` (demo mock quota enforcement)

---

## 11) QA and Acceptance Checklist

### Functional
- New account starts demo automatically
- Demo countdown starts exactly once per user
- Demo expires based on admin-configured days
- Purchase instantly upgrades entitlement in UI
- Admin edits to prices/days immediately reflected
- Locked features show lock card and upgrade CTA

### Persistence
- Refresh/relogin preserves plan + trial state
- Multiple users on same browser are isolated by email

### UX
- Lock states are discoverable (not hidden)
- Upgrade page clearly compares plans and value
- Copy aligns with conversion strategy in `tiers.md`

### Code quality
- No hard-coded entitlement logic scattered in pages
- Business rules centralized in subscription service
- Adapter boundary in place for backend replacement

---

## 12) Backend/DB Migration Plan (Future)

When backend is ready:
1. Create `ApiSubscriptionRepository` implementing the same repository interface
2. Replace context wiring from local adapter to API adapter
3. Keep UI, route guards, and service methods unchanged
4. Move payment action from simulated `purchasePlan()` to payment-intent flow
5. Add server-side entitlement validation for security

This keeps integration low-risk and near plug-and-play.

---

## 13) Risks and Mitigations

- **LocalStorage tampering risk (frontend only):** acceptable for prototype; enforce backend checks later
- **Missing `trial.md` specifics:** inferred defaults documented explicitly and easy to adjust in config
- **Route lock regressions:** mitigate via centralized `FeatureGate` and feature-key tests

---

## 14) Implementation Order

1. Build domain + repository + service
2. Add subscription context and provider wiring
3. Implement upgrade page and purchase simulation
4. Implement admin billing settings page
5. Add route-level feature gates
6. Add countdown + plan label in layout
7. Enforce demo mock quota in create-test flow
8. Run lint/build and finalize

---

## 15) Definition of Done

Done when:
- Tier/trial UI and rules are fully functional in frontend
- Admin can change prices/demo days in frontend and users see updates
- Demo starts automatically at first authenticated session and expires correctly
- Upgrade flow grants immediate access in frontend
- Architecture is adapter-driven and backend-ready
- Lint/build pass without regressions
