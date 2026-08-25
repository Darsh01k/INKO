import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Printer, User, Mail, Phone, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'
import { CountryCode, fullPhone } from '@/components/PhoneInput'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isShop = params.get('type') === 'shop'
  const next = params.get('next')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!email && !phone) { setError('Provide at least an email address or a phone number.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      await register(fullName.trim(), email.trim() || undefined, (email.trim() ? undefined : fullPhone(countryCode, phone)) || undefined, password)
      localStorage.setItem('inko.lastLoginRole', 'customer')
      navigate(next && next.startsWith('/') ? next : '/customer/dashboard', { replace: true })
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight">{isShop ? 'Create your shop account' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isShop ? 'Register as a shop owner — run queue & orders' : 'Join Inko — upload, print and track in seconds'}</p>
        </div>

        <Card className="p-6 sm:p-7 shadow-lg">
          {error && <div className="mb-4"><Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</span></Alert></div>}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="fullName" required maxLength={120} value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Aarav Sharma" className="pl-10" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <CountryCode value={countryCode} onChange={setCountryCode} />
                  <Phone className="pointer-events-none absolute left-[112px] top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="phone" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="90000 00000" className="pl-[136px]" inputMode="tel" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Min 8 characters" className="pl-10" />
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${Math.min(100, password.length*12)}%`, background: password.length>11?'#059669': password.length>7?'#d97706':'#e2e8f0'}} />
              </div>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Re-enter password" />
            </div>
            {isShop && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">This creates your customer account. To run a shop, the platform admin upgrades your account to SHOPKEEPER after signup — then sign in at Shop login.</p>}
            <p className="text-xs text-slate-500">By creating an account you agree to our Terms and Privacy Policy.</p>
            <Button type="submit" className="w-full" size="lg" loading={busy}>Create account <ArrowRight className="h-4 w-4" /></Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered? <Link to="/login" className="font-medium text-[oklch(0.55_0.20_260)] hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
