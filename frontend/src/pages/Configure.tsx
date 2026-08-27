import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Input, Label, Select, Badge, Alert, Stepper } from '@/components/ui'
import { Store, FileText, Calculator, Tag, Copy, Layers, Palette, BookOpen, Percent, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Configure() {
  const nav = useNavigate()
  const loc = useLocation() as any
  const [search] = useSearchParams()
  const qrShopId = search.get('shopId')
  const isReprint = Boolean(search.get('reprint'))
  const raw: any = loc.state
  const docs: any[] = Array.isArray(raw) ? raw : raw?.documents ?? raw?.data ?? (raw ? [raw] : [])
  const [shops, setShops] = useState<any[]>([])
  const [shopId, setShopId] = useState(qrShopId || '')
  const [paper, setPaper] = useState('A4')
  const [color, setColor] = useState('BW')
  const [sides, setSides] = useState('SINGLE')
  const [copies, setCopies] = useState(1)
  const [pages, setPages] = useState('ALL')
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState<string | null>(null)
  const [quote, setQuote] = useState<any>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const isLockedShop = !!qrShopId
  useEffect(() => { api.get('/shops').then(r => { setShops(r.data); if (!qrShopId && r.data[0]) setShopId(r.data[0].id); if (qrShopId) setShopId(qrShopId) }).catch(() => {}) }, [qrShopId])

  const selectedShop = shops.find(s=>s.id===shopId)

  useEffect(()=>{ if (shopId && docs.length){ const t=setTimeout(()=>{ preview() }, 600); return ()=>clearTimeout(t) } }, [shopId, paper, color, sides, copies, pages])

  // Expands selections like "1-5,8,10-12" into a true page total — mirrors backend parsing
  function countPages(sel: string, total: number) {
    if (!sel || sel.toUpperCase() === 'ALL') return total
    const sum = sel.split(',').reduce((n: number, part: string) => {
      const t = part.trim()
      if (!t) return n
      if (t.includes('-')) {
        const [a, b] = t.split('-').map(Number)
        return Number.isFinite(a) && Number.isFinite(b) ? n + Math.max(0, b - a + 1) : n
      }
      const v = Number(t)
      return Number.isFinite(v) ? n + 1 : n
    }, 0)
    return sum || total
  }

  async function preview() {
    if (!shopId) { setErr('Select a shop'); return null }
    setLoading(true); setErr('')
    const docPages = docs[0]?.pages ?? docs[0]?.pageCount ?? 5
    const parsedPages = countPages(pages, docPages)
    try {
      const res = await api.post('/pricing/quote', { shopId, paperSize: paper, colorMode: color, sidesMode: sides, pages: parsedPages, copies, specialPaper: false, couponCode: coupon.trim() ? coupon.trim().toUpperCase() : undefined })
      setQuote(res.data); setCouponApplied(coupon.trim() ? coupon.trim().toUpperCase() : null)
      return res.data
    } catch (e: any) { setErr(apiErrorMessage(e)); return null } finally { setLoading(false) }
  }

  async function proceed() {
    const docIds = docs.map((d: any) => d.id ?? d.documentId) as string[]
    if (!docIds.length || docIds[0]==null) { setErr('No documents — go back and upload again'); return }
    if (!shopId) { setErr('Select a shop'); return }
    let q = quote
    if (!q) q = await preview()
    if (!q) return
    const payload = {
      shopId,
      couponCode: coupon.trim() ? coupon.trim().toUpperCase() : undefined,
      items: docIds.map(id => ({ documentId: id, paperSize: paper, colorMode: color, sidesMode: sides, orientation: 'AUTO', pageSelection: pages, copies }))
    }
    setLoading(true)
    try {
      const res = await api.post('/orders', payload)
      nav(`/order/${res.data.id}`)
    } catch (e: any) { setErr(apiErrorMessage(e)) } finally { setLoading(false) }
  }

  if (!docs.length) {
    return (
      <div className="mx-auto max-w-3xl">
        <Stepper steps={['Upload','Configure','Preview','Pay']} current={1} />
        <Card className="mt-6 p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-semibold">No documents found</h3>
          <p className="mt-1 text-sm text-slate-500">You need to upload first — we use the analysis result to configure print options.</p>
          <Button className="mt-4" onClick={()=>nav('/upload')}>Go to upload</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-0 overflow-x-hidden">
      <div className="mb-6 overflow-x-auto">
        <Stepper steps={['Upload','Configure','Pay']} current={1} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] min-w-0">
        {/* Left - form — single flow: paper → calculate → confirm/pay */}
        <div className="space-y-5 min-w-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isReprint ? 'Reprint — configure' : 'Configure print'}</h1>
            <p className="mt-1 text-sm text-slate-500">{docs.length} document{docs.length>1?'s':''} • Choose paper & copies → tap <b>Calculate price</b> → Confirm & pay. That’s it.</p>
          </div>

          <Card className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4"/> {isLockedShop ? 'Shop — locked from QR' : 'Shop'}</h3>
            {isLockedShop ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                <Store className="h-5 w-5 text-emerald-700"/>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">{selectedShop ? `${selectedShop.name} — ${selectedShop.city ?? ''}` : `Shop ${qrShopId?.slice(0,8)}`}</p>
                  <p className="text-xs text-emerald-700">QR locked — your print will go only to this shop. No need to choose.</p>
                </div>
                <Badge tone="success" className="ml-auto">QR</Badge>
              </div>
            ) : (
              <div className="mt-3">
                <Label>Choose shop</Label>
                <Select value={shopId} onChange={e=>setShopId(e.target.value)}>
                  <option value="">Select shop</option>
                  {shops.map(s=> <option key={s.id} value={s.id}>{s.name} — {s.city} ({s.status})</option>)}
                </Select>
                {selectedShop && <p className="mt-2 text-xs text-slate-500">{selectedShop.name} — {selectedShop.city} • {selectedShop.supportsColor ? 'Color supported' : 'B&W only'}</p>}
              </div>
            )}
            {docs.length>0 && (
              <div className="mt-4 grid gap-2">
                {docs.slice(0,3).map((d,i)=>(
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-w-0 overflow-hidden">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate font-medium flex-1 min-w-0">{d.filename ?? d.fileName ?? d.name ?? `Document ${i+1}`}</span>
                    <Badge tone="neutral" className="ml-auto shrink-0">{d.pages ?? d.pageCount ?? '—'} pages</Badge>
                  </div>
                ))}
                {docs.length>3 && <p className="text-xs text-slate-500">+{docs.length-3} more</p>}
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Print options — keep it simple</h3>
            <p className="text-xs text-slate-500">First time? Just choose paper & copies — we handle the rest. Price shows instantly.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><Layers className="h-3.5 w-3.5"/> Paper size</span>
                <Select value={paper} onChange={e=>setPaper(e.target.value)}>
                  <option value="A4">A4 — most common</option><option value="A3">A3</option><option value="A5">A5</option><option value="LETTER">LETTER</option><option value="LEGAL">LEGAL</option>
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><Palette className="h-3.5 w-3.5"/> Color</span>
                <Select value={color} onChange={e=>setColor(e.target.value)}>
                  <option value="BW">Black & white (cheaper)</option><option value="COLOR">Color</option>
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><BookOpen className="h-3.5 w-3.5"/> Print on</span>
                <Select value={sides} onChange={e=>setSides(e.target.value)}>
                  <option value="SINGLE">One side</option><option value="DOUBLE">Both sides</option>
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><Copy className="h-3.5 w-3.5"/> Copies</span>
                <Input type="number" min={1} max={100} value={copies} onChange={e=>setCopies(Math.max(1, Number(e.target.value)||1))} />
              </label>
            </div>

            <div className="mt-4">
              <Label>Pages to print <span className="font-normal text-slate-500">— leave ALL for everything</span></Label>
              <Input value={pages} onChange={e=>setPages(e.target.value)} placeholder="ALL" />
              <p className="mt-1 text-xs text-slate-500">Tip: need only pages 1-5? Type 1-5. Blank pages auto-skipped.</p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Tag className="h-4 w-4"/> Coupon <span className="font-normal text-slate-400">— optional</span></h3>
            <div className="mt-3 flex gap-2">
              <Input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder="SAVE20 (leave blank to skip)" className="uppercase tracking-widest font-mono" />
              <Button variant="secondary" onClick={preview} loading={loading}>Apply</Button>
            </div>
            {couponApplied ? <p className="mt-2 text-xs text-emerald-700">Applied: {couponApplied}</p> : <p className="mt-2 text-xs text-slate-400">Optional — confirm works without coupon</p>}
            <p className="mt-1 text-xs text-slate-500">Coupons validated on preview; you can confirm directly.</p>
          </Card>

          {err && <Alert>{err}</Alert>}

          {quote && (
            <Card className="border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-widest text-emerald-700 font-semibold">YOU PAY — BEFORE PRINTING</p>
                <p className="text-2xl font-black text-emerald-900">₹{quote.finalAmount ?? quote.total ?? '—'} <span className="text-sm font-medium text-emerald-700">{quote.currency ?? 'INR'}</span></p>
                <p className="text-xs text-emerald-700">For {countPages(pages, docs[0]?.pages ?? docs[0]?.pageCount ?? 5)} pages × {copies} copies • includes taxes</p>
              </div>
              <Button onClick={proceed} size="lg" loading={loading} className="shrink-0">Yes, print — Confirm <ArrowRight className="h-4 w-4"/></Button>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={preview} size="lg" loading={loading} variant={quote?'secondary':'primary'} className="flex-1">
              <Calculator className="h-4 w-4" /> {quote ? 'Refresh price' : 'See price'}
            </Button>
            {!quote && <Button onClick={proceed} variant="secondary" size="lg" className="flex-1" loading={loading}>Confirm & print <ArrowRight className="h-4 w-4" /></Button>}
          </div>
          <p className="text-xs text-slate-500 text-center">Simple: upload → choose paper → see price → confirm. No hidden steps.</p>
        </div>

        {/* Right - sticky price card */}
        <div className="lg:sticky lg:top-[88px] h-fit space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4"/> Price breakdown</p>
              <p className="text-xs text-white/70">Live preview — taxes & discounts included</p>
            </div>
            {!quote ? (
              <div className="p-6">
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <Percent className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No preview yet</p>
                  <p className="text-xs text-slate-500">Choose a shop and hit Price preview to see costs</p>
                </div>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <li>• A4 B&W single side from ₹1/page</li>
                  <li>• Color + duplex charges apply</li>
                  <li>• No hidden fees</li>
                </ul>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">₹{quote.subtotal ?? quote.subTotal ?? '—'}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Paper</span><span>₹{quote.paperCharge ?? 0}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Color</span><span>₹{quote.colorCharge ?? 0}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Sides</span><span>₹{quote.sideCharge ?? quote.sidesCharge ?? 0}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Special paper</span><span>₹{quote.specialPaperCharge ?? 0}</span></div>
                  <div className="flex justify-between text-emerald-600"><span>Discount {couponApplied ? `(${couponApplied})` : ''}</span><span>-₹{quote.discountAmount ?? 0}</span></div>
                  <div className="flex justify-between"><span>Tax ({quote.taxPercent ?? quote.tax ?? 0}%)</span><span>₹{quote.taxAmount ?? 0}</span></div>
                  <div className="my-3 h-px bg-slate-200" />
                  <div className="flex justify-between text-[15px] font-bold"><span>Final</span><span>₹{quote.finalAmount ?? quote.total ?? quote.grandTotal ?? '—'} {quote.currency ?? 'INR'}</span></div>
                  {quote.breakdown && <p className="text-xs text-slate-500">{quote.breakdown}</p>}
                </div>
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-800">
                  <ShieldCheck className="inline h-3.5 w-3.5 mr-1"/> Explicit confirmation required — click Confirm to create order.
                </div>
                <Button onClick={proceed} className="mt-4 w-full" size="lg" loading={loading}>Confirm & pay <ArrowRight className="h-4 w-4"/></Button>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">What happens next</p>
            <ol className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">1</span> Order created → token issued</li>
              <li className="flex gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">2</span> Pay via UPI/COD</li>
              <li className="flex gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">3</span> Track live queue</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
