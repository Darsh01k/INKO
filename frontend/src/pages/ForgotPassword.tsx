import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, Mail, KeyRound, Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Card, Input, Label } from '@/components/ui'

type Step = 'request' | 'reset' | 'done'

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth()
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [devHint, setDevHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) { setError('Enter your email'); return }
    setError(null); setBusy(true)
    try {
      const devCode = await forgotPassword(email.trim().toLowerCase())
      setDevHint(devCode ? `Development code: ${devCode}` : null)
      setStep('reset')
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault()
    if (!code.trim() || !newPassword) { setError('Fill in the code and new password'); return }
    setError(null); setBusy(true)
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword)
      setStep('done')
    } catch (err) { setError(apiErrorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <main className="mesh-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">We’ll send a one-time code to verify it’s you</p>
        </div>

        <Card className="p-6 sm:p-7 shadow-lg">
          {/* progress dots */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {(['request','reset','done'] as Step[]).map(s => (
              <div key={s} className={`h-1.5 w-8 rounded-full transition ${step===s ? 'bg-[oklch(0.55_0.20_260)]' : (['request','reset'].indexOf(step) > ['request','reset'].indexOf(s) ? 'bg-emerald-400' : 'bg-slate-200')}`} />
            ))}
          </div>

          {error && <div className="mb-4"><Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</span></Alert></div>}
          {devHint && step==='reset' && <div className="mb-4"><Alert tone="info">{devHint}</Alert></div>}

          {step==='request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <Label htmlFor="email">Account email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={busy}>Send reset code</Button>
            </form>
          )}

          {step==='reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="code">6-digit code</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e)=>setCode(e.target.value)} placeholder="123456" className="pl-10 tracking-widest font-mono" />
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="newPassword" type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="Min 8 characters" className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" loading={busy}>Set new password</Button>
              <button type="button" onClick={()=>setStep('request')} className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </form>
          )}

          {step==='done' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
              <Alert tone="success">Password updated. All previous sessions were signed out — use your new password to sign in.</Alert>
              <Link to="/login"><Button className="w-full" size="lg">Back to sign in</Button></Link>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-[oklch(0.55_0.20_260)] hover:underline">Back to sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  )
}
