import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Input, Label, Badge, Dialog } from '@/components/ui'
import { Store, Plus, Pencil, Trash2, MapPin, Save, Boxes, XCircle } from 'lucide-react'
import MapPicker from '@/components/MapPicker'
import { CountryCode, fullPhone } from '@/components/PhoneInput'

type Shop = {
  id: string; name: string; city: string | null; status: string
  addressLine1?: string | null; addressLine2?: string | null; state?: string | null; pincode?: string | null
  latitude?: number | null; longitude?: number | null; phone?: string | null; email?: string | null
}
const PAPERS_ALL = ['A4','A3','A5','LETTER','LEGAL'] as const

export default function ShopManage() {
  const [shops, setShops] = useState<Shop[] | null>(null)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<Shop | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null)
  const [deletePwd, setDeletePwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'', phone:'', latitude:'', longitude:'' })
  const [editForm, setEditForm] = useState({ name:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'', phone:'', latitude:'', longitude:'' })
  const [ccForm, setCcForm] = useState('+91')
  const [ccEdit, setCcEdit] = useState('+91')
  const [showMap, setShowMap] = useState(false)
  const [showEditMap, setShowEditMap] = useState(false)
  const [resourceShop, setResourceShop] = useState<Shop | null>(null)
  const [inventory, setInventory] = useState<any[] | null>(null)
  const [staged, setStaged] = useState<any[] | null>(null)
  const [resBusy, setResBusy] = useState(false)

  async function load() {
    setErr('')
    try { const r = await api.get('/shops/mine'); setShops(r.data ?? []) } catch(e:any){ setErr(apiErrorMessage(e)) }
  }
  function loadInventory(shopId: string){
    setInventory(null); setStaged(null)
    api.get(`/shops/${shopId}/inventory`).then(r=>{ const list=r.data??[]; setInventory(list); setStaged(list.map((x:any)=>({...x}))) }).catch(e=>setErr(apiErrorMessage(e)))
  }
  function openResources(s: Shop){
    setResourceShop(s); loadInventory(s.id)
  }
  function togglePaperStaged(paperSize: string, enable: boolean){
    setStaged(prev=>{
      if (!prev) return prev
      const idx = prev.findIndex(r=>r.paperSize===paperSize)
      if (enable && idx===-1) return [...prev, { id:`tmp-${paperSize}`, paperSize, gsm:80, quantitySheets:200, lowStockThreshold:20, isAvailable:true }]
      if (!enable && idx!==-1) return prev.filter(r=>r.paperSize!==paperSize)
      return prev
    })
  }
  function updateStagedQty(paperSize: string, nextQty: number){
    setStaged(prev=> prev ? prev.map(r=> r.paperSize===paperSize ? { ...r, quantitySheets: Math.max(0,nextQty), lowStockThreshold: Math.max(5, Math.min(20, Math.round(Math.max(0,nextQty) >20 ? 20 : Math.max(5, Math.max(0,nextQty)*0.1)))) } : r) : prev)
  }
  async function saveResources(){
    if (!resourceShop || !staged || !inventory) return
    setResBusy(true); setErr('')
    const toDelete = inventory.filter(o=> !staged.some(s=>s.paperSize===o.paperSize))
    const toCreateOrUpdate = staged
    try {
      const ops: Promise<any>[] = []
      for (const del of toDelete) ops.push(api.delete(`/shops/${resourceShop.id}/inventory/${del.id}`))
      for (const row of toCreateOrUpdate) ops.push(api.put(`/shops/${resourceShop.id}/inventory`, { paperSize: row.paperSize, gsm: row.gsm ?? 80, quantitySheets: row.quantitySheets, lowStockThreshold: row.lowStockThreshold ?? 20, isAvailable: true }))
      await Promise.all(ops)
      setResourceShop(null); setStaged(null); setInventory(null)
    } catch(e:any){ setErr(apiErrorMessage(e)) } finally { setResBusy(false) }
  }
  useEffect(()=>{ load() },[])

  function openCreate() {
    setForm({ name:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'', phone:'', latitude:'', longitude:'' })
    setCcForm('+91'); setShowMap(false); setCreateOpen(true); setErr('')
  }
  async function openEdit(s: Shop) {
    setErr('')
    setShowEditMap(false)
    try {
      const r = await api.get(`/shops/${s.id}`)
      const fresh: Shop = r.data ?? s
      setEditing(fresh)
      const raw = fresh.phone ?? ''
      let cc = '+91', local = raw
      const m = raw.match(/^(\+\d{1,4})(.*)$/)
      if (m){ cc = m[1]; local = m[2].trim() }
      setCcEdit(cc)
      setEditForm({
        name: fresh.name ?? '', addressLine1: fresh.addressLine1 ?? '', addressLine2: fresh.addressLine2 ?? '',
        city: fresh.city ?? '', state: fresh.state ?? '', pincode: fresh.pincode ?? '', phone: local.replace(/[^0-9]/g,''),
        latitude: fresh.latitude != null ? String(fresh.latitude) : '', longitude: fresh.longitude != null ? String(fresh.longitude) : ''
      })
    } catch {
      setEditing(s)
      const raw = s.phone ?? ''
      let cc = '+91', local = raw
      const m = raw.match(/^(\+\d{1,4})(.*)$/)
      if (m){ cc = m[1]; local = m[2].trim() }
      setCcEdit(cc)
      setEditForm({
        name: s.name ?? '', addressLine1: s.addressLine1 ?? '', addressLine2: s.addressLine2 ?? '',
        city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '', phone: local.replace(/[^0-9]/g,''),
        latitude: s.latitude != null ? String(s.latitude) : '', longitude: s.longitude != null ? String(s.longitude) : ''
      })
    }
  }

  async function doCreate() {
    if (!form.name.trim()) { setErr('Shop name is required'); return }
    if (form.addressLine1.trim() && !form.city.trim()) { setErr('City is required when address is provided'); return }
    if (form.pincode && !/^\d{5,6}$/.test(form.pincode.trim())) { setErr('Pincode must be 5-6 digits'); return }
    const cleanPhone = form.phone.replace(/[^0-9]/g,'')
    if (cleanPhone && cleanPhone.length < 7) { setErr('Enter valid phone number'); return }
    setBusy(true); setErr('')
    try {
      const payload: any = { name: form.name.trim(), city: form.city.trim() || undefined, addressLine1: form.addressLine1.trim() || undefined, addressLine2: form.addressLine2.trim() || undefined, state: form.state.trim() || undefined, pincode: form.pincode.trim() || undefined, phone: cleanPhone ? fullPhone(ccForm, cleanPhone) : undefined }
      if (form.latitude) payload.latitude = parseFloat(form.latitude)
      if (form.longitude) payload.longitude = parseFloat(form.longitude)
      await api.post('/shops', payload)
      setCreateOpen(false); load()
    } catch(e:any){ setErr(apiErrorMessage(e)) } finally { setBusy(false) }
  }

  async function doRename() {
    if (!editing) return
    if (!editForm.name.trim()) { setErr('Shop name is required'); return }
    if (editForm.addressLine1.trim() && !editForm.city.trim()) { setErr('City is required when address is provided'); return }
    if (editForm.pincode && !/^\d{5,6}$/.test(editForm.pincode.trim())) { setErr('Pincode must be 5-6 digits'); return }
    const cleanPhone = editForm.phone.replace(/[^0-9]/g,'')
    if (cleanPhone && cleanPhone.length < 7) { setErr('Enter valid phone number'); return }
    setBusy(true); setErr('')
    try {
      const payload: any = { name: editForm.name.trim(), addressLine1: editForm.addressLine1.trim() || null, addressLine2: editForm.addressLine2.trim() || null, city: editForm.city.trim() || null, state: editForm.state.trim() || null, pincode: editForm.pincode.trim() || null, phone: cleanPhone ? fullPhone(ccEdit, cleanPhone) : null }
      payload.latitude = editForm.latitude ? parseFloat(editForm.latitude) : null
      payload.longitude = editForm.longitude ? parseFloat(editForm.longitude) : null
      await api.patch(`/shops/${editing.id}`, payload)
      setEditing(null)
      await load()
    } catch(e:any){
      if (e?.response?.status === 405) {
        try { await api.put(`/shops/${editing.id}`, { name: editForm.name.trim(), addressLine1: editForm.addressLine1.trim() || null, addressLine2: editForm.addressLine2.trim() || null, city: editForm.city.trim() || null, state: editForm.state.trim() || null, pincode: editForm.pincode.trim() || null, phone: cleanPhone ? fullPhone(ccEdit, cleanPhone) : null, latitude: editForm.latitude ? parseFloat(editForm.latitude) : null, longitude: editForm.longitude ? parseFloat(editForm.longitude) : null }) ; setEditing(null); await load(); return } catch(e2:any){ setErr(apiErrorMessage(e2)); return }
      }
      setErr(apiErrorMessage(e))
    } finally { setBusy(false) }
  }

  async function doDelete() {
    if (!deleteTarget) return
    if (!deletePwd) { setErr('Enter your password to confirm'); return }
    setBusy(true); setErr('')
    try {
      await api.delete(`/shops/${deleteTarget.id}`, { data: { password: deletePwd } })
      setDeleteTarget(null); setDeletePwd(''); load()
    } catch(e:any){ setErr(apiErrorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Store className="h-6 w-6"/> Manage shops</h1>
          <p className="text-sm text-slate-500">Create, rename or remove your shops • valid address or map pin required for customer discovery</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4"/> New shop</Button>
      </div>

      {err && <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</Card>}

      {shops === null ? (
        <Card className="p-6 text-sm text-slate-500">Loading…</Card>
      ) : shops.length === 0 ? (
        <Card className="p-10 text-center">
          <Store className="mx-auto h-8 w-8 text-slate-300"/>
          <p className="mt-2 font-medium">No shops yet</p>
          <p className="text-sm text-slate-500">Create your first shop to open your queue.</p>
          <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4"/> Create shop</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shops.map(s=>(
            <Card key={s.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{s.name} <Badge tone={s.status==='OPEN'?'success':'warning'} className="ml-2">{s.status}</Badge></p>
                <p className="text-xs text-slate-500 truncate flex items-center gap-1"><MapPin className="h-3 w-3"/>{[s.addressLine1, s.city, s.pincode].filter(Boolean).join(', ') || 'No address'} {s.latitude ? `• ${s.latitude.toFixed(4)}, ${s.longitude?.toFixed(4)}` : ''}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={()=>openResources(s)}><Boxes className="h-3.5 w-3.5"/> Resources</Button>
                <Button size="sm" variant="secondary" onClick={()=>openEdit(s)}><Pencil className="h-3.5 w-3.5"/> Edit</Button>
                <Button size="sm" variant="ghost" onClick={()=>{ setDeleteTarget(s); setDeletePwd(''); setErr('') }}><Trash2 className="h-3.5 w-3.5"/> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={()=>setCreateOpen(false)} title="New shop">
        <div className="grid gap-3">
          <div><Label>Shop name *</Label><Input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="My Print Shop" /></div>
          <div><Label>Address line 1</Label><Input value={form.addressLine1} onChange={e=>setForm(p=>({...p,addressLine1:e.target.value}))} placeholder="12 MG Road, Near Metro" /></div>
          <div><Label>Address line 2</Label><Input value={form.addressLine2} onChange={e=>setForm(p=>({...p,addressLine2:e.target.value}))} placeholder="Kothrud" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City {form.addressLine1.trim()?'*':''}</Label><Input value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))} placeholder="Pune" /></div>
            <div><Label>State</Label><Input value={form.state} onChange={e=>setForm(p=>({...p,state:e.target.value}))} placeholder="Maharashtra" /></div>
            <div><Label>Pincode</Label><Input value={form.pincode} onChange={e=>setForm(p=>({...p,pincode:e.target.value}))} placeholder="411038" /></div>
            <div><Label>Phone</Label><div className="relative"><CountryCode value={ccForm} onChange={setCcForm} /><Input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value.replace(/[^0-9]/g,'')}))} placeholder="90000 00000" className="pl-[112px]" inputMode="numeric" /></div></div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={()=>setShowMap(v=>!v)}><MapPin className="h-3.5 w-3.5"/>{showMap?'Hide map':'Pick from map'}</Button>
            <span className="text-xs text-slate-500">or type lat/lng below</span>
          </div>
          {showMap && <MapPicker lat={form.latitude?parseFloat(form.latitude):null} lng={form.longitude?parseFloat(form.longitude):null} onPick={({lat,lng,displayName,address})=>{
            setForm(p=>{
              const next={...p, latitude:String(lat), longitude:String(lng)}
              if (displayName && !p.addressLine1.trim()) next.addressLine1 = displayName.slice(0,200)
              if (address){
                if (!p.city.trim() && (address.city || address.town || address.village || address.county)) next.city = (address.city || address.town || address.village || address.county || '').slice(0,80)
                if (!p.state.trim() && address.state) next.state = address.state.slice(0,80)
                if (!p.pincode.trim() && address.postcode) next.pincode = address.postcode.slice(0,12)
              }
              return next
            })
          }} />}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude</Label><Input value={form.latitude} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))} placeholder="18.5204" /></div>
            <div><Label>Longitude</Label><Input value={form.longitude} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))} placeholder="73.8567" /></div>
          </div>
          <p className="text-xs text-slate-500">Provide a valid address (address + city + 5-6 digit pincode) <b>or</b> a map pin — either works for discovery, both is best.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={()=>setCreateOpen(false)}>Cancel</Button>
            <Button onClick={doCreate} loading={busy}><Save className="h-4 w-4"/> Create</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!editing} onClose={()=>setEditing(null)} title="Edit shop">
        {editing && (
          <div className="grid gap-3">
            <div><Label>Shop name *</Label><Input value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} /></div>
            <div><Label>Address line 1</Label><Input value={editForm.addressLine1} onChange={e=>setEditForm(p=>({...p,addressLine1:e.target.value}))} /></div>
            <div><Label>Address line 2</Label><Input value={editForm.addressLine2} onChange={e=>setEditForm(p=>({...p,addressLine2:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City {editForm.addressLine1.trim()?'*':''}</Label><Input value={editForm.city} onChange={e=>setEditForm(p=>({...p,city:e.target.value}))} /></div>
              <div><Label>State</Label><Input value={editForm.state} onChange={e=>setEditForm(p=>({...p,state:e.target.value}))} /></div>
              <div><Label>Pincode</Label><Input value={editForm.pincode} onChange={e=>setEditForm(p=>({...p,pincode:e.target.value}))} /></div>
              <div><Label>Phone</Label><div className="relative"><CountryCode value={ccEdit} onChange={setCcEdit} /><Input value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value.replace(/[^0-9]/g,'')}))} placeholder="90000 00000" className="pl-[112px]" inputMode="numeric" /></div></div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={()=>setShowEditMap(v=>!v)}><MapPin className="h-3.5 w-3.5"/>{showEditMap?'Hide map':'Pick from map'}</Button>
            </div>
            {showEditMap && <MapPicker lat={editForm.latitude?parseFloat(editForm.latitude):null} lng={editForm.longitude?parseFloat(editForm.longitude):null} onPick={({lat,lng,displayName,address})=>{
              setEditForm(p=>{
                const next={...p, latitude:String(lat), longitude:String(lng)}
                if (displayName && !p.addressLine1.trim()) next.addressLine1 = displayName.slice(0,200)
                if (address){
                  if (!p.city.trim() && (address.city || address.town || address.village)) next.city = (address.city || address.town || address.village || '').slice(0,80)
                  if (!p.state.trim() && address.state) next.state = address.state.slice(0,80)
                  if (!p.pincode.trim() && address.postcode) next.pincode = address.postcode.slice(0,12)
                }
                return next
              })
            }} />}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input value={editForm.latitude} onChange={e=>setEditForm(p=>({...p,latitude:e.target.value}))} /></div>
              <div><Label>Longitude</Label><Input value={editForm.longitude} onChange={e=>setEditForm(p=>({...p,longitude:e.target.value}))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={()=>setEditing(null)}>Cancel</Button>
              <Button onClick={doRename} loading={busy}><Save className="h-4 w-4"/> Save</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!resourceShop} onClose={()=>setResourceShop(null)} title={resourceShop ? `Resources — ${resourceShop.name}` : 'Resources'}>
        {resourceShop && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Tick what you offer, then type <b>how many sheets left</b>. We'll remind you <b>20 sheets before</b> you run out. Changes save only when you click <b>Done</b>.</p>
            {staged===null ? <p className="text-sm text-slate-500">Loading…</p> : (
              <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {PAPERS_ALL.map(p=>{
                  const row = staged.find(r=>r.paperSize===p)
                  const enabled = !!row
                  const low = row && row.quantitySheets <= row.lowStockThreshold
                  return (
                    <div key={p} className={`rounded-xl border p-3 ${enabled?'bg-white border-slate-200':'bg-slate-50 border-dashed border-slate-200 opacity-75'}`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" checked={enabled} onChange={e=>togglePaperStaged(p, e.target.checked)} className="h-4 w-4 rounded" />
                          {p} {row?.gsm ? `· ${row.gsm}gsm` : ''}
                        </label>
                        {!enabled ? <span className="text-xs text-slate-400">Not offered</span> : <Badge tone={low?'warning':'success'} className="ml-1">{low ? `Low — ${row.quantitySheets} left` : `${row.quantitySheets} sheets`}</Badge>}
                      </div>
                      {enabled && (
                        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-end">
                          <div>
                            <Label>Paper left (sheets)</Label>
                            <Input type="number" min={0} value={row.quantitySheets} onChange={e=>updateStagedQty(p, Number(e.target.value) || 0)} placeholder="e.g. 200" />
                            <p className="text-[11px] text-slate-500 mt-1">Remind when ≤ {row.lowStockThreshold} sheets. Just update this number when you restock.</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={()=>togglePaperStaged(p,false)} className="h-10"><XCircle className="h-3.5 w-3.5"/> Remove</Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>setResourceShop(null)}>Cancel</Button><Button onClick={saveResources} loading={resBusy}><Save className="h-4 w-4"/> Done — Save</Button></div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="Delete shop?">
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm">Permanently delete <b>{deleteTarget.name}</b>? Queues, printers and inventory will be removed. This cannot be undone.</p>
            <div><Label>Confirm with your password *</Label><Input type="password" value={deletePwd} onChange={e=>setDeletePwd(e.target.value)} placeholder="Your password" autoFocus /></div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={()=>setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={doDelete} loading={busy}><Trash2 className="h-4 w-4"/> Delete forever</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

