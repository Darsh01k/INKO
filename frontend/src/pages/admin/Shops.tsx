import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui'
import { Building2, MapPin, Palette, ChevronRight, RefreshCw } from 'lucide-react'

interface ShopRow { id: string; name: string; city: string | null; status: string; supportsColor?: boolean }

export default function AdminShops() {
  const [shops, setShops] = useState<ShopRow[] | null>(null)
  const [error, setError] = useState(false)
  function load() {
    setError(false); setShops(null)
    api.get<ShopRow[]>('/shops').then(r => setShops(r.data ?? [])).catch(() => setError(true))
  }
  useEffect(load, [])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shops</h1>
          <p className="text-sm text-slate-500">All registered shops on the platform</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {shops === null && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Card key={i} className="space-y-3 p-5"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-8 w-full" /></Card>)}</div>
      )}

      {error && (
        <EmptyState icon={Building2} title="Could not load shops" description={window.location.pathname.startsWith('/admin') ? 'Backend unreachable or session expired. If dev bypass is active the app retries a demo login automatically — refresh this page.' : undefined} action={<Button onClick={load}>Retry</Button>} />
      )}

      {shops !== null && shops.length === 0 && !error && (
        <EmptyState icon={Building2} title="No shops registered yet" description="Shops appear here as soon as shopkeepers are onboarded." />
      )}

      {shops !== null && shops.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(s => (
            <Card key={s.id} hover className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600"><Building2 className="h-5 w-5" /></span>
                  <div><h3 className="font-semibold leading-tight">{s.name}</h3><p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{s.city ?? '—'}</p></div>
                </div>
                <Badge tone={s.status === 'OPEN' ? 'success' : s.status === 'CLOSED' ? 'neutral' : 'warning'}>{s.status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Badge tone={s.supportsColor ? 'brand' : 'neutral'}>{s.supportsColor ? <span className="inline-flex items-center gap-1"><Palette className="h-3 w-3" /> Color</span> : 'B&W only'}</Badge>
                <span className="mono text-[11px] text-slate-400">{s.id.slice(0, 8)}</span>
              </div>
              <Link to={`/queue/${s.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[oklch(0.55_0.20_260)] hover:gap-1.5 transition-all">View live queue <ChevronRight className="h-4 w-4" /></Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
