import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { AnnouncementProvider } from './context/AnnouncementContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import StudentLayout from './layouts/StudentLayout'
import AdminLayout from './layouts/AdminLayout'
import StudentProtectedRoute from './components/routing/StudentProtectedRoute'
import AdminProtectedRoute from './components/routing/AdminProtectedRoute'
import LandingPage from './pages/LandingPage'

import StudentLoginPage    from './pages/student/auth/StudentLoginPage'
import StudentRegisterPage from './pages/student/auth/StudentRegisterPage'
import OnboardingPage      from './pages/student/OnboardingPage'
import RoadmapPreviewPage  from './pages/student/RoadmapPreviewPage'
import DashboardPage       from './pages/student/DashboardPage'
import CreateTestPage      from './pages/student/CreateTestPage'
import TestSessionPage     from './pages/student/TestSessionPage'
import TestReviewPage      from './pages/student/TestReviewPage'
import ContentHubPage      from './pages/student/ContentHubPage'
import AiTutorPage         from './pages/student/AiTutorPage'
import AnalyticsPage       from './pages/student/AnalyticsPage'
import LeaderboardPage     from './pages/student/LeaderboardPage'
import StudyPartnersPage   from './pages/student/StudyPartnersPage'
import NotesPage           from './pages/student/NotesPage'
import CommentsPage        from './pages/student/CommentsPage'
import InboxPage           from './pages/student/InboxPage'
import FlashcardsPage      from './pages/student/FlashcardsPage'
import UpgradePage         from './pages/student/UpgradePage'
import AdminLoginPage      from './pages/admin/auth/AdminLoginPage'
import AdminDashboardPage  from './pages/admin/AdminDashboardPage'
import AdminStudentsPage   from './pages/admin/AdminStudentsPage'
import AdminMetricsPage    from './pages/admin/AdminMetricsPage'
import AdminFinancialsPage from './pages/admin/AdminFinancialsPage'
import AdminCommentsPage   from './pages/admin/AdminCommentsPage'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'
import AdminBillingSettingsPage from './pages/admin/AdminBillingSettingsPage'
import FeatureGate from './components/billing/FeatureGate'

export default function App() {
  return (
    <BrowserRouter>
      <StudentAuthProvider>
        <SubscriptionProvider>
          <AdminAuthProvider>
            <AnnouncementProvider>
              <Routes>
              {/* Public landing page */}
              <Route path="/" element={<LandingPage />} />

              {/* Student Auth (No Layout) */}
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/student/register" element={<StudentRegisterPage />} />
              <Route element={<StudentProtectedRoute requireOnboarded={false} />}>
                <Route path="/student/onboarding" element={<OnboardingPage />} />
              </Route>
            
              {/* Student Pages (With Layout) */}
              <Route element={<StudentProtectedRoute />}>
                <Route element={<StudentLayout />}>
                  <Route path="/student/dashboard" element={<DashboardPage />} />
                  <Route path="/student/roadmap" element={<FeatureGate feature="adaptive_limited"><RoadmapPreviewPage /></FeatureGate>} />
                  <Route path="/student/create-test" element={<FeatureGate feature="mock_exam_limited"><CreateTestPage /></FeatureGate>} />
                  <Route path="/student/qbank" element={<FeatureGate feature="mock_exam_limited"><CreateTestPage /></FeatureGate>} />
                  <Route path="/student/test-session" element={<TestSessionPage />} />
                  <Route path="/student/test-review" element={<TestReviewPage />} />
                  <Route path="/student/tutor" element={<AiTutorPage />} />
                  <Route path="/student/content" element={<ContentHubPage />} />
                  <Route path="/student/comments" element={<CommentsPage />} />
                  <Route path="/student/inbox" element={<InboxPage />} />
                  <Route path="/student/flashcards" element={<FlashcardsPage />} />
                  <Route path="/student/analytics" element={<FeatureGate feature="analytics_basic"><AnalyticsPage /></FeatureGate>} />
                  <Route path="/student/leaderboard" element={<FeatureGate feature="leaderboard"><LeaderboardPage /></FeatureGate>} />
                  <Route path="/student/partners" element={<FeatureGate feature="peer_matching"><StudyPartnersPage /></FeatureGate>} />
                  <Route path="/student/notes" element={<NotesPage />} />
                  <Route path="/student/upgrade" element={<UpgradePage />} />
                </Route>
              </Route>

              {/* Admin Auth */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Admin Pages (With Layout) */}
              <Route element={<AdminProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/students" element={<AdminStudentsPage />} />
                  <Route path="/admin/metrics" element={<AdminMetricsPage />} />
                  <Route path="/admin/financials" element={<AdminFinancialsPage />} />
                  <Route path="/admin/comments" element={<AdminCommentsPage />} />
                  <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                  <Route path="/admin/billing" element={<AdminBillingSettingsPage />} />
                </Route>
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnnouncementProvider>
          </AdminAuthProvider>
        </SubscriptionProvider>
      </StudentAuthProvider>
    </BrowserRouter>
  )
}
