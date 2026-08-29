import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, Badge } from '@/components/ui'
import { Ticket, Clock3, Users, Radio, AlertTriangle, CheckCircle2, Timer, Store } from 'lucide-react'

export default function Queue() {
  const { id: shopId } = useParams()
  const [sp] = useSearchParams()
  const orderId = sp.get('order')
  const [tokens, setTokens] = useState<any[]>([])
  const [mine, setMine] = useState<any>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let es: EventSource | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    async function load() {
      try {
        const r = await api.get(`/shops/${shopId}/queue`)
        setTokens(r.data ?? r.data?.tokens ?? [])
        if (orderId) {
          try { const t = await api.get(`/tokens/${orderId}`); setMine(t.data ?? t.data?.token) } catch {}
        }
      } catch {}
    }
    function startPoll(){ if(poll) clearInterval(poll); poll=setInterval(load, 2500) }
    function stopPoll(){ if(poll){ clearInterval(poll); poll=null } }
    load()
    startPoll()
    try {
      es = new EventSource(`/api/shops/${shopId}/queue/stream`)
      es.onopen = () => { setLive(true); stopPoll() }
      es.onerror = () => { setLive(false); startPoll() }
      es.addEventListener('token', load)
      es.addEventListener('connected', ()=>{ setLive(true); stopPoll() })
    } catch { setLive(false) }
    return () => { if(poll) clearInterval(poll); es?.close() }
  }, [shopId, orderId])

  const waiting = tokens.filter(t=> ['WAITING','QUEUED','PENDING'].includes(String(t.status).toUpperCase()))
  const position = mine ? Math.max(1, waiting.findIndex(t=> String(t.id)===String(mine.id))+1 || waiting.length+1) : null
  const estimate = (() => {
    if (!mine || !position) return '—'
    const myPages = mine.totalPages ?? mine.total_pages ?? 5
    const aheadTokens = waiting.slice(0, position-1)
    const pagesAhead = aheadTokens.reduce((s:number,t:any)=> s + (t.totalPages ?? t.total_pages ?? 3), 0)
    const mins = Math.max(1, Math.round(pagesAhead*0.4 + aheadTokens.length*1 + myPages*0.3))
    return `${mins} min`
  })()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Store className="h-6 w-6 text-slate-700"/> Queue — Shop <span className="mono text-[oklch(0.55_0.20_260)]">{shopId?.slice(0,8)}</span></h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${live? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <span className={`h-2 w-2 rounded-full ${live?'bg-emerald-500 animate-pulse':'bg-amber-500'}`} /> {live ? 'Live SSE' : 'Polling fallback'}
            </span>
            <span className="hidden sm:inline">Estimates are approximate • auto-refresh every 5s</span>
          </p>
        </div>
        <Link to={`/upload?shopId=${shopId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Ticket className="h-4 w-4"/> New print</Link>
      </div>

      {mine && (
        <Card className="overflow-hidden border-indigo-200">
          <div className={`px-6 py-5 text-white ${String(mine.status).toUpperCase()==='COMPLETED'?'bg-gradient-to-r from-emerald-600 to-teal-600': String(mine.status).toUpperCase()==='PRINTING'?'bg-gradient-to-r from-indigo-600 to-blue-600':'bg-gradient-to-r from-indigo-600 to-violet-600'}`}>
            <p className="text-xs tracking-widest text-white/70">YOUR TOKEN {String(mine.status).toUpperCase()==='PRINTING'?'• PRINTING STARTED': String(mine.status).toUpperCase()==='COMPLETED'?'• PRINT COMPLETED — COLLECT YOUR PRINT': String(mine.status).toUpperCase()==='CALLED'?'• CALLED — GO TO COUNTER':''}</p>
            <div className="mt-1 flex flex-wrap items-end gap-4">
              <p className="text-5xl font-black tracking-tight leading-none">{mine.tokenNumber ?? mine.token_number ?? '—'}</p>
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Badge tone="neutral" className="bg-white text-slate-900 border-white">{String(mine.status).toUpperCase()==='WAITING'?'Waiting': String(mine.status).toUpperCase()==='CALLED'?'Called': String(mine.status).toUpperCase()==='PRINTING'?'Printing…': String(mine.status).toUpperCase()==='COMPLETED'?'Done — collect': mine.status}</Badge>
                  <span className="text-white/80">Position #{position ?? '—'}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/80"><Timer className="h-3.5 w-3.5"/> Est. wait {estimate} {mine.totalPages ? `• ${mine.totalPages} pages` : ''}</p>
              </div>
              <div className="ml-auto hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
                <Ticket className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white text-center text-sm">
            <div className="px-4 py-3"><p className="text-xs text-slate-500">Shop</p><p className="font-medium truncate">{shopId?.slice(0,8)}</p></div>
            <div className="px-4 py-3"><p className="text-xs text-slate-500">Type</p><p className="font-medium">{mine.type ?? '—'}</p></div>
            <div className="px-4 py-3"><p className="text-xs text-slate-500">Status</p><p className="font-medium">{String(mine.status).toUpperCase()==='PRINTING'?'In progress': String(mine.status).toUpperCase()==='COMPLETED'?'Printed': mine.status}</p></div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4"/> Waiting • {tokens.length}</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Radio className="h-3.5 w-3.5"/> Live</span>
          </div>

          <div className="mt-4 grid gap-2">
            {tokens.length===0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium">No tokens waiting</p>
                <p className="text-xs text-slate-500">Queue is clear — your token will appear here.</p>
              </div>
            )}
            {tokens.map((t, idx)=>{
              const isMine = mine && String(t.id)===String(mine.id)
              return (
                <div key={t.id ?? idx} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isMine ? 'border-indigo-300 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black tracking-tight ${isMine ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>{t.tokenNumber ?? idx+1}</span>
                    <div>
                      <p className="text-sm font-semibold leading-none">{t.tokenNumber ?? `Token ${idx+1}`} {isMine && <Badge tone="brand" className="ml-2">You</Badge>}</p>
                      <p className="text-xs text-slate-500">{t.type ?? 'PRINT'} • {t.status} {t.estimatedWait ? `• ${t.estimatedWait} min` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Pos #{idx+1}</p>
                    <p className="text-xs font-medium">{
                      String(t.status).toUpperCase()==='PRINTING' ? 'Printing…' :
                      String(t.status).toUpperCase()==='CALLED' ? 'Called — go to counter' :
                      String(t.status).toUpperCase()==='COMPLETED' ? 'Done — collect' :
                      idx===0 ? 'Now serving' : `~${(idx+1)*2} min`
                    }</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><AlertTriangle className="h-3.5 w-3.5"/> Tokens advance automatically — keep this tab open for live updates.</p>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4"/> At a glance</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Waiting</p>
                <p className="text-2xl font-bold">{tokens.length}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-xs text-indigo-700">Your position</p>
                <p className="text-2xl font-bold text-indigo-700">{position ?? '—'}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Estimated wait</p>
                <p className="text-lg font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-slate-400"/>{estimate}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Need help?</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>• Token not appearing? Check Order detail.</li>
              <li>• Walk to counter when you’re within 2 positions.</li>
              <li>• SSE dot green = live connection.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
