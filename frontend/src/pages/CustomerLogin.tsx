import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Printer, Mail, Lock, Phone, AlertCircle, ArrowRight, Store } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'
import { CountryCode, fullPhone } from '@/components/PhoneInput'

type Mode = 'password' | 'otp'

function canAccessCustomer(roles: string[]) {
  return roles.includes('CUSTOMER') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')
}

export default function CustomerLogin() {
  const { loginWithPassword, requestOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [params] = useSearchParams()
  const next = params.get('next')
  const [mode, setMode] = useState<Mode>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [otpCode, setOtpCode] = useState('')
  const [devHint, setDevHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function destination(roles: string[]) {
    if (next && next.startsWith('/')) return next
    if (location.state?.from) return location.state.from
    if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) return '/admin/dashboard'
    return '/customer/dashboard'
  }

  function go(roles: string[], area: 'customer' | 'admin') {
    localStorage.setItem('inko.lastLoginRole', area)
    navigate(destination(roles), { replace: true })
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim() || !password) { setError('Please fill in all fields'); return }
    setError(null); setBusy(true)
    try {
      const user = await loginWithPassword(identifier.trim(), password)
      if (!canAccessCustomer(user.roles)) { setError('This account is a shop owner. Please use Shop login.'); return }
      go(user.roles, user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN') ? 'admin' : 'customer')
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpPhone.trim()) { setError('Enter your phone number'); return }
    setError(null); setBusy(true)
    try { const code = await requestOtp(fullPhone(countryCode, otpPhone)); setDevHint(code ? `Development OTP: ${code}` : null) } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      const user = await verifyOtp(fullPhone(countryCode, otpPhone), otpCode.trim())
      if (!canAccessCustomer(user.roles)) { setError('This account is a shop owner. Please use Shop login.'); return }
      go(user.roles, 'customer')
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md"><Printer className="h-6 w-6 text-white" /></div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Customer sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to upload, print & track your orders</p>
        </div>
        <Card className="p-6 sm:p-7 shadow-lg">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(['password','otp'] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(null); setDevHint(null) }} className={mode===m ? 'rounded-lg bg-white py-2 shadow-sm font-semibold' : 'rounded-lg py-2 text-slate-500 hover:text-slate-700'}>
                {m==='password' ? 'Password' : 'Phone OTP'}
              </button>
            ))}
          </div>
          {error && <div className="mb-4 flex gap-2"><Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</span></Alert></div>}
          {devHint && <div className="mb-4"><Alert tone="info">{devHint}</Alert></div>}
          {mode==='password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4" noValidate>
              <div><Label htmlFor="identifier">Email or phone</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="identifier" autoComplete="username" required value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="you@example.com" className="pl-10" /></div></div>
              <div><div className="flex items-center justify-between"><Label htmlFor="password" className="mb-1">Password</Label><Link to="/forgot-password" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">Forgot?</Link></div><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="pl-10" /></div></div>
              <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in <ArrowRight className="h-4 w-4" /></Button>
            </form>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleSendOtp} className="space-y-4"><div><Label htmlFor="phone">Phone number</Label><div className="relative"><CountryCode value={countryCode} onChange={setCountryCode} /><Phone className="pointer-events-none absolute left-[112px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="phone" required value={otpPhone} onChange={(e)=>setOtpPhone(e.target.value)} placeholder="90000 00000" className="pl-[136px]" inputMode="tel" /></div></div><Button type="submit" variant="secondary" className="w-full" loading={busy}>Send OTP</Button></form>
              {devHint && (<form onSubmit={handleVerifyOtp} className="space-y-4 border-t border-slate-100 pt-5"><div><Label htmlFor="code">6-digit code</Label><Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="123456" className="tracking-widest text-center font-mono text-lg" /></div><Button type="submit" className="w-full" loading={busy}>Verify & sign in</Button></form>)}
            </div>
          )}
          <p className="mt-6 text-center text-sm text-slate-500">No account? <Link to="/register" className="font-medium text-[oklch(0.55_0.20_260)] hover:underline">Create one</Link></p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-600">Are you a shop owner?</p><Link to="/shop/login" className="inline-flex items-center gap-1 text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline"><Store className="h-4 w-4"/> Shop sign in →</Link>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-400">Admins can sign in here too — you’ll be redirected to Admin console</p>
      </div>
    </main>
  )
}
