import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type Role } from '@/lib/auth'

/**
 * Route protection for the UI only — the backend enforces authorization independently.
 */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <p className="text-sm text-slate-500">Checking your session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.some((role) => user.roles.includes(role))) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-700">Access denied</h1>
          <p className="mt-2 text-sm text-red-600">
            Your account ({user.roles.join(', ')}) cannot open this area. Required: {roles.join(' or ')}.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
