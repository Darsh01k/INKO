import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '@/lib/api'
import { Card, Button, Input, Label, Badge, Dialog } from '@/components/ui'
import { Store, Plus, Pencil, Trash2, MapPin, Save } from 'lucide-react'

type Shop = {
  id: string; name: string; city: string | null; status: string
  addressLine1?: string | null; addressLine2?: string | null; state?: string | null; pincode?: string | null
  latitude?: number | null; longitude?: number | null; phone?: string | null; email?: string | null
}

function MapPicker({ lat, lng, onPick }: { lat?: number | null, lng?: number | null, onPick: (a:{lat:number,lng:number,address?:string})=>void }) {
  const [pickLat, setPickLat] = useState(lat != null ? String(lat) : '')
  const [pickLng, setPickLng] = useState(lng != null ? String(lng) : '')
  const [addr, setAddr] = useState('')
  const [loading, setLoading] = useState(false)

  async function reverse(lat: number, lng: number) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, { headers: { Accept: 'application/json' } })
      const j = await r.json()
      if (j?.display_name) setAddr(j.display_name)
    } catch {}
  }

  function handlePick() {
    const la = parseFloat(pickLat), ln = parseFloat(pickLng)
    if (isNaN(la) || isNaN(ln)) return
    onPick({ lat: la, lng: ln, address: addr || undefined })
    if (!addr) reverse(la, ln)
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
      <p className="text-xs font-medium">Pick from map</p>
      <div className="h-48 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <iframe
          title="map"
          style={{ width: '100%', height: '100%', border: 0 }}
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(pickLng)||77)-0.02}%2C${(parseFloat(pickLat)||18.5)-0.015}%2C${(parseFloat(pickLng)||77)+0.02}%2C${(parseFloat(pickLat)||18.5)+0.015}&layer=mapnik&marker=${parseFloat(pickLat)||18.52}%2C${parseFloat(pickLng)||73.85}`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Latitude</Label><Input value={pickLat} onChange={e=>setPickLat(e.target.value)} placeholder="18.5204" /></div>
        <div><Label>Longitude</Label><Input value={pickLng} onChange={e=>setPickLng(e.target.value)} placeholder="73.8567" /></div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handlePick}><MapPin className="h-3.5 w-3.5"/> Use these coords</Button>
        <Button size="sm" variant="secondary" onClick={()=>{
          setLoading(true)
          if (!addr) { reverse(parseFloat(pickLat)||18.52, parseFloat(pickLng)||73.85).finally(()=>setLoading(false)) } else setLoading(false)
        }}>{loading?'…':'Fill address from coords'}</Button>
      </div>
      {addr && <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2">{addr}</p>}
      <p className="text-[11px] text-slate-500">Tip: open <a href="https://www.openstreetmap.org" target="_blank" className="underline">openstreetmap.org</a>, right-click → Show address → copy lat/lng, or just type coords above and click on the embedded map area then manually adjust.</p>
    </div>
  )
}

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
  const [showMap, setShowMap] = useState(false)
  const [showEditMap, setShowEditMap] = useState(false)

  function load() {
    setErr('')
    api.get('/shops/mine').then(r=>setShops(r.data ?? [])).catch(e=>setErr(apiErrorMessage(e)))
  }
  useEffect(()=>{ load() },[])

  function openCreate() {
    setForm({ name:'', addressLine1:'', addressLine2:'', city:'', state:'', pincode:'', phone:'', latitude:'', longitude:'' })
    setShowMap(false); setCreateOpen(true); setErr('')
  }
  function openEdit(s: Shop) {
    setEditing(s)
    setEditForm({
      name: s.name ?? '', addressLine1: s.addressLine1 ?? '', addressLine2: s.addressLine2 ?? '',
      city: s.city ?? '', state: s.state ?? '', pincode: s.pincode ?? '', phone: s.phone ?? '',
      latitude: s.latitude != null ? String(s.latitude) : '', longitude: s.longitude != null ? String(s.longitude) : ''
    })
    setShowEditMap(false); setErr('')
  }

  async function doCreate() {
    if (!form.name.trim()) { setErr('Shop name is required'); return }
    if (form.addressLine1.trim() && !form.city.trim()) { setErr('City is required when address is provided'); return }
    if (form.pincode && !/^\d{5,6}$/.test(form.pincode.trim())) { setErr('Pincode must be 5-6 digits'); return }
    setBusy(true); setErr('')
    try {
      const payload: any = { name: form.name.trim(), city: form.city.trim() || undefined, addressLine1: form.addressLine1.trim() || undefined, addressLine2: form.addressLine2.trim() || undefined, state: form.state.trim() || undefined, pincode: form.pincode.trim() || undefined, phone: form.phone.trim() || undefined }
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
    setBusy(true); setErr('')
    try {
      const payload: any = { name: editForm.name.trim(), addressLine1: editForm.addressLine1.trim() || null, addressLine2: editForm.addressLine2.trim() || null, city: editForm.city.trim() || null, state: editForm.state.trim() || null, pincode: editForm.pincode.trim() || null, phone: editForm.phone.trim() || null }
      payload.latitude = editForm.latitude ? parseFloat(editForm.latitude) : null
      payload.longitude = editForm.longitude ? parseFloat(editForm.longitude) : null
      await api.patch(`/shops/${editing.id}`, payload)
      setEditing(null); load()
    } catch(e:any){ setErr(apiErrorMessage(e)) } finally { setBusy(false) }
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
            <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="98765..." /></div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={()=>setShowMap(v=>!v)}><MapPin className="h-3.5 w-3.5"/>{showMap?'Hide map':'Pick from map'}</Button>
            <span className="text-xs text-slate-500">or type lat/lng below</span>
          </div>
          {showMap && <MapPicker lat={form.latitude?parseFloat(form.latitude):null} lng={form.longitude?parseFloat(form.longitude):null} onPick={({lat,lng,address})=>{
            setForm(p=>({...p, latitude:String(lat), longitude:String(lng)}))
            if (address && !p_address_has(form.addressLine1)) setForm(p=>({...p, addressLine1: address.slice(0,200)}))
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
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={()=>setShowEditMap(v=>!v)}><MapPin className="h-3.5 w-3.5"/>{showEditMap?'Hide map':'Pick from map'}</Button>
            </div>
            {showEditMap && <MapPicker lat={editForm.latitude?parseFloat(editForm.latitude):null} lng={editForm.longitude?parseFloat(editForm.longitude):null} onPick={({lat,lng})=>setEditForm(p=>({...p, latitude:String(lat), longitude:String(lng)}))} />}
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
function p_address_has(a: string){ return a && a.trim().length>0 }
