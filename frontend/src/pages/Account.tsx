import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, ShieldCheck, Store, LogOut, Bell, Volume2, Moon, Globe, Trash2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/api'
import { Card, Badge, Button, Separator, Dialog, Input, Label, Alert } from '@/components/ui'

function BackTo({ to }: { to: string }) {
  return <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back</Link>
}

export function Profile({ home }: { home: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <BackTo to={home} />
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">{user.fullName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{user.fullName}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.roles.map(r => <Badge key={r} tone="brand">{r}</Badge>)}
              <Badge tone={user.status === 'ACTIVE' ? 'success' : 'warning'}>{user.status}</Badge>
            </div>
          </div>
        </div>
        <Separator className="my-5" />
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /><div><dt className="text-xs uppercase tracking-widest text-slate-500">Email</dt><dd>{user.email ?? '—'}</dd></div></div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><div><dt className="text-xs uppercase tracking-widest text-slate-500">Phone</dt><dd>{user.phone ?? '—'}</dd></div></div>
          {user.shopId && (
            <div className="flex items-center gap-2"><Store className="h-4 w-4 text-slate-400" /><div><dt className="text-xs uppercase tracking-widest text-slate-500">Shop ID</dt><dd className="mono text-xs">{user.shopId}</dd></div></div>
          )}
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-400" /><div><dt className="text-xs uppercase tracking-widest text-slate-500">User ID</dt><dd className="mono text-xs">{user.id}</dd></div></div>
        </dl>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`${home.replace(/\/dashboard$/, '')}/settings`)}>Open settings</Button>
          <Button variant="danger" onClick={() => { logout(); navigate('/login', { replace: true }) }}><LogOut className="h-4 w-4" /> Sign out</Button>
        </div>
      </Card>
    </div>
  )
}

const SETTINGS = [
  { key: 'notifications', label: 'In-app notifications', desc: 'Order updates and queue alerts', icon: Bell, def: true },
  { key: 'sound', label: 'Sound announcements', desc: '"Token A104 completed" voice alerts', icon: Volume2, def: false },
  { key: 'darkMode', label: 'Dark mode', desc: 'Coming soon — theme tokens ready', icon: Moon, def: false },
  { key: 'language', label: 'Regional language', desc: 'English (India) default', icon: Globe, def: false },
]

function DangerZone() {
  const { deleteAccount, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!password) { setError('Enter your password to confirm'); return }
    setBusy(true); setError(null)
    try {
      await deleteAccount(password)
      setOpen(false)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="border-red-200 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <Trash2 className="h-4 w-4" /> Danger zone
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Deleting your account is permanent — you'll be signed out everywhere and won't be able to log
        back in. Your personal details are erased; past order records are kept for shop bookkeeping.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => { setPassword(''); setError(null); setOpen(true) }}>
        Delete my account
      </Button>

      <Dialog open={open} onClose={() => { if (!busy) setOpen(false) }} title="Delete your account?">
        <p className="text-sm leading-relaxed text-slate-600">
          This cannot be undone. Confirm your password to permanently delete <b>your account</b>.
        </p>
        {error && (
          <div className="mt-4">
            <Alert><span className="flex gap-2 items-center"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span></Alert>
          </div>
        )}
        <form onSubmit={handleDelete} className="mt-4 space-y-4" noValidate>
          <div>
            <Label htmlFor="deleteConfirmPassword">Your password</Label>
            <Input id="deleteConfirmPassword" type="password" required autoFocus autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy}>
              <Trash2 className="h-4 w-4" /> Delete forever
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  )
}

export function SettingsPage({ home }: { home: string }) {
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(SETTINGS.map(s => [s.key, s.def])))
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <BackTo to={home} />
      <Card className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">Preferences are device-local for now — server sync lands with notifications.</p>
        <div className="mt-5 grid gap-3">
          {SETTINGS.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Icon className="h-4 w-4 text-slate-600" /></span>
                <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
              </div>
              <button
                role="switch"
                aria-checked={on[key]}
                onClick={() => setOn((p) => ({ ...p, [key]: !p[key] }))}
                className={`relative h-6 w-11 rounded-full transition ${on[key] ? 'bg-[oklch(0.55_0.20_260)]' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on[key] ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      <DangerZone />
    </div>
  )
}
