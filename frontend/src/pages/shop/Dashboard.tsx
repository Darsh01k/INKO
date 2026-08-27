import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Card, Button, Badge, EmptyState, Skeleton, Select } from '@/components/ui'
import { Users, IndianRupee, Store, Activity, Clock3, Timer, Printer, Boxes } from 'lucide-react'
import { useSettings } from '@/lib/settings'

function KPI({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon className="h-4 w-4"/></div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </Card>
  )
}

interface RevenuePoint { date?: string; day?: string; total?: string | number; revenue?: string | number }

export default function ShopDashboard() {
  const { t } = useSettings()
  const [stats, setStats] = useState<any>(null)
  const [shops, setShops] = useState<any[]>([])
  const [shopId, setShopId] = useState('')
  const [queuePreview, setQueuePreview] = useState<any[]>([])
  const [queueCount, setQueueCount] = useState(0)
  const [orders, setOrders] = useState<any[]>([])
  const [revenue, setRevenue] = useState<RevenuePoint[] | null>(null)
  const [printers, setPrinters] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/analytics/overview').then(r => setStats(r.data)).catch(e => setErr(apiErrorMessage(e)))
    api.get('/shops/mine').then(r => {
      setShops(r.data ?? [])
      if (r.data?.[0]) setShopId((prev: string) => prev || r.data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!shopId) return
    setQueuePreview([]); setQueueCount(0); setOrders([]); setRevenue(null)
    loadShopData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId])

  function loadShopData() {
    api.get(`/shops/${shopId}/queue`).then(q => { setQueuePreview(q.data?.slice(0, 3) ?? []); setQueueCount(q.data?.length ?? 0) }).catch(() => {})
    api.get(`/orders/shop/${shopId}`).then(r => setOrders((Array.isArray(r.data) ? r.data : []).slice(0, 5))).catch(() => {})
    api.get(`/shops/${shopId}/printers`).then(r => setPrinters(r.data ?? [])).catch(() => {})
    api.get(`/shops/${shopId}/inventory`).then(r => setInventory(r.data ?? [])).catch(() => {})
    api.get('/analytics/series', { params: { shopId, days: 7 } }).then(s => setRevenue(s.data ?? [])).catch(() => setRevenue([]))
  }

  const maxRev = Math.max(1, ...(revenue ?? []).map(p => Number(p.total ?? p.revenue ?? 0)))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Store className="h-6 w-6"/> {t('shopDashboard')}</h1>
          <p className="text-sm text-slate-500">{t('queueFirstOps')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shops.length > 0 && (
            <Select value={shopId} onChange={e => setShopId(e.target.value)} className="w-56">
              {shops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
            </Select>
          )}
          <Link to="/shop/queue"><Button><Activity className="h-4 w-4"/> {t('manageQueue')}</Button></Link>
        </div>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</Card>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI icon={Users} label={t('platformOrders')} value={stats ? String(stats.totalOrders ?? stats.todayOrders ?? 0) : '…'} sub={stats?.todayOrders != null ? t('todaySuffix').replace('{n}', String(stats.todayOrders)) : undefined} />
        <KPI icon={IndianRupee} label={t('platformRevenue')} value={stats ? `₹${stats.totalRevenue ?? 0}` : '…'} sub={t('netOfRefunds')} />
        <KPI icon={Store} label={t('shopsLabel')} value={stats ? String(stats.totalShops ?? shops.length) : String(shops.length)} sub={t('openNow').replace('{n}', String(shops.filter(s => s.status === 'OPEN').length))} />
        <KPI icon={Timer} label={t('inQueue')} value={String(queueCount)} sub={queueCount > 0 ? t('shownBelow').replace('{n}', String(queuePreview.length)) : t('topTokensLive')} />
      </div>

      {!stats && !err && (
        <Card className="space-y-3 p-5"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-20 w-full" /></Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('revenueByDay')}</h3>
            <Badge tone="neutral">INR</Badge>
          </div>
          {revenue === null ? (
            <div className="mt-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : revenue.length === 0 ? (
            <EmptyState icon={IndianRupee} title={t('noRevenueYet')} description={t('noRevenueDesc')} />
          ) : (
            <div className="mt-6 flex items-end gap-2 h-36">
              {revenue.map((p, i) => {
                const v = Number(p.total ?? p.revenue ?? 0)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2" title={`₹${v}`}>
                    <div className="w-full rounded-xl bg-gradient-to-t from-indigo-600 to-indigo-400" style={{ height: `${Math.max(4, (v / maxRev) * 100)}%` }} />
                    <span className="text-[11px] text-slate-500">{(p.date ?? p.day ?? '').slice(5) || i + 1}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-indigo-600"/> {t('revenuePerDay')}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4"/> {t('queueNow')}</h3>
            {queuePreview.length===0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {t('noTokensClear')}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {queuePreview.map((t:any,i)=>(
                  <div key={t.id ?? i} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                    <span className="font-bold">{t.tokenNumber ?? i+1}</span>
                    <Badge tone="brand">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Link to="/shop/queue" className="mt-3 inline-flex text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline">{t('openQueue')}</Link>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Printer className="h-4 w-4"/> {t('printers')}</h3>
            {printers.length === 0 ? (
              <EmptyState icon={Boxes} title={t('noPrinters')} description={t('noPrintersDesc')} />
            ) : (
              <div className="mt-3 space-y-2">
                {printers.map(pr => (
                  <div key={pr.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{pr.name}</p>
                      <p className="text-xs text-slate-500">{pr.model ?? '—'} • {pr.paperSizes?.join(', ') || 'sizes unset'}</p>
                    </div>
                    <select
                      value={pr.status}
                      onChange={e => api.patch(`/shops/${shopId}/printers/${pr.id}`, { status: e.target.value }).then(loadShopData)}
                      className={`rounded-lg border px-2 py-1 text-xs ${pr.status === 'ERROR' ? 'border-red-200 bg-red-50 text-red-700' : pr.status === 'PRINTING' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                    >
                      {['IDLE','ONLINE','PRINTING','OFFLINE','ERROR','MAINTENANCE'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4"/> {t('paperInventory')}</h3>
            {inventory.length === 0 ? (
              <EmptyState title={t('noStockTracked')} description={t('noStockDesc')} />
            ) : (
              <div className="mt-3 space-y-2">
                {inventory.map(row => {
                  const low = row.quantitySheets <= row.lowStockThreshold
                  return (
                    <div key={row.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${low ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                      <span className="text-sm">{row.paperSize}{row.gsm ? ` • ${row.gsm}gsm` : ''}</span>
                      <span className="flex items-center gap-2 text-sm">
                        <button onClick={() => api.put(`/shops/${shopId}/inventory`, { paperSize: row.paperSize, gsm: row.gsm, quantitySheets: Math.max(0, row.quantitySheets - 50), lowStockThreshold: row.lowStockThreshold }).then(loadShopData)} className="h-6 w-6 rounded-lg border border-slate-200 hover:bg-slate-50">−</button>
                        <b>{row.quantitySheets}</b>
                        <button onClick={() => api.put(`/shops/${shopId}/inventory`, { paperSize: row.paperSize, gsm: row.gsm, quantitySheets: row.quantitySheets + 50, lowStockThreshold: row.lowStockThreshold }).then(loadShopData)} className="h-6 w-6 rounded-lg border border-slate-200 hover:bg-slate-50">+</button>
                        {low && <Badge tone="warning">{t('lowBadge')}</Badge>}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Clock3 className="h-4 w-4"/> {t('recentOrders')}</h3>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t('noOrdersShop')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">{t('tableOrder')}</th><th className="px-3 py-2 text-left">{t('tableStatus')}</th><th className="px-3 py-2 text-left">{t('tableDate')}</th><th className="px-3 py-2 text-right">{t('tableAmount')}</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 mono text-xs">{o.orderNumber ?? o.id.slice(0, 8)}</td>
                    <td className="px-3 py-2"><Badge tone={o.status==='COMPLETED'?'success':o.status==='CANCELLED'?'danger':'brand'}>{o.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-right">₹{o.finalAmount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
