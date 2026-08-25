import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'

function canAccessAdmin(roles: string[]) {
  return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')
}

export default function AdminLogin() {
  const { loginWithPassword } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim() || !password) { setError('Please fill in all fields'); return }
    setError(null); setBusy(true)
    try {
      const user = await loginWithPassword(identifier.trim(), password)
      if (!canAccessAdmin(user.roles)) { setError('Not an admin account. Use Customer or Shop login.'); return }
      localStorage.setItem('inko.lastLoginRole', 'admin')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md"><ShieldCheck className="h-6 w-6 text-white" /></div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Platform governance — shops, users & audits</p>
        </div>
        <Card className="p-6 sm:p-7 shadow-lg">
          <div className="mb-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">ADMIN</div>
          {error && <div className="mb-4"><Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</span></Alert></div>}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div><Label htmlFor="identifier">Email</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="identifier" autoComplete="username" required value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="admin@inko.local" className="pl-10" /></div></div>
            <div><div className="flex items-center justify-between"><Label htmlFor="password" className="mb-1">Password</Label><Link to="/forgot-password" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">Forgot?</Link></div><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10" /></div></div>
            <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in to admin <ArrowRight className="h-4 w-4" /></Button>
          </form>
          <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs">
            <Link to="/login" className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">Customer login →</Link>
            <Link to="/shop/login" className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">Shop login →</Link>
          </div>
        </Card>
      </div>
    </main>
  )
}
