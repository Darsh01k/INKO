import { useEffect, useRef, useState } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { Check, Search } from 'lucide-react'

type PickResult = { lat: number, lng: number, displayName?: string, address?: any }

export default function MapPicker({ lat, lng, onPick }: { lat?: number | null, lng?: number | null, onPick: (r: PickResult)=>void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [pickLat, setPickLat] = useState(lat != null ? String(lat) : '18.5204')
  const [pickLng, setPickLng] = useState(lng != null ? String(lng) : '73.8567')
  const [addr, setAddr] = useState('')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function reverse(la: number, ln: number){
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${ln}&zoom=18&addressdetails=1`, { headers: { Accept:'application/json' }})
      const j = await r.json()
      if (j?.display_name) setAddr(j.display_name)
      return j
    } catch { return null }
  }

  async function doSearch(){
    if (!search.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=5&addressdetails=1`)
      const j = await r.json()
      if (Array.isArray(j) && j.length){
        setSuggestions(j)
        const first = j[0]
        const la = parseFloat(first.lat), ln = parseFloat(first.lon)
        setPickLat(String(la)); setPickLng(String(ln))
        setAddr(first.display_name || '')
        leafletRef.current?.setView([la, ln], 16)
        markerRef.current?.setLatLng([la, ln])
      } else setSuggestions([])
    } catch {} finally { setLoading(false) }
  }
  function pickSuggestion(item:any){
    const la = parseFloat(item.lat), ln = parseFloat(item.lon)
    setPickLat(String(la)); setPickLng(String(ln))
    setAddr(item.display_name || '')
    setSuggestions([])
    leafletRef.current?.setView([la, ln], 16)
    markerRef.current?.setLatLng([la, ln])
  }

  function confirm(){
    const la = parseFloat(pickLat), ln = parseFloat(pickLng)
    if (isNaN(la) || isNaN(ln)) return
    reverse(la, ln).then(j=>{
      onPick({ lat: la, lng: ln, displayName: j?.display_name || addr, address: j?.address })
    })
    if (!addr) setTimeout(()=>{},0)
    onPick({ lat: la, lng: ln, displayName: addr || undefined })
  }

  useEffect(()=>{
    let cancelled=false
    async function init(){
      const hasLeaflet = !!(window as any).L
      if (!hasLeaflet){
        await new Promise<void>((res,rej)=>{
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          s.onload = ()=>res()
          s.onerror = ()=>rej()
          document.head.appendChild(s)
        })
      }
      if (cancelled || !mapRef.current) return
      const L = (window as any).L
      const map = L.map(mapRef.current, { zoomControl: true }).setView([parseFloat(pickLat)||18.52, parseFloat(pickLng)||73.85], 14)
      leafletRef.current = map
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '© Google Maps • OSM',
        maxZoom: 20,
      }).addTo(map)
      const marker = L.marker([parseFloat(pickLat)||18.52, parseFloat(pickLng)||73.85], { draggable: true }).addTo(map)
      markerRef.current = marker
      marker.on('dragend', ()=>{
        const p = marker.getLatLng()
        setPickLat(String(p.lat.toFixed(6))); setPickLng(String(p.lng.toFixed(6)))
        reverse(p.lat, p.lng)
      })
      map.on('click', (e:any)=>{
        const { lat: la, lng: ln } = e.latlng
        marker.setLatLng([la, ln])
        setPickLat(String(la.toFixed(6))); setPickLng(String(ln.toFixed(6)))
        reverse(la, ln)
      })
    }
    init()
    return ()=>{ cancelled=true; try{ leafletRef.current?.remove() }catch{} }
  },[])

  useEffect(()=>{
    const la = parseFloat(pickLat), ln = parseFloat(pickLng)
    if (!isNaN(la) && !isNaN(ln) && leafletRef.current && markerRef.current){
      try { leafletRef.current.setView([la, ln], leafletRef.current.getZoom()); markerRef.current.setLatLng([la, ln]) } catch {}
    }
  },[pickLat, pickLng])

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
      <div className="flex gap-2">
        <Input value={search} onChange={e=>{ setSearch(e.target.value); if(e.target.value.trim().length>=2){ /* live suggestions */ clearTimeout((window as any).__mapSearch); (window as any).__mapSearch=setTimeout(()=>doSearch(), 450)} }} placeholder="Search address, area, pincode…" onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); doSearch() } }} />
        <Button size="sm" variant="secondary" onClick={doSearch} loading={loading}><Search className="h-3.5 w-3.5"/> Search</Button>
      </div>
      {suggestions.length>0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-h-40 overflow-y-auto">
          {suggestions.map((it:any)=>(
            <button key={it.place_id} onClick={()=>pickSuggestion(it)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
              <p className="text-xs font-medium truncate">{it.display_name}</p>
              <p className="text-[11px] text-slate-500">{it.type} • {it.lat}, {it.lon}</p>
            </button>
          ))}
        </div>
      )}
      <div ref={mapRef} className="h-64 w-full rounded-xl border border-slate-200 bg-white overflow-hidden" />
      <p className="text-[11px] text-slate-500">Click anywhere on map or drag the pin — Google-like detail, free via OSM + Google tiles. Then <b>Confirm</b> to fill shop coordinates + address.</p>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Latitude</Label><Input value={pickLat} onChange={e=>setPickLat(e.target.value)} /></div>
        <div><Label>Longitude</Label><Input value={pickLng} onChange={e=>setPickLng(e.target.value)} /></div>
      </div>
      {addr && <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2 line-clamp-3">{addr}</p>}
      <Button size="sm" onClick={confirm} className="w-full"><Check className="h-4 w-4"/> Confirm — use this location</Button>
    </div>
  )
}
