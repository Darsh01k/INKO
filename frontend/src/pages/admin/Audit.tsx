import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Badge, Button, EmptyState, Skeleton, Select } from '@/components/ui'
import { ScrollText, RefreshCw } from 'lucide-react'

interface AuditRow {
  id: number
  actorId?: string
  actorRole?: string
  action?: string
  resourceType?: string
  resourceId?: string
  newValue?: string
  createdAt?: string
}

export default function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  function load(p = page) {
    setErr(''); setRows(null)
    api.get('/admin/audit', { params: { page: p, size: 25 } })
      .then(r => {
        const d = r.data
        setRows(Array.isArray(d) ? d : d.content ?? [])
        setTotalPages((d.totalPages as number) ?? 1)
        setPage(d.number ?? p)
      })
      .catch(e => setErr(apiErrorMessage(e)))
  }
  useEffect(() => { load(0) /* eslint-disable-line react-hooks/exhaustive-deps */, setPage(0) }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ScrollText className="h-6 w-6"/> Audit log</h1>
          <p className="text-sm text-slate-500">Append-only record of administrative actions</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCw className="h-4 w-4"/> Refresh</Button>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</Card>}

      {rows === null && !err && (
        <Card className="space-y-2 p-5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</Card>
      )}

      {rows !== null && rows.length === 0 && !err && (
        <EmptyState icon={ScrollText} title="No audit entries yet" description="Admin actions (status changes, role changes, refund decisions) are recorded here automatically." />
      )}

      {rows !== null && rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs tracking-widest text-slate-500">
                <tr><th className="px-4 py-3 text-left font-medium">When</th><th className="px-4 py-3 text-left font-medium">Actor</th><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Resource</th><th className="px-4 py-3 text-left font-medium">Detail</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2.5"><Badge tone={r.actorRole === 'SUPER_ADMIN' ? 'brand' : 'neutral'}>{r.actorRole ?? 'SYSTEM'}</Badge><span className="mono ml-2 text-[11px] text-slate-400">{r.actorId?.slice(0,8)}</span></td>
                    <td className="px-4 py-2.5 font-medium mono text-xs">{r.action}</td>
                    <td className="px-4 py-2.5 text-xs">{r.resourceType}<span className="mono ml-2 text-[11px] text-slate-400">{r.resourceId?.slice(0,8)}</span></td>
                    <td className="px-4 py-2.5 max-w-xs truncate text-xs text-slate-500 mono">{r.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-xs text-slate-500">Page {page + 1} of {Math.max(totalPages, 1)}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => load(page - 1)}>Previous</Button>
              <Select value={String(page)} onChange={e => load(Number(e.target.value))} className="hidden" />
              <Button size="sm" variant="secondary" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
