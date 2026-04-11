import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StudentAuthProvider } from './context/StudentAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { AnnouncementProvider } from './context/AnnouncementContext'
import StudentLayout from './layouts/StudentLayout'
import AdminLayout from './layouts/AdminLayout'
import StudentProtectedRoute from './components/routing/StudentProtectedRoute'
import AdminProtectedRoute from './components/routing/AdminProtectedRoute'

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
import AdminLoginPage      from './pages/admin/auth/AdminLoginPage'
import AdminDashboardPage  from './pages/admin/AdminDashboardPage'
import AdminStudentsPage   from './pages/admin/AdminStudentsPage'
import AdminMetricsPage    from './pages/admin/AdminMetricsPage'
import AdminFinancialsPage from './pages/admin/AdminFinancialsPage'
import AdminCommentsPage   from './pages/admin/AdminCommentsPage'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'

export default function App() {
  return (
    <BrowserRouter>
      <StudentAuthProvider>
        <AdminAuthProvider>
          <AnnouncementProvider>
            <Routes>
              {/* Default → student login */}
              <Route path="/" element={<Navigate to="/student/login" replace />} />

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
                  <Route path="/student/roadmap" element={<RoadmapPreviewPage />} />
                  <Route path="/student/create-test" element={<CreateTestPage />} />
                  <Route path="/student/qbank" element={<CreateTestPage />} />
                  <Route path="/student/test-session" element={<TestSessionPage />} />
                  <Route path="/student/test-review" element={<TestReviewPage />} />
                  <Route path="/student/ai-tutor" element={<AiTutorPage />} />
                  <Route path="/student/content" element={<ContentHubPage />} />
                  <Route path="/student/comments" element={<CommentsPage />} />
                  <Route path="/student/inbox" element={<InboxPage />} />
                  <Route path="/student/analytics" element={<AnalyticsPage />} />
                  <Route path="/student/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/student/partners" element={<StudyPartnersPage />} />
                  <Route path="/student/notes" element={<NotesPage />} />
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
                </Route>
              </Route>

              {/* 404 fallback */}
              <Route path="*" element={<Navigate to="/student/login" replace />} />
            </Routes>
          </AnnouncementProvider>
        </AdminAuthProvider>
      </StudentAuthProvider>
    </BrowserRouter>
  )
}
