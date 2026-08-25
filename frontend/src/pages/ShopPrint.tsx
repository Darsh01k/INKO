import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Badge } from '@/components/ui'
import { Store, MapPin, Printer, Clock, ArrowRight, QrCode, AlertTriangle } from 'lucide-react'

export default function ShopPrint() {
  const { shopId } = useParams()
  const nav = useNavigate()
  const [shop, setShop] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!shopId) return
    api.get(`/shops/${shopId}`).then(r => setShop(r.data)).catch(e => setErr(apiErrorMessage(e)))
  }, [shopId])

  if (err) return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-2 text-xl font-bold">Shop not available</h1>
      <p className="mt-1 text-sm text-slate-500">{err}</p>
      <Link to="/upload" className="mt-4 inline-block text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline">Continue without a shop →</Link>
    </div>
  )
  if (!shop) return <div className="p-6 text-sm text-slate-500">Loading shop…</div>

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Store className="h-7 w-7" />
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <Badge tone="neutral" className="bg-white text-indigo-700">{shop.status}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-indigo-100"><MapPin className="h-4 w-4" />{shop.city ?? '—'} • {shop.supportsColor ? 'Color & B&W' : 'B&W only'}</p>
        </div>
        <div className="p-6">
          <h2 className="text-sm font-semibold">Print at this shop</h2>
          <p className="mt-1 text-sm text-slate-500">Upload your document — it will be queued for this shop only. You’ll get a token and can track the queue live.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 text-center"><Printer className="mx-auto h-5 w-5" /><p className="mt-1 text-xs font-medium">All sizes</p><p className="text-xs text-slate-500">A4 • A3 • Letter</p></div>
            <div className="rounded-xl border border-slate-200 p-4 text-center"><Clock className="mx-auto h-5 w-5" /><p className="mt-1 text-xs font-medium">Live queue</p><p className="text-xs text-slate-500">Token + wait est.</p></div>
            <div className="rounded-xl border border-slate-200 p-4 text-center"><QrCode className="mx-auto h-5 w-5" /><p className="mt-1 text-xs font-medium">Scan again</p><p className="text-xs text-slate-500">Share this page</p></div>
          </div>

          <Button onClick={() => nav(`/upload?shopId=${shop.id}`)} className="mt-6 w-full">Start printing — upload document <ArrowRight className="h-4 w-4" /></Button>
          <p className="mt-2 text-center text-xs text-slate-500">Shop pre-selected • you can change it in the next step</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/upload?shopId=${shop.id}`} className="text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline">Upload →</Link>
            <span className="text-slate-300">•</span>
            <Link to="/history" className="text-sm font-medium text-slate-600 hover:underline">My orders</Link>
            <span className="text-slate-300">•</span>
            <Link to={`/queue/${shop.id}`} className="text-sm font-medium text-slate-600 hover:underline">View queue</Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
