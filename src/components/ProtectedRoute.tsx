import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../stores/useAuth'

export function ProtectedRoute() {
  const { user, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm text-slate-400">
        loading…
      </div>
    )
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
