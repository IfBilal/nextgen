import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStudentAuth } from '../../context/StudentAuthContext'
import { useSubscription } from '../../context/SubscriptionContext'

interface StudentProtectedRouteProps {
  requireOnboarded?: boolean
}

export default function StudentProtectedRoute({ requireOnboarded = true }: StudentProtectedRouteProps) {
  const { user } = useStudentAuth()
  const { snapshot } = useSubscription()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/student/login" replace />
  }

  if (requireOnboarded && !user.onboarded) {
    return <Navigate to="/student/onboarding" replace />
  }

  if (
    requireOnboarded &&
    snapshot?.isCurrentPlanExpired &&
    location.pathname !== '/student/upgrade'
  ) {
    return <Navigate to="/student/upgrade" replace />
  }

  return <Outlet />
}