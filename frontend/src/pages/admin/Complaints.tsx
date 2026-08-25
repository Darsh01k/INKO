import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Card, Badge, Button, EmptyState, Skeleton, Input, Label, Select } from '@/components/ui'
import { toast } from '@/components/ui'
import { MessagesSquare, RefreshCw } from 'lucide-react'

interface Complaint {
  id: string
  complaintNumber: string
  customerId?: string
  orderId?: string
  shopId?: string
  category: string
  description: string
  status: string
  assignedTo?: string | null
  resolution?: string | null
  createdAt: string
}

const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ESCALATED']

export default function AdminComplaints() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Complaint[] | null>(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [busyId, setBusyId] = useState('')
  const [resolution, setResolution] = useState<Record<string, string>>({})

  function load() {
    setErr(''); setRows(null)
    api.get<Complaint[]>('/complaints').then(r => setRows(r.data ?? [])).catch(e => setErr(apiErrorMessage(e)))
  }
  useEffect(load, [])

  async function patch(id: string, body: Record<string, string>) {
    setBusyId(id); setErr('')
    try {
      await api.patch(`/complaints/${id}`, body)
      toast('Complaint updated', 'success')
      load()
    } catch (e) { setErr(apiErrorMessage(e)) } finally { setBusyId('') }
  }

  const visible = (rows ?? []).filter(c => filter === 'ALL' || c.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><MessagesSquare className="h-6 w-6"/> Complaints</h1>
          <p className="text-sm text-slate-500">Assign, investigate and resolve customer complaints</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-40">
            <option value="ALL">All statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4"/> Refresh</Button>
        </div>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</Card>}

      {rows === null && !err && <Card className="space-y-2 p-5">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</Card>}

      {(rows?.length ?? 0) === 0 && rows !== null && !err && (
        <EmptyState icon={MessagesSquare} title="No complaints" description="Customer complaints appear here for triage." />
      )}

      <div className="grid gap-3">
        {visible.map(c => (
          <Card key={c.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold mono text-sm">{c.complaintNumber}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.category} • {new Date(c.createdAt).toLocaleString()} {c.orderId && <>• Order <span className="mono">{c.orderId.slice(0,8)}</span></>}
                </p>
              </div>
              <Badge tone={c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'success' : c.status === 'ESCALATED' ? 'danger' : 'warning'}>{c.status}</Badge>
            </div>

            <p className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-700">{c.description}</p>
            {c.resolution && <p className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">Resolution: {c.resolution}</p>}

            {user?.roles.some(r => ['ADMIN','SUPER_ADMIN'].includes(r)) && (
              <div className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                <div>
                  <Label className="text-xs">Set status</Label>
                  <Select value="" onChange={e => e.target.value && patch(c.id, { status: e.target.value })} disabled={busyId === c.id}>
                    <option value="">Choose…</option>
                    {STATUSES.filter(s => s !== c.status).map(s => <option key={s}>{s}</option>)}
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Resolution note</Label>
                  <Input value={resolution[c.id] ?? ''} onChange={e => setResolution(p => ({ ...p, [c.id]: e.target.value }))} placeholder="Explain the outcome…" />
                </div>
                <div className="flex items-end">
                  <Button size="md" loading={busyId === c.id} onClick={() => patch(c.id, { status: 'RESOLVED', resolution: resolution[c.id] || 'Resolved by admin' })}>Resolve</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {visible.length === 0 && rows !== null && !err && (
          <EmptyState title={`No ${filter.toLowerCase()} complaints`} />
        )}
      </div>
    </div>
  )
}
