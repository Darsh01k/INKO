import { useEffect, useMemo, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Badge, Button, EmptyState, Skeleton, Input, Label, Select, toast } from '@/components/ui'
import { Tag, Save, Trash2, RefreshCw, TicketPercent, Plus } from 'lucide-react'

interface PricingRule {
  id: string; scope: string; shopId?: string | null
  paperSize: string; colorMode: string; sidesMode: string
  pricePerPage: number; specialPaperCharge?: number
  effectiveFrom?: string; effectiveTo?: string | null; active?: boolean
}
interface DiscountRule {
  id: string; name: string; scope: string; shopId?: string | null
  type: 'PERCENT' | 'FIXED' | string; value: number
  maxDiscountAmount?: number | null; minOrderAmount?: number | null; minPages?: number | null
  startsAt?: string; endsAt?: string | null; usageLimitTotal?: number | null; active?: boolean
}

const PAPERS = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL']
const COLORS: Array<'BW'|'COLOR'> = ['BW','COLOR']
const SIDES: Array<'SINGLE'|'DOUBLE'> = ['SINGLE','DOUBLE']
const todayIso = () => new Date().toISOString().slice(0,10)
const keyOf = (p:string,c:string,s:string)=>`${p}-${c}-${s}`

function priceKey(r: PricingRule){ return keyOf(r.paperSize, r.colorMode, r.sidesMode) }

