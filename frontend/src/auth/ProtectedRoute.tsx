import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '../api/types'
import { FullPageLoader } from '../components/Feedback'
import { useAuth } from './useAuth'
import { dashboardPathForRole } from './roleRouting'

interface ProtectedRouteProps {
  role: UserRole
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { status, user } = useAuth()

  if (status === 'initializing') return <FullPageLoader label="Restoring your session" />
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />
  }

  return <Outlet />
}
