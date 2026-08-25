import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Card, Button, Badge, Alert, Skeleton, Dialog, Label, Select, toast } from '@/components/ui'
import { CheckCircle2, Clock3, CreditCard, FileText, Printer, ArrowRight, AlertTriangle, Receipt, Ticket, ShieldCheck, LifeBuoy } from 'lucide-react'

// Timeline mirrors the real backend order lifecycle (OrderStatus enum)
const STEPS = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'PAYMENT', label: 'Payment' },
  { key: 'QUEUED', label: 'Queued' },
  { key: 'PRINTING', label: 'Printing' },
  { key: 'COMPLETED', label: 'Completed' },
] as const
function stepIndex(status: string | undefined) {
  const s = (status ?? '').toUpperCase()
  if (['COMPLETED', 'REFUNDED'].includes(s)) return 4
  if (s === 'PRINTING') return 3
  if (['TOKEN_GENERATED', 'QUEUED', 'ACCEPTED', 'CANCELLATION_REQUESTED', 'RETRY_PENDING'].includes(s)) return 2
  if (['PAID', 'COD_SELECTED', 'PAYMENT_PENDING', 'CONFIGURED'].includes(s)) return 1
  return 0
}

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  const [payMsg, setPayMsg] = useState('')
  const [payBusy, setPayBusy] = useState('')
  const [refunds, setRefunds] = useState<any[]>([])
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [category, setCategory] = useState('POOR_QUALITY')
  const [description, setDescription] = useState('')

  function loadAll() {
    api.get(`/orders/${id}`).then(r => setData(r.data)).catch(e => setErr(apiErrorMessage(e)))
    api.get(`/orders/${id}/refunds`).then(r => setRefunds(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }
  useEffect(() => { loadAll() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id])

  async function requestRefund() {
    setPayBusy('refund'); setPayMsg('')
    try {
      await api.post(`/orders/${id}/refund`, { reason: 'Customer requested refund' })
      toast('Refund requested — admin will review', 'success')
      loadAll()
    } catch (e: any) { setPayMsg(apiErrorMessage(e)) } finally { setPayBusy('') }
  }

  async function decideRefund(refundId: string, approve: boolean) {
    setPayBusy(refundId); setPayMsg('')
    try {
      await api.post(`/refunds/${refundId}/decision`, { decision: approve ? 'APPROVED' : 'REJECTED' })
      toast(approve ? 'Refund approved' : 'Refund rejected', 'success')
      loadAll()
    } catch (e: any) { setPayMsg(apiErrorMessage(e)) } finally { setPayBusy('') }
  }

  async function fileComplaint() {
    if (!description.trim()) return
    const order = data?.order ?? data
    try {
      await api.post('/complaints', { orderId: id, shopId: order?.shopId ?? order?.shop_id ?? '', category, description })
      toast('Complaint filed — we will update you here', 'success')
      setComplaintOpen(false); setDescription('')
    } catch (e: any) { toast(apiErrorMessage(e), 'error') }
  }

  async function pay(method: string) {
    setPayBusy(method); setPayMsg('')
    try {
      const r = await api.post(`/orders/${id}/payment`, { method })
      if (method !== 'COD') {
        const v = await api.post(`/payments/${r.data.id}/verify`, {})
        setPayMsg(`Payment ${v.data.status}`)
      } else {
        // COD is confirmed immediately server-side; there is nothing to verify online
        setPayMsg('Order confirmed — pay at the shop counter when you collect')
      }
      const fresh = await api.get(`/orders/${id}`)
      setData(fresh.data)
    } catch (e: any) { setPayMsg(apiErrorMessage(e)) } finally { setPayBusy('') }
  }

  if (err) return <div className="mx-auto max-w-3xl mt-8"><Alert>{err}</Alert></div>
  if (!data) return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )

  const order = data.order ?? data
  const items = data.items ?? order.items ?? []
  const snap = order.pricingSnapshot ?? order.pricing_snapshot ?? order.snapshot
  let parsedSnap: any = null
  try { parsedSnap = typeof snap === 'string' ? JSON.parse(snap) : snap } catch { parsedSnap = snap }

  const current = stepIndex(order.status)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-slate-900 px-6 py-5 text-white flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-white/60">ORDER</p>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5"/> {order.orderNumber ?? order.order_number ?? id}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <Badge tone={order.status==='COMPLETED'?'success':order.status==='CANCELLED'?'danger':'brand'}>{order.status}</Badge>
              <span>•</span>
              <span>₹{order.finalAmount ?? order.final_amount ?? '—'}</span>
              <span>•</span>
              <span className="text-white/60">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/queue/${order.shopId ?? order.shop_id}?order=${order.id}`}><Button variant="secondary" size="sm"><Ticket className="h-4 w-4"/> Track queue</Button></Link>
            <Link to="/history"><Button variant="ghost" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-white/20">History</Button></Link>
          </div>
        </div>

        {/* Timeline stepper */}
        <div className="px-6 py-5 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[520px]">
            {STEPS.map((s,i)=>(
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={`flex flex-col items-center gap-1.5 ${i<=current?'' : 'opacity-50'}`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${i < current ? 'bg-emerald-500 border-emerald-500 text-white' : i===current ? 'bg-[oklch(0.55_0.20_260)] border-[oklch(0.55_0.20_260)] text-white shadow' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {i < current ? <CheckCircle2 className="h-5 w-5"/> : i===current ? <Clock3 className="h-5 w-5"/> : <span className="text-xs font-bold">{i+1}</span>}
                  </div>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${i===current ? 'text-[oklch(0.55_0.20_260)]' : i<current ? 'text-emerald-700' : 'text-slate-500'}`}>{s.label}</span>
                </div>
                {i < STEPS.length-1 && <div className={`h-0.5 flex-1 ${i < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4"/> Items • {items.length || order.totalPages ? `${order.totalPages ?? items.length} pages` : 'Documents'}</h3>
            {items.length===0 ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Items payload unavailable — showing summary below. (API contract: /orders/:id returns items)</p>
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {items.map((it:any, idx:number)=>(
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white"><Printer className="h-4 w-4"/></div>
                      <div>
                        <p className="text-sm font-medium">{it.documentId?.slice(0,8) ?? `Item ${idx+1}`}</p>
                        <p className="text-xs text-slate-500">{it.copies ?? 1}× copies • {it.pageCount ?? '?'} pages</p>
                      </div>
                    </div>
                    <Badge tone="neutral">{items.length ? `Item ${idx + 1}` : '—'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Pricing snapshot</h3>
            {parsedSnap ? (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                {typeof parsedSnap === 'object' ? (
                  <div className="grid gap-1.5 text-sm">
                    {Object.entries(parsedSnap).map(([k,v])=>(
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g,' $1')}</span>
                        <span className="font-medium mono text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="overflow-auto text-xs leading-relaxed whitespace-pre-wrap">{String(parsedSnap)}</pre>
                )}
              </div>
            ) : (
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{order.pricingSnapshot ?? '— no snapshot —'}</pre>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4"/> Payment</h3>
            <p className="mt-1 text-xs text-slate-500">Choose a method — mock UPI is instant in dev, COD pays at shop.</p>
            <div className="mt-4 grid gap-2">
              <Button onClick={()=>pay('MOCK_UPI')} loading={payBusy==='MOCK_UPI'} className="w-full justify-between">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Pay with Mock UPI</span>
                <ArrowRight className="h-4 w-4"/>
              </Button>
              <Button onClick={()=>pay('COD')} loading={payBusy==='COD'} variant="secondary" className="w-full justify-between">
                <span>Pay at shop (COD)</span> <span className="text-xs text-slate-500">No online charge</span>
              </Button>
            </div>
            {payMsg && <div className="mt-3"><Alert tone={payMsg.toLowerCase().includes('success') || payMsg.toLowerCase().includes('verified') || payMsg.toLowerCase().includes('completed') ? 'success' : payMsg.toLowerCase().includes('error') ? 'error' : 'info'}>{payMsg}</Alert></div>}
            {refunds.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Refunds</p>
                {refunds.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <span>₹{r.amount} <span className="text-xs text-slate-500">{r.refundType ?? ''}</span></span>
                    <span className="flex items-center gap-2">
                      <Badge tone={r.status === 'COMPLETED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}>{r.status}</Badge>
                      {r.status === 'REQUESTED' && user?.roles.some(x => ['ADMIN','SUPER_ADMIN'].includes(x)) && (
                        <>
                          <Button size="sm" variant="secondary" loading={payBusy === r.id} onClick={() => decideRefund(r.id, true)}>Approve</Button>
                          <Button size="sm" variant="ghost" loading={payBusy === r.id} onClick={() => decideRefund(r.id, false)}>Reject</Button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
                        {['PAID', 'COD_SELECTED', 'TOKEN_GENERATED', 'QUEUED', 'ACCEPTED', 'PRINTING'].includes(order.status) && !refunds.some(r => r.status === 'REQUESTED') && (
              <Button variant="outline" className="mt-3 w-full" size="sm" loading={payBusy === 'refund'} onClick={requestRefund}>Request refund (10% fee)</Button>
            )}
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0"/> Payment verification is mocked — in production this hits Razorpay/UPI.
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><LifeBuoy className="h-4 w-4"/> Need help?</h3>
            <p className="mt-1 text-sm text-slate-500">Queue token not showing? Refresh queue or contact shop desk.</p>
            <Link to={`/queue/${order.shopId ?? order.shop_id}`} className="mt-3 inline-flex"><Button variant="outline" size="sm"><Ticket className="h-4 w-4"/> Open queue</Button></Link>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setComplaintOpen(true)}>File a complaint about this order</Button>
          </Card>
        </div>
      </div>

      <Dialog open={complaintOpen} onClose={() => setComplaintOpen(false)} title="File a complaint">
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              {['WRONG_PRINT', 'MISSING_PAGES', 'POOR_QUALITY', 'PAYMENT_ISSUE', 'REFUND_ISSUE', 'DELAY', 'SHOP_BEHAVIOR', 'PRINTER_ISSUE', 'OTHER'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <Label>What went wrong?</Label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the issue…" className="flex min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-sm focus:border-[oklch(0.55_0.20_260)] focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={fileComplaint} disabled={!description.trim()}>Submit complaint</Button>
            <Button variant="secondary" onClick={() => setComplaintOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
