import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Printer, Store, FileText, User, Mail, Phone, Lock, AlertCircle,
  ArrowRight, ArrowLeft, CheckCircle2,
} from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth, AREA_HOME, setSessionArea } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'
import { CountryCode, fullPhone } from '@/components/PhoneInput'

type Mode = 'signin' | 'register'
type SignInMethod = 'password' | 'otp'
type AccountType = 'CUSTOMER' | 'SHOP_OWNER'

/** One session lands in exactly one console, resolved from real roles. */
function routeForRoles(roles: string[], next?: string | null): string {
  if (next && next.startsWith('/')) return next
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
    setSessionArea('admin')
    return AREA_HOME.admin
  }
  if (roles.includes('SHOPKEEPER')) {
    setSessionArea('shop')
    return AREA_HOME.shop
  }
  setSessionArea('customer')
  return AREA_HOME.customer
}

export default function Welcome() {
  const { loginWithPassword, requestOtp, verifyOtp, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')

  const [mode, setMode] = useState<Mode>(params.get('tab') === 'register' || params.get('type') ? 'register' : 'signin')
  const [method, setMethod] = useState<SignInMethod>('password')
  const [accountType, setAccountType] = useState<AccountType>(
    params.get('type') === 'shop' ? 'SHOP_OWNER' : 'CUSTOMER',
  )
  const [step, setStep] = useState<1 | 2>(params.get('type') ? 2 : 1)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCountry, setOtpCountry] = useState('+91')
  const [otpCode, setOtpCode] = useState('')
  const [devHint, setDevHint] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchMode(m: Mode) {
    setMode(m); setError(null); setDevHint(null)
  }

  // ---------- sign in ----------

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim() || !password) { setError('Please fill in all fields'); return }
    setError(null); setBusy(true)
    try {
      const user = await loginWithPassword(identifier.trim(), password)
      navigate(routeForRoles(user.roles, next), { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpPhone.trim()) { setError('Enter your phone number'); return }
    setError(null); setBusy(true)
    try {
      const code = await requestOtp(fullPhone(otpCountry, otpPhone))
      setDevHint(code ? `Development OTP: ${code}` : null)
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      const user = await verifyOtp(fullPhone(otpCountry, otpPhone), otpCode.trim())
      navigate(routeForRoles(user.roles, next), { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  // ---------- create account ----------

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!email.trim() && !phone.trim()) { setError('Provide at least an email address or a phone number.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const user = await register(
        fullName.trim(),
        email.trim() || undefined,
        email.trim() ? undefined : fullPhone(otpCountry, phone),
        newPassword,
        accountType,
      )
      navigate(routeForRoles(user.roles, next), { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight">Welcome to Inko</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'signin' ? 'Sign in to your printing platform' : 'One account for printing or running your shop'}
          </p>
        </div>

        <Card className="p-6 sm:p-7 shadow-lg">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(['signin', 'register'] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={mode === m ? 'rounded-lg bg-white py-2 shadow-sm font-semibold' : 'rounded-lg py-2 text-slate-500 hover:text-slate-700'}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4">
              <Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span></Alert>
            </div>
          )}
          {devHint && <div className="mb-4"><Alert tone="info">{devHint}</Alert></div>}

          {/* ------------------------------ SIGN IN ------------------------------ */}
          {mode === 'signin' && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 p-1 text-sm font-medium">
                {(['password', 'otp'] as SignInMethod[]).map((mth) => (
                  <button key={mth} type="button"
                    onClick={() => { setMethod(mth); setError(null); setDevHint(null) }}
                    className={method === mth ? 'rounded-lg bg-slate-100 py-2 font-semibold' : 'rounded-lg py-2 text-slate-500 hover:text-slate-700'}>
                    {mth === 'password' ? 'Password' : 'Phone OTP'}
                  </button>
                ))}
              </div>

              {method === 'password' ? (
                <form onSubmit={handlePasswordSignIn} className="space-y-4" noValidate>
                  <div>
                    <Label htmlFor="identifier">Email or phone</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="identifier" autoComplete="username" required value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="mb-1">Password</Label>
                      <Link to="/forgot-password" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">Forgot?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="password" type="password" autoComplete="current-password" required value={password}
                        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" loading={busy}>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-center text-xs text-slate-400">You'll land in the right dashboard automatically</p>
                </form>
              ) : (
                <div className="space-y-5">
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone number</Label>
                      <div className="relative">
                        <CountryCode value={otpCountry} onChange={setOtpCountry} />
                        <Phone className="pointer-events-none absolute left-[112px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input id="phone" required value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)}
                          placeholder="90000 00000" className="pl-[136px]" inputMode="tel" />
                      </div>
                    </div>
                    <Button type="submit" variant="secondary" className="w-full" loading={busy}>Send OTP</Button>
                  </form>
                  {devHint && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 border-t border-slate-100 pt-5">
                      <div>
                        <Label htmlFor="code">6-digit code</Label>
                        <Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)} placeholder="123456"
                          className="tracking-widest text-center font-mono text-lg" />
                      </div>
                      <Button type="submit" className="w-full" loading={busy}>Verify & sign in</Button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          {/* ---------------------------- CREATE ACCOUNT ---------------------------- */}
          {mode === 'register' && step === 1 && (
            <>
              <p className="mb-3 text-sm font-medium text-slate-700">What brings you to Inko?</p>
              <div className="grid gap-3">
                <button type="button" onClick={() => { setAccountType('CUSTOMER'); setStep(2) }}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${accountType === 'CUSTOMER' ? 'border-[oklch(0.55_0.20_260)] bg-indigo-50/60' : 'border-slate-200'}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl brand-gradient shadow-sm">
                    <FileText className="h-5 w-5 text-white" />
                  </span>
                  <span>
                    <span className="block font-semibold">I want to print documents</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      Customer account — upload files, find nearby shops, pay & track orders.
                    </span>
                  </span>
                </button>

                <button type="button" onClick={() => { setAccountType('SHOP_OWNER'); setStep(2) }}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 ${accountType === 'SHOP_OWNER' ? 'border-[oklch(0.55_0.20_260)] bg-indigo-50/60' : 'border-slate-200'}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
                    <Store className="h-5 w-5 text-white" />
                  </span>
                  <span>
                    <span className="block font-semibold">I own a print shop</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      Shop owner account — manage queues, orders, pricing and printers.
                    </span>
                  </span>
                </button>
              </div>
              <p className="mt-6 text-center text-sm text-slate-500">
                Already registered?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="font-medium text-[oklch(0.55_0.20_260)] hover:underline">Sign in</button>
              </p>
            </>
          )}

          {mode === 'register' && step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${accountType === 'SHOP_OWNER' ? 'border-slate-900/10 bg-slate-900 text-white' : 'border-indigo-200 bg-indigo-50 text-indigo-800'}`}>
                {accountType === 'SHOP_OWNER' ? <Store className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                <span className="flex-1">
                  Creating as <b>{accountType === 'SHOP_OWNER' ? 'Shop Owner' : 'Customer'}</b> — you'll go straight to your dashboard.
                </span>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              </div>

              <div>
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="fullName" required maxLength={120} value={fullName}
                    onChange={(e) => setFullName(e.target.value)} placeholder={accountType === 'SHOP_OWNER' ? 'Priya Verma' : 'Aarav Sharma'} className="pl-10" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="email" type="email" autoComplete="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 90000 00000" className="pl-10" inputMode="tel" />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="newPassword" type="password" minLength={8} maxLength={72} required autoComplete="new-password"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="pl-10" />
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.min(100, newPassword.length * 12)}%`, background: newPassword.length > 11 ? '#059669' : newPassword.length > 7 ? '#d97706' : '#e2e8f0' }} />
                </div>
              </div>

              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" required autoComplete="new-password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1" size="lg" loading={busy}>
                  Create {accountType === 'SHOP_OWNER' ? 'shop owner' : 'customer'} account <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">By creating an account you agree to our Terms and Privacy Policy.</p>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          Platform staff? <Link to="/admin/login" className="underline hover:text-slate-600">Admin console</Link>
        </p>
      </div>
    </main>
  )
}
