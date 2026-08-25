import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Printer, Mail, Lock, Phone, AlertCircle, ArrowRight, Globe } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'

type Mode = 'password' | 'otp'

export default function Login() {
  const { loginWithPassword, requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const [mode, setMode] = useState<Mode>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [devHint, setDevHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function destination(role: string) {
    if (location.state?.from) return location.state.from
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return '/dashboard'
      case 'SHOPKEEPER':
        return '/dashboard'
      default:
        return '/dashboard'
    }
  }

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault()
    if (!identifier.trim() || !password) { setError('Please fill in all fields'); return }
    setError(null); setBusy(true)
    try {
      const user = await loginWithPassword(identifier.trim(), password)
      navigate(destination(user.roles[0]), { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleSendOtp(event: React.FormEvent) {
    event.preventDefault()
    if (!identifier.trim()) { setError('Enter your phone number'); return }
    setError(null); setBusy(true)
    try {
      const code = await requestOtp(identifier.trim())
      setDevHint(code ? `Development OTP: ${code}` : null)
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault()
    setError(null); setBusy(true)
    try {
      const user = await verifyOtp(identifier.trim(), otpCode.trim())
      navigate(destination(user.roles[0]), { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Welcome back to Inko</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to print, queue & track your orders</p>
        </div>

        <Card className="p-6 sm:p-7 shadow-lg">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(['password','otp'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setDevHint(null) }}
                className={mode===m ? 'rounded-lg bg-white py-2 shadow-sm font-semibold' : 'rounded-lg py-2 text-slate-500 hover:text-slate-700'}
              >
                {m==='password' ? 'Password' : 'Phone OTP'}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 flex gap-2"><Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</span></Alert></div>}
          {devHint && <div className="mb-4"><Alert tone="info">{devHint}</Alert></div>}

          {mode==='password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="identifier">Email or phone</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="identifier" autoComplete="username" required value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="you@example.com" className="pl-10" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="mb-1">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Use your Inko password. Demo: customer1@inko.local / Customer@Dev123</p>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={busy}>
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="phone" required value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="+919000000003" className="pl-10" />
                  </div>
                </div>
                <Button type="submit" variant="secondary" className="w-full" loading={busy}>Send OTP</Button>
              </form>
              {devHint && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 border-t border-slate-100 pt-5">
                  <div>
                    <Label htmlFor="code">6-digit code</Label>
                    <Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="123456" className="tracking-widest text-center font-mono text-lg" />
                  </div>
                  <Button type="submit" className="w-full" loading={busy}>Verify & sign in</Button>
                </form>
              )}
            </div>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Globe className="h-4 w-4" /> Google
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Mail className="h-4 w-4" /> SSO
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">OAuth is a placeholder — wire up when IdP is ready</p>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account? <Link to="/register" className="font-medium text-[oklch(0.55_0.20_260)] hover:underline">Create one</Link>
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">By continuing you agree to Inko’s Terms & Privacy</p>
      </div>
    </main>
  )
}
