import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { UploadCloud, FileText, Image as ImageIcon, File, X, CheckCircle2, AlertTriangle, Eye, ArrowRight, Sparkles, QrCode } from 'lucide-react'
import { api, apiErrorMessage, tokens } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Card, Button, Badge, Progress, Alert, Stepper, Input, Label, toast } from '@/components/ui'
import { LogIn, UserPlus } from 'lucide-react'

type AnalysisResult = any

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['jpg','jpeg','png','webp'].includes(ext||'')) return ImageIcon
  if (ext==='pdf') return FileText
  return File
}
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`
  return `${(n/1024/1024).toFixed(1)} MB`
}

export default function Upload() {
  const nav = useNavigate()
  const [search] = useSearchParams()
  const { user, refreshMe } = useAuth()
  const preselectedShop = search.get('shopId') || null
  const fromQr = search.get('src') === 'qr' || Boolean(search.get('shopId'))
  const isGuest = !user || (user.email ?? '').endsWith('@guest.inko.local')
  const [guestTried, setGuestTried] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [nameBusy, setNameBusy] = useState(false)

  // Login-optional printing: silently mint a guest session so uploads work without an account
  useEffect(() => {
    if (user || guestTried || tokens.access) return
    setGuestTried(true)
    api.post('/auth/guest', {}).then(({ data }) => {
      tokens.set(data.accessToken, data.refreshToken)
      localStorage.setItem('inko.lastLoginRole', 'customer')
      return refreshMe()
    }).catch(() => {})
  }, [user, guestTried, refreshMe])
  const [files, setFiles] = useState<File[]>([])
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    const arr = Array.from(list)
    const over = arr.filter(f=>f.size>50*1024*1024)
    if (over.length) { setErr(`${over.length} file(s) exceed 50MB limit`); return }
    setFiles(prev => [...prev, ...arr].slice(0, 10))
    setErr('')
  }
  function removeAt(i: number) { setFiles(prev=> prev.filter((_,idx)=>idx!==i)) }

  async function doUpload() {
    if (!files.length) { setErr('Select at least one file'); return }
    setErr(''); setLoading(true); setProgress(0)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 95)) },
      })
      setResult(res.data); setProgress(100)
    } catch (e: any) { setErr(apiErrorMessage(e)) } finally { setLoading(false); setTimeout(()=>setProgress(0), 800) }
  }

  const docsArray: any[] = Array.isArray(result) ? result : result ? [result] : []
  // flatten possible shapes: result.documents, result.data, etc.
  const normalized: any[] = docsArray.length ? docsArray : (result?.documents ?? result?.data ?? [])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Stepper steps={['Upload','Configure','Preview','Pay']} current={0} />
      </div>

      {fromQr && preselectedShop && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <QrCode className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800"><span className="font-semibold">Scanned at shop #{String(preselectedShop).slice(0, 8)}</span> — upload below, and your live queue token appears right after payment. No account needed.</p>
        </div>
      )}

      {fromQr && isGuest && (
        <Card className="mb-4 p-4">
          <Label htmlFor="guestName">Your name <span className="font-normal text-slate-500">— so the shop knows whose print it is</span></Label>
          <div className="mt-1 flex gap-2">
            <Input id="guestName" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="e.g. Priya Sharma" maxLength={120} />
            <Button
              variant="secondary"
              loading={nameBusy}
              disabled={!guestName.trim()}
              onClick={async () => {
                setNameBusy(true)
                try {
                  if (!user) {
                    const { data } = await api.post('/auth/guest', {})
                    tokens.set(data.accessToken, data.refreshToken)
                    localStorage.setItem('inko.lastLoginRole', 'customer')
                    await api.patch('/users/me', { fullName: guestName.trim() })
                    await refreshMe()
                  } else {
                    await api.patch('/users/me', { fullName: guestName.trim() })
                    await refreshMe()
                  }
                  toast('Thanks! Your name will show on the queue token', 'success')
                } catch (e: any) { setErr(apiErrorMessage(e)) } finally { setNameBusy(false) }
              }}
            >
              Save name
            </Button>
          </div>
          {user && user.fullName !== 'Guest' && <p className="mt-2 text-xs text-emerald-700">Printing as <b>{user.fullName}</b> ✓</p>}
        </Card>
      )}

      {isGuest && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-indigo-900">Want to keep your order history & payment receipts?</p>
            <p className="text-xs text-indigo-700">Sign in or create a free account — printing works either way.</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/login?next=${encodeURIComponent(`/upload${preselectedShop ? `?shopId=${preselectedShop}&src=qr` : ''}`)}`} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"><LogIn className="h-4 w-4"/> Sign in</Link>
            <Link to={`/register?tab=register&next=${encodeURIComponent(`/upload${preselectedShop ? `?shopId=${preselectedShop}&src=qr` : ''}`)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><UserPlus className="h-4 w-4"/> Create account</Link>
          </div>
        </div>
      )}

      {preselectedShop && !fromQr && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-indigo-800"><span className="font-semibold">Shop pre-selected</span> via QR — your upload will be queued for this shop. You can change it in Configure.</p>
          <Link to="/upload" className="text-xs font-medium text-indigo-700 hover:underline">Clear</Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Upload documents</h1>
        <p className="text-sm text-slate-500">PDF, JPG, PNG, DOC, PPT, XLS, TXT — up to 50MB each, 10 files max. We’ll detect pages & blanks automatically.</p>
      </div>

      {/* Dropzone */}
      <Card className="mt-6 overflow-hidden">
        <div
          onDragOver={e=>{e.preventDefault(); setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files)}}
          className={`m-1 rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-10 ${drag ? 'border-[oklch(0.55_0.20_260)] bg-[oklch(0.97_0.02_260)]' : 'border-slate-200 bg-slate-50/50'}`}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
            <UploadCloud className={`h-7 w-7 ${drag ? 'text-[oklch(0.55_0.20_260)]' : 'text-slate-600'}`} />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold">Drop files here or browse</h3>
          <p className="mt-1 text-sm text-slate-500">We support scanned PDFs — blank pages are flagged for you</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 shadow">
            <UploadCloud className="h-4 w-4" /> Browse files
            <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={e=>addFiles(e.target.files)} />
          </label>
          <p className="mt-3 text-xs text-slate-400">Max 50MB per file • Encrypted in transit</p>
        </div>

        {/* File chips */}
        {files.length>0 && (
          <div className="border-t border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{files.length} file{files.length>1?'s':''} selected</p>
              <button onClick={()=>setFiles([])} className="text-xs font-medium text-slate-500 hover:text-slate-700">Clear all</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {files.map((f,i)=>{
                const Icon = fileIcon(f.name)
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                      <Icon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{f.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(f.size)} • {(f.type || '—').split('/').pop()?.toUpperCase()}</p>
                    </div>
                    <button onClick={()=>removeAt(i)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={`Remove ${f.name}`}>
                      <X className="h-4 w-4"/>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {loading && (
        <Card className="mt-4 p-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[oklch(0.55_0.20_260)]" />
            <span className="font-medium">Uploading & analyzing…</span>
            <span className="ml-auto text-xs text-slate-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="mt-3" />
        </Card>
      )}

      {err && <div className="mt-4"><Alert><span className="flex gap-2 items-center"><AlertTriangle className="h-4 w-4"/>{err}</span></Alert></div>}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={loading || files.length===0} onClick={doUpload} size="lg" loading={loading}>
          {loading ? 'Uploading…' : 'Upload & analyze'} {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
        {result && <Button variant="secondary" size="lg" onClick={()=>nav(`/configure${preselectedShop ? `?shopId=${preselectedShop}` : ''}`, { state: normalized.length? normalized : result })}>Continue to configure →</Button>}
        {files.length>0 && !result && <p className="flex items-center gap-1.5 text-xs text-slate-500"><Sparkles className="h-3.5 w-3.5"/> Analysis extracts page count & blank pages</p>}
      </div>

      {/* Result cards */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white"><CheckCircle2 className="h-5 w-5"/></div>
            <div>
              <p className="text-sm font-semibold">Analysis complete</p>
              <p className="text-xs text-slate-500">{normalized.length ? `${normalized.length} document(s) ready to configure` : 'Documents processed — review details below'}</p>
            </div>
            <Badge tone="success" className="ml-auto">Ready</Badge>
          </div>

          {/* If normalized has items, render card per doc */}
          {normalized.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {normalized.map((doc:any, idx:number)=>(
                <Card key={doc.id ?? idx} className="overflow-hidden">
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                      {doc.thumbnailUrl ? <img src={doc.thumbnailUrl} alt="" className="h-full w-full object-cover rounded-lg" /> : <FileText className="h-6 w-6 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                       <p className="truncate text-sm font-semibold">{doc.filename ?? doc.fileName ?? doc.name ?? `Document ${idx+1}`}</p>
                      <p className="text-xs text-slate-500">{doc.pages ?? doc.pageCount ?? '—'} pages • {doc.size ? formatBytes(doc.size) : doc.mimeType ?? 'PDF'}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="neutral">{doc.mimeType ?? 'document'}</Badge>
                        {Array.isArray(doc.blankPages) && doc.blankPages.length>0 && <Badge tone="warning"><AlertTriangle className="h-3 w-3 mr-1"/>{doc.blankPages.length} blank</Badge>}
                        {doc.pages && <Badge tone="brand">{doc.pages} pages</Badge>}
                      </div>
                      {Array.isArray(doc.blankPages) && doc.blankPages.length>0 && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">Blank pages detected: {doc.blankPages.join(', ')} — we’ll exclude them by default</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
                    <span className="text-xs text-slate-500">ID: <span className="mono text-slate-700">{String(doc.id ?? '').slice(0,8) || '—'}</span></span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Analyzed</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-sm font-medium flex items-center gap-2"><Eye className="h-4 w-4"/> Raw result</p>
              <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{JSON.stringify(result, null, 2)}</pre>
              <p className="mt-2 text-xs text-slate-500">We show a friendly card view when the API returns structured documents. This fallback keeps you unblocked.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
