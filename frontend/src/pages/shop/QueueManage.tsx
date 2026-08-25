import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Badge, Alert, Select } from '@/components/ui'
import { Radio, Timer, CheckCircle2, Play, AlertTriangle, XCircle, Phone } from 'lucide-react'

export default function QueueManage() {
  const [shopId, setShopId] = useState('')
  const [shops, setShops] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [live, setLive] = useState(false)

  useEffect(() => { api.get('/shops').then(r => { setShops(r.data); if (r.data[0]) setShopId(r.data[0].id) }).catch(() => {}) }, [])

  async function load() {
    if (!shopId) return
    try { const r = await api.get(`/shops/${shopId}/queue`); setTokens(r.data ?? []); setLive(true) } catch (e: any) { setErr(apiErrorMessage(e)); setLive(false) }
  }
  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id) }, [shopId])

  async function act(id: string, status: string) {
    try { await api.post(`/tokens/${id}/transition`, { targetStatus: status }); load() } catch (e: any) { setErr(apiErrorMessage(e)) }
  }

  const filtered = tokens.filter(t=> filter==='ALL' || String(t.status).toUpperCase()===filter)
  const nextToken = tokens[0]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue management</h1>
          <p className="text-sm text-slate-500">Queue-first ops — large token numbers, fast actions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex ${live ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`}/> {live ? 'Live' : 'Reconnecting…'}</span>
          <Select value={filter} onChange={e=>setFilter(e.target.value)} className="w-36">
            <option value="ALL">All statuses</option>
            <option>WAITING</option><option>CALLED</option><option>PRINTING</option><option>COMPLETED</option>
          </Select>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Shop</span>
        <Select value={shopId} onChange={e=>setShopId(e.target.value)} className="w-64">
          {shops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
        </Select>
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1.5"><Timer className="h-3.5 w-3.5"/> Polling every 4s</span>
      </Card>

      {nextToken && (
        <Card className="overflow-hidden border-indigo-200">
          <div className="grid lg:grid-cols-[auto_1fr_auto] gap-4 p-5 items-center">
            <div className="text-center">
              <p className="text-xs tracking-widest text-slate-500">NOW SERVING</p>
              <p className="text-6xl font-black tracking-tighter leading-none">{nextToken.tokenNumber ?? '—'}</p>
              <Badge tone="brand" className="mt-2">{nextToken.status}</Badge>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-sm text-slate-500">{nextToken.type ?? 'PRINT'} • Shop {shopId.slice(0,8)}</p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center lg:justify-start">
                <Button onClick={()=>act(nextToken.id,'CALLED')}><Phone className="h-4 w-4"/> Call</Button>
                <Button onClick={()=>act(nextToken.id,'PRINTING')} variant="secondary"><Play className="h-4 w-4"/> Start printing</Button>
                <Button onClick={()=>act(nextToken.id,'COMPLETED')} variant="secondary" className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"><CheckCircle2 className="h-4 w-4"/> Complete</Button>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
              <p className="font-medium">Up next</p>
              <p className="text-slate-500">{tokens[1]?.tokenNumber ? `Token ${tokens[1].tokenNumber}` : '— queue clear after this'}</p>
            </div>
          </div>
        </Card>
      )}

      {err && <Alert>{err}</Alert>}

      <div className="grid gap-2">
        {filtered.map(t => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-16 items-center justify-center rounded-xl bg-slate-900 text-lg font-black tracking-tight text-white">{t.tokenNumber}</span>
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  {t.tokenNumber} <Badge tone={String(t.status)==='WAITING'?'warning':String(t.status)==='PRINTING'?'brand':String(t.status)==='COMPLETED'?'success':'neutral'}>{t.status}</Badge>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><Radio className="h-3 w-3"/> {t.type} • #{String(t.id).slice(0,6)}</p>
                {t.customerName && <p className="mt-0.5 text-xs font-medium text-indigo-700">👤 {t.customerName}{t.orderNumber ? <span className="mono text-slate-400"> • {t.orderNumber}</span> : null}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => act(t.id, 'CALLED')}><Phone className="h-3.5 w-3.5"/>Call</Button>
              <Button size="sm" onClick={() => act(t.id, 'PRINTING')}><Play className="h-3.5 w-3.5"/>Start</Button>
              <Button size="sm" variant="secondary" className="bg-emerald-600 text-white hover:bg-emerald-700 border-transparent" onClick={() => act(t.id, 'COMPLETED')}><CheckCircle2 className="h-3.5 w-3.5"/>Done</Button>
              <Button size="sm" variant="ghost" onClick={() => act(t.id, 'FAILED')}><AlertTriangle className="h-3.5 w-3.5"/>Fail</Button>
              <Button size="sm" variant="ghost" onClick={() => act(t.id, 'CANCELLED')}><XCircle className="h-3.5 w-3.5"/>Cancel</Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium">No tokens</p>
            <p className="text-xs text-slate-500">Queue is empty — new tokens appear automatically after orders are confirmed.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
