
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { isAuthenticated, userHasRole } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (roles && !userHasRole(roles)) return <Navigate to="/" />
  return children
}
