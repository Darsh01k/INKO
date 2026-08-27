import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, ShieldCheck, Store, LogOut, Bell, Volume2, Moon, Globe, Trash2, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/api'
import { useSettings, LANGUAGE_LABEL, type Language } from '@/lib/settings'
import { Card, Badge, Button, Separator, Dialog, Input, Label, Alert, Select } from '@/components/ui'

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

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[oklch(0.55_0.20_260)]' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function SettingsPage({ home }: { home: string }) {
  const { settings, set, t, speak } = useSettings()
  const [saved, setSaved] = useState<string | null>(null)
  function flash(msg: string) { setSaved(msg); setTimeout(() => setSaved(null), 1400) }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <BackTo to={home} />
      <Card className="p-6">
        <h1 className="text-lg font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-sm text-slate-500">{t('settingsDesc')}</p>
        {saved && <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="h-3 w-3" /> {saved}</p>}
        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Bell className="h-4 w-4 text-slate-600" /></span>
              <div><p className="text-sm font-medium">{t('notifications')}</p><p className="text-xs text-slate-500">{t('notificationsDesc')}</p></div>
            </div>
            <Switch checked={settings.notifications} onChange={(v) => { set('notifications', v); flash(t('saved')) }} />
          </div>

          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Volume2 className="h-4 w-4 text-slate-600" /></span>
                <div><p className="text-sm font-medium">{t('sound')}</p><p className="text-xs text-slate-500">{t('soundDesc')}</p></div>
              </div>
              <Switch checked={settings.sound} onChange={(v) => { set('sound', v); flash(t('saved')) }} />
            </div>
            {settings.sound && (
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => speak(t('voiceDemo'))}><Volume2 className="h-3.5 w-3.5" /> {t('testVoice')}</Button>
                <span className="text-xs text-slate-500">"{t('voiceDemo')}"</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Moon className="h-4 w-4 text-slate-600" /></span>
              <div><p className="text-sm font-medium">{t('darkMode')}</p><p className="text-xs text-slate-500">{t('darkModeDesc')}</p></div>
            </div>
            <Switch checked={settings.darkMode} onChange={(v) => { set('darkMode', v); flash(t('saved')) }} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Globe className="h-4 w-4 text-slate-600" /></span>
              <div><p className="text-sm font-medium">{t('language')}</p><p className="text-xs text-slate-500">{t('languageDesc')}</p></div>
            </div>
            <Select value={settings.language} onChange={(e) => { set('language', e.target.value as Language); flash(t('saved')) }} className="w-40">
              {(Object.keys(LANGUAGE_LABEL) as Language[]).map((k) => <option key={k} value={k}>{LANGUAGE_LABEL[k]}</option>)}
            </Select>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">Device-local · stored in <span className="mono">localStorage: inko.settings</span> — future server sync via notification preferences.</p>
      </Card>
      <DangerZone />
    </div>
  )
}
