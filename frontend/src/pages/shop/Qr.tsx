import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Badge, Alert, Dialog, Input, Label, toast } from '@/components/ui'
import { QrCode, RefreshCw, Download, Copy, Check, Store, ExternalLink, ScanLine } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function ShopQr() {
  const [shops, setShops] = useState<any[]>([])
  const [shopId, setShopId] = useState('')
  const [qrs, setQrs] = useState<any[]>([])
  const [scanEvents, setScanEvents] = useState<any[]>([])
  const [lanIp, setLanIp] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopCity, setShopCity] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

  useEffect(() => {
    api.get('/net/lan-ip').then(r => setLanIp(r.data.ip)).catch(() => {})
    api.get('/shops/mine').then(r => {
      setShops(r.data ?? [])
      if (r.data?.[0]) setShopId(r.data[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => { if (shopId) load() }, [shopId])

  async function createShop() {
    if (!shopName.trim()) { setErr('Give your shop a name first'); return }
    setCreateBusy(true); setErr('')
    try {
      const { data } = await api.post('/shops', { name: shopName.trim(), city: shopCity.trim() || undefined })
      setShops(prev => [...prev, data])
      setShopId(data.id)
      toast('Shop created! Now generate your QR code below.', 'success')
    } catch (e: any) { setErr(apiErrorMessage(e)) } finally { setCreateBusy(false) }
  }

  async function load() {
    try { const r = await api.get(`/shops/${shopId}/qr`); setQrs(r.data ?? []) } catch (e: any) { setErr(apiErrorMessage(e)) }
    api.get(`/shops/${shopId}/qr/scans`).then(r => setScanEvents(r.data ?? [])).catch(() => {})
  }

  async function generate() {
    setLoading(true); setErr('')
    try { await api.post(`/shops/${shopId}/qr`); await load() } catch (e: any) { setErr(apiErrorMessage(e)) } finally { setLoading(false) }
  }

  async function regenerate(id: string) {
    try { await api.post(`/qr/${id}/regenerate`); await load() } catch (e: any) { setErr(apiErrorMessage(e)) }
  }

  function qrUrl(code: string) {
    // Phones on the same Wi-Fi can't reach "localhost" — encode the PC's LAN IP instead
    const host = lanIp && window.location.hostname === 'localhost' ? lanIp : window.location.hostname
    return `${window.location.protocol}//${host}${window.location.port ? ':' + window.location.port : ''}/qr/${code}`
  }
  function shopPrintUrl(shopId: string) { return `${window.location.origin}/shops/${shopId}/print` }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(text); setTimeout(() => setCopied(''), 1500)
  }

  function downloadSvg(code: string) {
    const svg = document.getElementById(`qr-${code}`) as any
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `inko-qr-${code}.svg`; a.click(); URL.revokeObjectURL(url)
  }

  const active = qrs.find(q => q.status === 'ACTIVE')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><QrCode className="h-6 w-6" /> QR codes</h1>
        <p className="text-sm text-slate-500">Generate a QR that opens your shop’s print page in any browser — customers scan, upload, and print.</p>
      </div>

      {shops.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900"><Store className="h-5 w-5 text-white" /></span>
            <div>
              <h2 className="text-sm font-semibold">Set up your shop first</h2>
              <p className="mt-0.5 text-xs text-slate-500">Register your print shop to unlock QR codes, queue management and pricing.</p>
            </div>
          </div>
          {err && <Alert tone="error" className="mt-4">{err}</Alert>}
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="newShopName">Shop name</Label>
              <Input id="newShopName" value={shopName} onChange={e => setShopName(e.target.value)} maxLength={150} placeholder="e.g. Sharma Digital Xerox" />
            </div>
            <div>
              <Label htmlFor="newShopCity">City <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input id="newShopCity" value={shopCity} onChange={e => setShopCity(e.target.value)} maxLength={80} placeholder="e.g. Bengaluru" />
            </div>
            <Button loading={createBusy} onClick={createShop}><Store className="h-4 w-4" /> Create my shop</Button>
          </div>
        </Card>
      ) : (
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-slate-400" />
            <select value={shopId} onChange={e => setShopId(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              {shops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
            </select>
          </div>
          <Button onClick={() => (active ? setRegenOpen(true) : generate())} disabled={!shopId || loading}><QrCode className="h-4 w-4" /> {active ? 'Generate new QR (replaces old)' : 'Generate QR'}</Button>
          {shopId && <a href={shopPrintUrl(shopId)} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-[oklch(0.55_0.20_260)] hover:underline"><ExternalLink className="h-4 w-4" /> Open shop print page</a>}
        </div>
        {err && <Alert tone="error" className="mt-3">{err}</Alert>}
        {lanIp && lanIp !== '127.0.0.1' && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            <b>Scanning from a phone?</b> Make sure this PC and the phone are on the same Wi-Fi. The QR below points to <span className="mono">{`http://${lanIp}:5173`}</span> — if it doesn't open, start the dev server with LAN access enabled (it already is: <span className="mono">host: true</span>) and allow Node through Windows Firewall.
          </div>
        )}
      </Card>
      )}

      {active ? (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="p-6 flex flex-col items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <QRCodeSVG id={`qr-${active.codeValue}`} value={qrUrl(active.codeValue)} size={240} level="H" />
            </div>
            <p className="mt-3 font-mono text-sm font-medium tracking-widest">{active.codeValue}</p>
            <Badge tone="success" className="mt-1">{active.status}</Badge>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => copy(qrUrl(active.codeValue))}>{copied === qrUrl(active.codeValue) ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link</Button>
              <Button variant="secondary" onClick={() => downloadSvg(active.codeValue)}><Download className="h-4 w-4" /> SVG</Button>
              <Button variant="ghost" onClick={() => setRegenOpen(true)}><RefreshCw className="h-4 w-4" /> Regenerate</Button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Scan with phone camera → opens<br /><span className="font-mono">{qrUrl(active.codeValue)}</span></p>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ScanLine className="h-4 w-4" /> How it works</h3>
              <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-slate-600">
                <li>Print this QR and place it at your counter.</li>
                <li>Customer scans with phone camera — no app needed.</li>
                <li>Browser opens <span className="font-mono text-xs">/shops/{shopId.slice(0,8)}…/print</span> with your shop pre-selected.</li>
                <li>They upload, configure, pay, and get a queue token — you see it in <span className="font-medium">Shop → Queue</span>.</li>
              </ol>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Old QRs stay in history as <Badge tone="neutral">REPLACED</Badge> — existing orders keep working. New scans always use the <Badge tone="success">ACTIVE</Badge> code.
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ScanLine className="h-4 w-4" /> Scan history — kept across regenerations</h3>
              {scanEvents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No scans yet — every phone scan of your counter QR is logged here, including scans of old replaced QRs.</p>
              ) : (
                <div className="mt-3 overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500"><tr><th className="py-1.5 text-left font-medium">When</th><th className="py-1.5 text-left font-medium">Scanned by</th><th className="py-1.5 text-left font-medium">QR</th><th className="py-1.5 text-left font-medium">IP</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {scanEvents.map(s => (
                        <tr key={s.id}>
                          <td className="py-1.5 pr-2 text-slate-600">{new Date(s.scannedAt).toLocaleString()}</td>
                          <td className="py-1.5 pr-2 font-medium text-slate-800">{s.userName || 'Guest / anonymous'}</td>
                          <td className="py-1.5 pr-2"><span className="mono">{s.codeValue}</span> <Badge tone={s.qrStatus === 'ACTIVE' ? 'success' : 'neutral'}>{s.qrStatus || 'OLD'}</Badge></td>
                          <td className="py-1.5 mono text-slate-400">{s.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold">History</h3>
              <div className="mt-3 grid gap-2">
                {qrs.map(q => (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <span className="font-mono font-medium">{q.codeValue}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={q.status === 'ACTIVE' ? 'success' : q.status === 'REPLACED' ? 'neutral' : 'warning'}>{q.status}</Badge>
                      <span className="text-xs text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-10 text-center">
          <QrCode className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-medium">No QR yet</p>
          <p className="text-sm text-slate-500">Generate one to let customers scan-and-print at this shop.</p>
        </Card>
      )}

      <Dialog open={regenOpen} onClose={() => !regenBusy && setRegenOpen(false)} title="Regenerate QR code?">
        <div className="space-y-4">
          <Alert tone="warning">
            The currently printed QR stops working immediately. Customers who scanned the old code earlier are unaffected — their orders and tokens keep working.
          </Alert>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            Scan history (who scanned, when, from which QR) is preserved and stays visible under the new QR.
          </div>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              loading={regenBusy}
              onClick={async () => {
                setRegenBusy(true)
                try { await regenerate(active?.id ?? ''); setRegenOpen(false) } finally { setRegenBusy(false) }
              }}
            >
              Yes, regenerate
            </Button>
            <Button variant="secondary" onClick={() => setRegenOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
