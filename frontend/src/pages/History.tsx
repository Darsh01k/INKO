import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, Button, Badge, Input, Select, Skeleton, EmptyState } from '@/components/ui'
import { Search, History as HistoryIcon, Printer, Clock3, Filter, RefreshCw, FileText } from 'lucide-react'

export default function History() {
  const nav = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [shop, setShop] = useState('ALL')

  async function load() {
    setLoading(true)
    try { const r = await api.get('/orders'); setOrders(Array.isArray(r.data) ? r.data : r.data?.orders ?? []) } catch {} finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  const shops = useMemo(()=> Array.from(new Set(orders.map((o:any)=>o.shopId ?? o.shop_id).filter(Boolean))), [orders])

  const filtered = orders.filter(o=>{
    const s = (o.status ?? '').toUpperCase()
    const matchStatus = status==='ALL' || s===status
    const sid = o.shopId ?? o.shop_id
    const matchShop = shop==='ALL' || String(sid)===shop
    const hay = `${o.orderNumber ?? o.order_number ?? ''} ${o.status} ${s}`.toLowerCase()
    const matchQ = !q || hay.includes(q.toLowerCase())
    return matchStatus && matchShop && matchQ
  })

  async function printAgain(id: string) {
    // Real reprint: pull original items and jump straight into configure with them preselected
    try {
      const r = await api.get(`/orders/${id}`)
      const o = r.data?.order ?? r.data
      const items = r.data?.items ?? []
      const docs = items.map((it: any, i: number) => ({ id: it.documentId, fileName: `Reprint ${i + 1}`, pages: it.pageCount ?? 1 }))
      if (!docs.length || !docs[0].id) { window.location.href = `/order/${id}`; return }
      nav('/configure?reprint=' + id, { state: { reprint: true, documents: docs } })
      void o
    } catch { window.location.href = `/order/${id}` }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><HistoryIcon className="h-6 w-6 text-slate-700"/> Order history</h1>
          <p className="mt-1 text-sm text-slate-500">All your prints — search, filter and re-print in one tap.</p>
        </div>
        <Button variant="secondary" onClick={load}><RefreshCw className="h-4 w-4"/> Refresh</Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.6fr_0.6fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search order # or status" className="pl-10" />
          </div>
          <Select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option>DRAFT</option><option>PAYMENT_PENDING</option><option>CONFIRMED</option><option>PRINTING</option><option>COMPLETED</option><option>CANCELLED</option>
          </Select>
          <Select value={shop} onChange={e=>setShop(e.target.value)}>
            <option value="ALL">All shops</option>
            {shops.map((s:any)=> <option key={s} value={s}>{String(s).slice(0,8)}</option>)}
          </Select>
          <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex"><Filter className="h-3.5 w-3.5"/>{filtered.length} result{filtered.length!==1?'s':''}</div>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i=> <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length===0 ? (
        <EmptyState icon={FileText} title={orders.length===0 ? 'No orders yet' : 'No matching orders'} description={orders.length===0 ? 'Upload a document to create your first order — queue token issued instantly.' : 'Try adjusting filters or search.'} action={orders.length===0 ? <Link to="/upload"><Button>Upload a document</Button></Link> : <Button variant="secondary" onClick={()=>{setQ(''); setStatus('ALL'); setShop('ALL')}}>Clear filters</Button>} />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Order</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Shop</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map(o=>{
                    const id = o.id
                    const num = o.orderNumber ?? o.order_number ?? id.slice(0,8)
                    return (
                      <tr key={id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <Link to={`/order/${id}`} className="font-medium hover:underline mono text-slate-900">{num}</Link>
                          <p className="text-xs text-slate-500">{o.totalPages ?? o.total_pages ?? '—'} pages</p>
                        </td>
                        <td className="px-4 py-3"><Badge tone={o.status==='COMPLETED'?'success':o.status==='CANCELLED'?'danger':o.status==='PRINTING'?'info':'brand'}>{o.status}</Badge></td>
                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><Printer className="h-3.5 w-3.5 text-slate-400"/>{String(o.shopId ?? o.shop_id ?? '—').slice(0,8)}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</span></td>
                        <td className="px-4 py-3 text-right font-semibold">₹{o.finalAmount ?? o.final_amount ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <Link to={`/order/${id}`}><Button variant="secondary" size="sm">View</Button></Link>
                            <Button size="sm" onClick={()=>printAgain(id)}>Print again</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-3 sm:hidden">
            {filtered.map(o=>{
              const id=o.id
              return (
                <Link key={id} to={`/order/${id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium mono text-sm">{o.orderNumber ?? o.order_number ?? id.slice(0,8)}</p>
                      <p className="text-xs text-slate-500">{o.status} • {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</p>
                    </div>
                    <Badge tone={o.status==='COMPLETED'?'success':'brand'}>{o.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">₹{o.finalAmount ?? '—'}</span>
                    <span className="text-xs text-slate-500">{o.totalPages ?? ''} pages</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={(e)=>{e.preventDefault(); printAgain(id)}}>Print again</Button>
                    <Button variant="secondary" size="sm" className="flex-1">View</Button>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
