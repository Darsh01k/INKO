import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, Badge, Button, EmptyState } from '@/components/ui'
import { Link } from 'react-router-dom'
import { Building2, Users, IndianRupee, Activity, Search, TrendingUp, ShieldCheck, RefreshCw, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [shops, setShops] = useState<any[]>([])
  const [health, setHealth] = useState<'UP' | 'DOWN' | null>(null)
  const [mix, setMix] = useState<any[]>([])
  const [series, setSeries] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')

  function load() {
    setErr('')
    api.get('/analytics/overview').then(r => setStats(r.data)).catch(e => setErr(String(e?.response?.data?.message ?? e.message)))
    api.get('/shops').then(r => setShops(r.data ?? [])).catch(() => {})
  }
  useEffect(load, [])

  useEffect(() => {
    api.get('/actuator/health').then(r => setHealth(r.data?.status === 'UP' ? 'UP' : 'DOWN')).catch(() => setHealth('DOWN'))
    api.get('/analytics/mix').then(r => setMix(r.data ?? [])).catch(() => setMix([]))
    api.get('/analytics/series', { params: { days: 7 } }).then(r => setSeries(r.data ?? [])).catch(() => setSeries([]))
  }, [])

  const maxRev = Math.max(1, ...series.map(s => Number(s.revenue ?? 0)))

  const filtered = shops.filter(s=> !q || `${s.name} ${s.city}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6"/> Admin console</h1>
          <p className="text-sm text-slate-500">Enterprise overview — live platform data</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4"/> Refresh</Button>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</Card>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="text-xs tracking-widest text-slate-500">TOTAL ORDERS</p><Activity className="h-4 w-4 text-slate-400"/></div>
          <p className="mt-2 text-2xl font-bold">{stats ? String(stats.totalOrders ?? 0) : '…'}</p>
          <p className="text-xs text-slate-500">All shops</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="text-xs tracking-widest text-slate-500">TOTAL REVENUE</p><IndianRupee className="h-4 w-4 text-slate-400"/></div>
          <p className="mt-2 text-2xl font-bold">{stats ? `₹${stats.totalRevenue ?? 0}` : '…'}</p>
          <p className="text-xs text-slate-500">Net after refunds</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="text-xs tracking-widest text-slate-500">SHOPS</p><Building2 className="h-4 w-4 text-slate-400"/></div>
          <p className="mt-2 text-2xl font-bold">{shops.length}</p>
          <p className="text-xs text-slate-500">{shops.filter(s=>s.status==='OPEN').length} open now</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="text-xs tracking-widest text-slate-500">ACTIVE USERS</p><Users className="h-4 w-4 text-slate-400"/></div>
          <p className="mt-2 text-2xl font-bold">{stats?.activeUsers != null ? String(stats.activeUsers) : '—'}</p>
          <p className="text-xs text-slate-500">{stats?.activeUsers == null ? 'Needs users-count analytics endpoint' : 'From live sessions'}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Shops</h3>
            <div className="relative w-64 max-w-[50%]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search shops…" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-[oklch(0.55_0.20_260)] focus:outline-none focus:ring-4 focus:ring-[oklch(0.55_0.20_260/0.12)]" />
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs tracking-widest text-slate-500"><tr><th className="px-3 py-2 text-left font-medium">Shop</th><th className="px-3 py-2 text-left font-medium">City</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2 text-right font-medium"></th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map(s=>(
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-slate-500">{s.city ?? '—'}</td>
                    <td className="px-3 py-2"><Badge tone={s.status==='OPEN'?'success':s.status==='CLOSED'?'neutral':'warning'}>{s.status}</Badge></td>
                    <td className="px-3 py-2 text-right"><Link to="/admin/shops" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">Manage</Link></td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">No shops found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">System health</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Backend API</span>{health === null
                ? <span className="text-xs text-slate-400">checking…</span>
                : <Badge tone={health === 'UP' ? 'success' : 'danger'}>{health === 'UP' ? 'Operational' : 'Unreachable'}</Badge>}
              </div>
              <div className="flex justify-between"><span>Database</span>{stats ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Unknown</Badge>}</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Source: GET /actuator/health + live analytics call.</p>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4"/> Revenue mix (pages by color)</h3>
            {mix.length === 0 ? (
              <EmptyState title="No mix data yet" description="Appears once orders with print configurations exist." />
            ) : (
              <div className="mt-4 space-y-3">
                {mix.map(m => (
                  <div key={m.mode}>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">{m.mode}</span><span className="font-medium">{m.sharePercent}% • {m.pages} pages</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${m.mode === 'COLOR' ? 'bg-indigo-600' : 'bg-slate-900'}`} style={{ width: `${m.sharePercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4"/> Orders & revenue — last 7 days</h3>
        {series.length === 0 ? (
          <EmptyState icon={BarChart3} title="No trend data yet" description="Bars appear as orders come in." />
        ) : (
          <>
            <div className="mt-5 flex items-end gap-2 h-36">
              {series.map((s, i) => {
                const v = Number(s.revenue ?? 0)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2" title={`${s.orders} orders • ₹${v}`}>
                    <div className="w-full rounded-xl bg-gradient-to-t from-indigo-600 to-indigo-400" style={{ height: `${Math.max(4, (v / maxRev) * 100)}%` }} />
                    <span className="text-[11px] text-slate-500">{String(s.date).slice(5)}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-indigo-600"/> Revenue per day • hover for order counts</p>
          </>
        )}
      </Card>
    </div>
  )
}
