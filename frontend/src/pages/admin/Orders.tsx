import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, Badge, Button, EmptyState, Skeleton, Select } from '@/components/ui'
import { FileText, RefreshCw, ChevronRight } from 'lucide-react'

interface ShopRow { id: string; name: string }
interface OrderRow {
  id: string
  orderNumber?: string
  status?: string
  finalAmount?: string | number
  createdAt?: string
  shopId?: string
  shopName?: string
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [error, setError] = useState(false)
  const [shopFilter, setShopFilter] = useState('all')
  const [shopNames, setShopNames] = useState<Record<string, string>>({})

  function load() {
    setError(false); setOrders(null)
    void (async () => {
      try {
        const shopsRes = await api.get<ShopRow[]>('/shops')
        const shops = shopsRes.data ?? []
        setShopNames(Object.fromEntries(shops.map(s => [s.id, s.name])))
        const lists = await Promise.all(shops.map(s =>
          api.get<OrderRow[]>(`/orders/shop/${s.id}`).then(r => (r.data ?? []).map(o => ({ ...o, shopId: o.shopId ?? s.id, shopName: s.name }))).catch(() => [] as OrderRow[]),
        ))
        const all = lists.flat().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        setOrders(all)
      } catch {
        setError(true)
      }
    })()
  }
  useEffect(load, [])

  const visible = (orders ?? []).filter(o => shopFilter === 'all' || o.shopId === shopFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500">Across all shops — newest first</p>
        </div>
        <div className="flex gap-2">
          {shopNames && Object.keys(shopNames).length > 0 && (
            <Select value={shopFilter} onChange={e => setShopFilter(e.target.value)} className="w-48">
              <option value="all">All shops</option>
              {Object.entries(shopNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
          )}
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>
      </div>

      {orders === null && !error && (
        <Card className="space-y-2 p-5">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</Card>
      )}

      {error && (
        <EmptyState icon={FileText} title="Could not load orders" description="Backend unreachable or the endpoint needs a live session — refresh to retry." action={<Button onClick={load}>Retry</Button>} />
      )}

      {orders !== null && visible.length === 0 && !error && (
        <EmptyState icon={FileText} title="No orders yet" description="Orders placed by customers appear here in real time." />
      )}

      {visible.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs tracking-widest text-slate-500">
                <tr><th className="px-4 py-3 text-left font-medium">Order</th><th className="px-4 py-3 text-left font-medium">Shop</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-left font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium mono text-xs">{o.orderNumber ?? o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-500">{o.shopName ?? o.shopId?.slice(0, 8) ?? '—'}</td>
                    <td className="px-4 py-3"><Badge tone={o.status === 'COMPLETED' ? 'success' : o.status === 'FAILED' || o.status === 'CANCELLED' ? 'danger' : 'brand'}>{o.status ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{o.finalAmount ?? '—'}</td>
                    <td className="px-4 py-3 text-right"><Link to={`/order/${o.id}`} className="inline-flex items-center text-[oklch(0.55_0.20_260)] hover:underline">Open <ChevronRight className="h-4 w-4" /></Link></td>
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