export default function ShopPricing() {
  const [shops, setShops] = useState<any[]>([])
  const [shopId, setShopId] = useState('')
  const [rules, setRules] = useState<PricingRule[] | null>(null)
  const [discounts, setDiscounts] = useState<DiscountRule[] | null>(null)
  const [tab, setTab] = useState<'rules' | 'discounts'>('rules')
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState<string|null>(null)
  const [edits, setEdits] = useState<Record<string, { price:string, effectiveFrom:string }>>({})
  const [newDiscount, setNewDiscount] = useState({ name: '', type: 'PERCENT', value: 10, minOrderAmount: '', maxDiscountAmount: '' })

  useEffect(() => {
    api.get('/shops/mine').then(r => {
      setShops(r.data ?? [])
      if (r.data?.[0]) setShopId((p: string) => p || r.data[0].id)
    }).catch(() => {})
  }, [])

  function load() {
    if (!shopId) return
    setErr(''); setRules(null); setDiscounts(null)
    api.get('/pricing/rules').then(r => {
      const list = (r.data ?? []).filter((x: PricingRule) => x.shopId === shopId)
      setRules(list)
      const init: Record<string,{price:string,effectiveFrom:string}> = {}
      for (const paper of PAPERS) for (const c of COLORS) for (const s of SIDES) {
        const k = keyOf(paper,c,s)
        const found = list.find((x: PricingRule)=>priceKey(x)===k)
        init[k] = { price: found ? String(found.pricePerPage) : '', effectiveFrom: found?.effectiveFrom ?? todayIso() }
      }
      setEdits(init)
    }).catch(e => setErr(apiErrorMessage(e)))
    api.get('/discounts').then(r => setDiscounts((r.data ?? []).filter((x: DiscountRule) => x.shopId === shopId))).catch(e => setErr(apiErrorMessage(e)))
  }
  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [shopId])

  const ruleByKey = useMemo(()=>{
    const m = new Map<string,PricingRule>()
    for (const r of rules ?? []) m.set(priceKey(r), r)
    return m
  },[rules])

  async function saveRow(paper:string,color:string,sides:string){
    const k = keyOf(paper,color,sides)
    const e = edits[k]
    if (!e || e.price===''){ setErr(`Enter price for ${k.replaceAll('-',' · ')}`); return }
    const price = Number(e.price)
    if (isNaN(price) || price < 0){ setErr('Price must be >= 0'); return }
    const existing = ruleByKey.get(k)
    setBusyId(k); setErr('')
    try {
      if (existing){
        await api.put(`/pricing/rules/${existing.id}`, {
          scope:'SHOP', shopId, paperSize: paper, colorMode: color, sidesMode: sides,
          pricePerPage: price, effectiveFrom: e.effectiveFrom || todayIso(), active: true
        })
        toast('Price updated', 'success')
      } else {
        await api.post('/pricing/rules', {
          scope:'SHOP', shopId, paperSize: paper, colorMode: color, sidesMode: sides,
          pricePerPage: price, effectiveFrom: e.effectiveFrom || todayIso(), active: true
        })
        toast('Price created', 'success')
      }
      load()
    } catch(ex:any){
      const d = ex?.response?.data?.details
      const detailMsg = d ? ': ' + Object.entries(d).map(([kk,v])=>`${kk} ${v}`).join(', ') : ''
      setErr(apiErrorMessage(ex) + detailMsg)
    } finally { setBusyId(null) }
  }

  async function deleteRule(id: string) {
    try { await api.delete(`/pricing/rules/${id}`); toast('Rule deleted', 'info'); load() } catch (e) { setErr(apiErrorMessage(e)) }
  }
  async function createDiscount() {
    setErr('')
    try {
      await api.post('/discounts', {
        name: newDiscount.name || 'Season discount',
        scope: 'SHOP', shopId,
        type: newDiscount.type,
        value: Number(newDiscount.value),
        minOrderAmount: newDiscount.minOrderAmount ? Number(newDiscount.minOrderAmount) : null,
        maxDiscountAmount: newDiscount.maxDiscountAmount ? Number(newDiscount.maxDiscountAmount) : null,
        active: true,
      })
      toast('Discount created — attach a coupon code next if needed', 'success')
      setNewDiscount({ name: '', type: 'PERCENT', value: 10, minOrderAmount: '', maxDiscountAmount: '' })
      load()
    } catch (e) { setErr(apiErrorMessage(e)) }
  }
  async function addCoupon(discountId: string) {
    const code = window.prompt('Coupon code (e.g. SAVE20)')
    if (!code) return
    try { await api.post(`/discounts/${discountId}/coupon`, { code: code.toUpperCase(), usageLimitPerUser: 1 }); toast('Coupon ' + code.toUpperCase() + ' live', 'success') } catch (e) { setErr(apiErrorMessage(e)) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Tag className="h-6 w-6"/> Pricing & discounts</h1>
          <p className="text-sm text-slate-500">Your shop rates within admin boundaries • coupons validated at checkout</p>
        </div>
        <div className="flex gap-2">
          <Select value={shopId} onChange={e => setShopId(e.target.value)} className="w-56">
            {shops.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
          </Select>
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw className="h-4 w-4"/></Button>
        </div>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</Card>}

      <div className="grid w-fit grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
        {(['rules','discounts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 ${tab===t?'bg-white shadow-sm font-semibold':'text-slate-500 hover:text-slate-700'}`}>
            {t === 'rules' ? 'Price rules' : 'Discounts & coupons'}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">All pricing types — edit any price inline</h3>
              <p className="text-xs text-slate-500">Each row is one <b>paper × color × sides</b> type. Set price and Save. Green row = already priced, white = uses platform default until you Save.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={load}><RefreshCw className="h-3.5 w-3.5"/> Reload</Button>
          </div>
          {rules===null ? (
            <div className="p-4 space-y-2">{[1,2,3,4].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs tracking-widest text-slate-500">
                  <tr><th className="px-3 py-2.5 text-left">Paper</th><th className="px-3 py-2.5 text-left">Color</th><th className="px-3 py-2.5 text-left">Sides</th><th className="px-3 py-2.5 text-left w-32">₹/page *</th><th className="px-3 py-2.5 text-left w-36">Effective from</th><th className="px-3 py-2.5 text-left">Status</th><th className="px-3 py-2.5 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PAPERS.flatMap(paper=>COLORS.flatMap(color=>SIDES.map(sides=>{
                    const k = keyOf(paper,color,sides)
                    const existing = ruleByKey.get(k)
                    const e = edits[k] ?? { price:'', effectiveFrom: todayIso() }
                    const isExisting = !!existing
                    return (
                      <tr key={k} className={isExisting ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-2 font-medium">{paper}</td>
                        <td className="px-3 py-2"><Badge tone={color==='COLOR'?'brand':'neutral'}>{color}</Badge></td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{sides}</td>
                        <td className="px-3 py-2"><Input type="number" min={0} step={0.5} placeholder="—" value={e.price} onChange={ev=>setEdits(prev=>({...prev,[k]:{...prev[k], price: ev.target.value}}))} className="h-8" /></td>
                        <td className="px-3 py-2"><Input type="date" value={e.effectiveFrom} onChange={ev=>setEdits(prev=>({...prev,[k]:{...prev[k], effectiveFrom: ev.target.value}}))} className="h-8" /></td>
                        <td className="px-3 py-2">{isExisting ? <Badge tone="success">₹{existing!.pricePerPage}</Badge> : <Badge tone="neutral">default</Badge>}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant={isExisting?'secondary':'primary'} loading={busyId===k} onClick={()=>saveRow(paper,color,sides)}><Save className="h-3.5 w-3.5"/>{isExisting?'Update':'Save'}</Button>
                            {isExisting && <Button size="sm" variant="ghost" onClick={()=>deleteRule(existing!.id)}><Trash2 className="h-3.5 w-3.5"/></Button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 rounded-b-2xl">Tip: fill every type you support and click Save per row. Prices are editable anytime — Update re-saves. Effective from defaults to today.</div>
        </Card>
      )}

      {tab === 'discounts' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3">
            {(discounts ?? []).map(d => (
              <Card key={d.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold flex items-center gap-2"><TicketPercent className="h-4 w-4 text-indigo-600"/>{d.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{d.type === 'PERCENT' ? `${d.value}% off` : `₹${d.value} off`} {d.minOrderAmount ? `• min ₹${d.minOrderAmount}` : ''} {d.maxDiscountAmount ? `• cap ₹${d.maxDiscountAmount}` : ''}</p>
                  </div>
                  <Badge tone={d.active ? 'success' : 'neutral'}>{d.active ? 'ACTIVE' : 'PAUSED'}</Badge>
                </div>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => addCoupon(d.id)}>+ Attach coupon code</Button>
              </Card>
            ))}
            {discounts !== null && discounts.length === 0 && (
              <EmptyState icon={TicketPercent} title="No discounts yet" description="Create one on the right — then attach a coupon code customers can type at checkout." />
            )}
          </div>

          <Card className="h-fit p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4"/> New discount</h3>
            <div className="mt-4 space-y-3">
              <div><Label>Name</Label><Input value={newDiscount.name} onChange={e => setNewDiscount(p => ({...p, name: e.target.value}))} placeholder="Exam season offer" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label><Select value={newDiscount.type} onChange={e => setNewDiscount(p => ({...p, type: e.target.value}))}><option value="PERCENT">Percent %</option><option value="FIXED">Fixed ₹</option></Select></div>
                <div><Label>Value</Label><Input type="number" min={1} value={newDiscount.value} onChange={e => setNewDiscount(p => ({...p, value: Number(e.target.value)}))} /></div>
                <div><Label>Min order ₹</Label><Input type="number" min={0} value={newDiscount.minOrderAmount} onChange={e => setNewDiscount(p => ({...p, minOrderAmount: e.target.value}))} placeholder="—" /></div>
                <div><Label>Max cap ₹</Label><Input type="number" min={0} value={newDiscount.maxDiscountAmount} onChange={e => setNewDiscount(p => ({...p, maxDiscountAmount: e.target.value}))} placeholder="—" /></div>
              </div>
              <Button className="w-full" disabled={!shopId} onClick={createDiscount}>Create discount</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
