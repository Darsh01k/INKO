import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Badge, Button, EmptyState, Skeleton, Input, Label, Select, toast } from '@/components/ui'
import { Tag, Plus, Trash2, RefreshCw, TicketPercent } from 'lucide-react'

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
const emptyRule = { paperSize: 'A4', colorMode: 'BW', sidesMode: 'SINGLE', pricePerPage: 2, specialPaperCharge: 0 }

export default function ShopPricing() {
  const [shops, setShops] = useState<any[]>([])
  const [shopId, setShopId] = useState('')
  const [rules, setRules] = useState<PricingRule[] | null>(null)
  const [discounts, setDiscounts] = useState<DiscountRule[] | null>(null)
  const [tab, setTab] = useState<'rules' | 'discounts'>('rules')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [newRule, setNewRule] = useState({ ...emptyRule })
  const [newDiscount, setNewDiscount] = useState({ name: '', type: 'PERCENT', value: 10, minOrderAmount: '', maxDiscountAmount: '' })

  useEffect(() => {
    api.get('/shops').then(r => {
      setShops(r.data ?? [])
      if (r.data?.[0]) setShopId((p: string) => p || r.data[0].id)
    }).catch(() => {})
  }, [])

  function load() {
    if (!shopId) return
    setErr(''); setRules(null); setDiscounts(null)
    api.get('/pricing/rules').then(r => setRules((r.data ?? []).filter((x: PricingRule) => x.shopId === shopId))).catch(e => setErr(apiErrorMessage(e)))
    api.get('/discounts').then(r => setDiscounts((r.data ?? []).filter((x: DiscountRule) => x.shopId === shopId))).catch(e => setErr(apiErrorMessage(e)))
  }
  useEffect(() => { load() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [shopId])

  async function createRule() {
    setBusy(true); setErr('')
    try {
      await api.post('/pricing/rules', { ...newRule, scope: 'SHOP', shopId, active: true })
      toast('Pricing rule created', 'success'); setNewRule({ ...emptyRule }); load()
    } catch (e) { setErr(apiErrorMessage(e)) } finally { setBusy(false) }
  }
  async function deleteRule(id: string) {
    try { await api.delete(`/pricing/rules/${id}`); toast('Rule deleted', 'info'); load() } catch (e) { setErr(apiErrorMessage(e)) }
  }
  async function createDiscount() {
    setBusy(true); setErr('')
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
    } catch (e) { setErr(apiErrorMessage(e)) } finally { setBusy(false) }
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
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs tracking-widest text-slate-500"><tr><th className="px-3 py-2.5 text-left">Paper</th><th className="px-3 py-2.5 text-left">Color</th><th className="px-3 py-2.5 text-left">Sides</th><th className="px-3 py-2.5 text-right">₹/page</th><th className="px-3 py-2.5 text-left">Status</th><th/></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(rules ?? []).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium">{r.paperSize}</td>
                      <td className="px-3 py-2.5"><Badge tone={r.colorMode === 'COLOR' ? 'brand' : 'neutral'}>{r.colorMode}</Badge></td>
                      <td className="px-3 py-2.5 text-slate-500">{r.sidesMode}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">₹{r.pricePerPage}</td>
                      <td className="px-3 py-2.5"><Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'ACTIVE' : 'OFF'}</Badge></td>
                      <td className="px-3 py-2.5 text-right"><Button size="sm" variant="ghost" onClick={() => deleteRule(r.id)}><Trash2 className="h-4 w-4"/></Button></td>
                    </tr>
                  ))}
                  {rules !== null && rules.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">No custom rules — platform default pricing applies.</td></tr>
                  )}
                </tbody>
              </table>
              {rules === null && !err && <div className="space-y-2 p-4">{[1,2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>}
            </div>
          </Card>

          <Card className="h-fit p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4"/> New price rule</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><Label>Paper</Label><Select value={newRule.paperSize} onChange={e => setNewRule(p => ({...p, paperSize: e.target.value}))}>{PAPERS.map(x => <option key={x}>{x}</option>)}</Select></div>
              <div><Label>Color</Label><Select value={newRule.colorMode} onChange={e => setNewRule(p => ({...p, colorMode: e.target.value}))}><option value="BW">B&W</option><option value="COLOR">Color</option></Select></div>
              <div><Label>Sides</Label><Select value={newRule.sidesMode} onChange={e => setNewRule(p => ({...p, sidesMode: e.target.value}))}><option value="SINGLE">Single</option><option value="DOUBLE">Double</option></Select></div>
              <div><Label>₹ per page</Label><Input type="number" min={0.5} step={0.5} value={newRule.pricePerPage} onChange={e => setNewRule(p => ({...p, pricePerPage: Number(e.target.value)}))} /></div>
            </div>
            <Button className="mt-4 w-full" loading={busy} disabled={!shopId} onClick={createRule}>Create rule</Button>
            <p className="mt-2 text-xs text-slate-500">Admin min/max A4 B&W bounds are enforced server-side.</p>
          </Card>
        </div>
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
              <Button className="w-full" loading={busy} disabled={!shopId} onClick={createDiscount}>Create discount</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
