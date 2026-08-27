import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '@/lib/api'
import { Skeleton } from '@/components/ui'
import { Store, AlertTriangle } from 'lucide-react'

export default function QrScan() {
  const { code } = useParams()
  const nav = useNavigate()
  const [err, setErr] = useState('')
  const [loading] = useState(true)

  useEffect(() => {
    if (!code) return
    api.get(`/qr/${code}/resolve`).then(r => {
      const shopId = r.data.shopId
      api.post(`/qr/${code}/scan`).catch(() => {})
      return api.get(`/shops/${shopId}`).then(s => s.data).catch(() => ({ id: shopId, name: 'Shop', city: null, status: 'OPEN', supportsColor: true }))
    }).then(async s => {
      try { localStorage.setItem('inko.qrShop', JSON.stringify({ shopId: s.id, name: s.name, code })) } catch { /* ignore */ }
      try {
        const hasToken = (()=>{ try{ return !!localStorage.getItem('inko.access_token') } catch { return false } })()
        if (!hasToken) {
          const { data } = await api.post('/auth/guest', {})
          try { localStorage.setItem('inko.access_token', data.accessToken); localStorage.setItem('inko.refresh_token', data.refreshToken); localStorage.setItem('inko.lastLoginRole','customer') } catch {}
        }
      } catch {}
      nav(`/upload?shopId=${s.id}&src=qr`, { replace: true })
    }).catch((e: any) => { setErr(apiErrorMessage(e) || 'Invalid or expired QR') })
  }, [code, nav])

  if (loading) return (
    <main className="mesh-gradient flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-md animate-pulse"><Store className="h-6 w-6 text-white" /></div>
      <p className="text-sm text-slate-500">Opening print dashboard…</p>
      <Skeleton className="h-2 w-40" />
    </main>
  )
  if (err) return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-2 text-xl font-bold">QR not found</h1>
      <p className="mt-1 text-sm text-slate-500">{err}</p>
      <Link to="/upload" className="mt-4 inline-block text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline">Continue without QR →</Link>
    </div>
  )
  return null
}
