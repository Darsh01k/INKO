import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Card, Badge, Button, EmptyState, Skeleton, Input, toast } from '@/components/ui'
import { Users as UsersIcon, Search, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'

interface UserRow {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  roles?: string[]
  status?: string
}

const ALL_ROLES = ['CUSTOMER', 'SHOPKEEPER', 'ADMIN', 'SUPER_ADMIN']

function extractRows(data: unknown): UserRow[] {
  if (Array.isArray(data)) return data as UserRow[]
  const content = (data as { content?: UserRow[] })?.content
  return Array.isArray(content) ? content : []
}

export default function AdminUsers() {
  const { user } = useAuth()
  const [rows, setRows] = useState<UserRow[] | null>(null)
  const [counts, setCounts] = useState<{ total?: number; active?: number }>({})
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draftRoles, setDraftRoles] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function load() {
    setError(false); setRows(null)
    api.get('/admin/users', { params: { size: 100 } }).then(r => setRows(extractRows(r.data))).catch(() => setError(true))
    api.get('/admin/users/count').then(r => setCounts(r.data ?? {})).catch(() => {})
  }
  useEffect(load, [])

  async function saveRoles(id: string) {
    if (draftRoles.length === 0) { toast('At least one role is required', 'error'); return }
    setBusy(true); setError(false)
    try {
      await api.patch(`/admin/users/${id}/roles`, { roles: draftRoles })
      toast('Roles updated', 'success')
      setEditing(null)
      load()
    } catch (e) { setError(true); toast(apiErrorMessage(e), 'error') } finally { setBusy(false) }
  }

  async function setStatus(u: UserRow, status: string) {
    setBusy(true)
    try {
      await api.patch(`/admin/users/${u.id}/status`, { status })
      toast(status === 'ACTIVE' ? `${u.fullName} reactivated` : `${u.fullName} is now ${status.toLowerCase()}`, 'success')
      load()
    } catch (e) { toast(apiErrorMessage(e), 'error') } finally { setBusy(false) }
  }

  const filtered = (rows ?? []).filter(u => !q || `${u.fullName} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const canEdit = (u: UserRow) => !!user && u.id !== user.id

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-slate-500">{counts.total != null ? `${counts.total} total • ${counts.active ?? '—'} active` : 'Customers, shopkeepers and admins'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {rows !== null && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone…" className="pl-10" />
        </div>
      )}

      {rows === null && !error && (
        <Card className="space-y-2 p-5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</Card>
      )}

      {error && rows === null && (
        <EmptyState icon={UsersIcon} title="Could not load users" description="Admin API unreachable — refresh to retry." action={<Button onClick={load}>Retry</Button>} />
      )}

      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs tracking-widest text-slate-500">
                <tr><th className="px-4 py-3 text-left font-medium">Name</th><th className="px-4 py-3 text-left font-medium">Contact</th><th className="px-4 py-3 text-left font-medium">Roles</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-right font-medium"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email ?? u.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {editing === u.id ? (
                        <div className="flex flex-col gap-1.5">
                          {ALL_ROLES.map(r => (
                            <label key={r} className="inline-flex items-center gap-1.5 text-xs">
                              <input type="checkbox" checked={draftRoles.includes(r)} onChange={e => setDraftRoles(p => e.target.checked ? [...p, r] : p.filter(x => x !== r))} />
                              {r}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">{(u.roles ?? []).map(r => <Badge key={r} tone="brand">{r}</Badge>)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge tone={(u.status ?? 'ACTIVE') === 'ACTIVE' ? 'success' : 'warning'}>{u.status ?? 'ACTIVE'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {editing === u.id ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" loading={busy} onClick={() => saveRoles(u.id)}><ShieldCheck className="h-3.5 w-3.5"/> Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      ) : canEdit(u) ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => { setEditing(u.id); setDraftRoles(u.roles ?? []) }}>Edit roles</Button>
                          {(u.status ?? 'ACTIVE') === 'ACTIVE'
                            ? <Button size="sm" variant="ghost" loading={busy} onClick={() => setStatus(u, 'SUSPENDED')}><ShieldAlert className="h-3.5 w-3.5"/> Suspend</Button>
                            : <Button size="sm" variant="ghost" loading={busy} onClick={() => setStatus(u, 'ACTIVE')}>Reactivate</Button>}
                        </div>
                      ) : <span className="text-xs text-slate-400">you</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
