import { Navigate, Outlet, Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { useAuth, getSessionArea, AREA_LOGIN, AREA_HOME, AREA_LABEL, type SessionArea } from '@/lib/auth'
import { Card, Button } from '@/components/ui'

/**
 * One session = one console. Reaching another role's dashboard requires signing in
 * through that area's login page — cross-area navigation is blocked here.
 */
export function AreaGuard({ area }: { area: SessionArea }) {
  const { user, isLoading } = useAuth()

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

  if (!user) return <Navigate to={AREA_LOGIN[area]} replace />

  const sessionArea = getSessionArea()
  if (sessionArea !== area) {
    const currentLabel = sessionArea ? AREA_LABEL[sessionArea] : 'Guest'
    return (
      <main className="mesh-gradient flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200"><ShieldAlert className="h-6 w-6" /></span>
          <h1 className="mt-4 text-xl font-bold tracking-tight">Different console required</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            You are signed in to the <span className="font-semibold">{currentLabel} console</span>.
            To open the <span className="font-semibold">{AREA_LABEL[area]} console</span>, sign in with your {AREA_LABEL[area].toLowerCase()} account.
          </p>
          <div className="mt-6 grid gap-2">
            <Link to={AREA_LOGIN[area]}><Button className="w-full" size="lg">Sign in to {AREA_LABEL[area]} console <ArrowRight className="h-4 w-4" /></Button></Link>
            {sessionArea && (
              <Link to={AREA_HOME[sessionArea]}><Button variant="secondary" className="w-full">Back to my {currentLabel.toLowerCase()} dashboard</Button></Link>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-400">One account, one active console at a time.</p>
        </Card>
      </main>
    )
  }

  return <Outlet />
}
