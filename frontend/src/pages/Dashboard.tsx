import { useQuery } from '@tanstack/react-query'
import { FileUp, Store, LayoutDashboard, ShieldCheck, ArrowRight, Sparkles, Palette, Printer, AlertCircle, MapPin, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth, type Role } from '@/lib/auth'
import { Card, Badge, Skeleton, Button } from '@/components/ui'

interface ShopSummary {
  id: string
  name: string
  city: string | null
  status: 'OPEN' | 'BUSY' | 'TEMPORARILY_UNAVAILABLE' | 'CLOSED' | 'SUSPENDED'
  supportsColor: boolean
}

function useOpenShops(enabled: boolean) {
  return useQuery({
    queryKey: ['shops', 'open'],
    queryFn: async () => (await api.get<ShopSummary[]>('/shops')).data,
    enabled,
    refetchInterval: 30_000,
  })
}

const ROLE_HOME: Partial<Record<Role, { label: string; hint: string }>> = {
  CUSTOMER: { label: 'Print something', hint: 'Upload a document and get a queue token at a nearby shop.' },
  SHOPKEEPER: { label: 'Run your shop', hint: 'Queue, printers and inventory — operations at a glance.' },
  ADMIN: { label: 'Govern the platform', hint: 'Shops, users, payments and audits under control.' },
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone ?? 'bg-slate-900 text-white'}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-lg font-bold leading-none">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.roles[0] as Role | undefined
  const isCustomer = user?.roles.includes('CUSTOMER')
  const shops = useOpenShops(!!isCustomer)
  const myOrders = useQuery({
    queryKey: ['orders', 'mine-count'],
    queryFn: async () => (await api.get<any[]>('/orders')).data,
    enabled: !!user,
  })

  const cards = [
    { icon: FileUp, title: 'Upload & print', body: 'Documents → configuration → price preview → queue token.', roles: ['CUSTOMER'], href: '/upload', cta: 'Upload now' },
    { icon: Store, title: 'Browse shops', body: 'Open shops, wait times and color/binding capabilities.', roles: ['CUSTOMER'], href: '/upload', cta: 'Find shops' },
    { icon: LayoutDashboard, title: 'Shop dashboard', body: 'Queue-first operations, printer health, alerts.', roles: ['SHOPKEEPER','ADMIN','SUPER_ADMIN'], href: '/shop/dashboard', cta: 'Open shop' },
    { icon: ShieldCheck, title: 'Admin console', body: 'Shops, users, payments and audits.', roles: ['ADMIN', 'SUPER_ADMIN'], href: '/admin/dashboard', cta: 'Open admin' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-200 bg-white shadow-sm">
        <div className="absolute inset-0 brand-gradient opacity-[0.08]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" /> New · Smart queue & price preview
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-[32px]">Welcome back, {user?.fullName.split(' ')[0]} <span className="inline-block">👋</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">{ROLE_HOME[role ?? 'CUSTOMER']?.hint} Print in 4 steps — upload, configure, preview price, pay & collect token.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/upload"><Button size="lg" className="shadow-md">Upload documents <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/history"><Button variant="secondary" size="lg">View history</Button></Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> No waiting in line</span>
              <span className="inline-flex items-center gap-1.5"><Palette className="h-4 w-4"/> B&W & Color</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 content-start">
            <Stat icon={Printer} label="Shops online" value={shops.data?.length ? String(shops.data.length) : '—'} sub={shops.isFetching ? 'refreshing…' : 'live status'} />
            <Stat icon={FileUp} label="Your orders" value={user ? String(myOrders.data?.length ?? '—') : '—'} sub={user ? 'track in History' : 'sign in to track'} tone="bg-indigo-600 text-white" />
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-md">
              <p className="text-xs font-medium tracking-widest text-white/70">HOW IT WORKS</p>
              <ol className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                {['Upload','Configure','Preview','Pay & Token'].map((s,i)=>(
                  <li key={s} className="flex flex-col items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">{i+1}</span>
                    <span className="font-medium leading-tight">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Get started</h2>
          <Link to="/upload" className="text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline">How pricing works →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.filter((c) => user && c.roles.some((r) => user.roles.includes(r))).map(({ icon: Icon, title, body, href, cta }) => (
            <Card key={title} hover className="flex flex-col p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{body}</p>
              <Link to={href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[oklch(0.55_0.20_260)] hover:gap-1.5 transition-all">
                {cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Shops */}
      {isCustomer && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Open shops near you</h2>
            <div className="flex items-center gap-2">
              {shops.isFetching && <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/> refreshing…</span>}
              <Badge tone="neutral">{shops.data?.length ?? 0} open</Badge>
            </div>
          </div>

          {shops.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i=>(
                <Card key={i} className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-8 w-full" />
                </Card>
              ))}
            </div>
          ) : shops.isError ? (
            <Card className="p-6 flex items-center gap-3 text-sm text-red-600 border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5" /> Could not load shops — please retry.
              <Button variant="secondary" size="sm" onClick={()=>shops.refetch()}>Retry</Button>
            </Card>
          ) : (shops.data?.length ?? 0) === 0 ? (
            <Card className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100"><Store className="h-6 w-6 text-slate-400" /></div>
              <h3 className="mt-3 font-semibold">No shops open right now</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Shops open at 9am — you can still upload and get a token when they open. We’ll notify you.</p>
              <Link to="/upload" className="mt-4 inline-block"><Button>Upload anyway</Button></Link>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.data!.map((shop) => (
                <Card key={shop.id} hover className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{shop.name}</h3>
                        <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3"/>{shop.city ?? '—'}</p>
                      </div>
                    </div>
                    <Badge tone={shop.status==='OPEN'?'success':shop.status==='BUSY'?'warning':'neutral'}>{shop.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Badge tone={shop.supportsColor?'brand':'neutral'}>{shop.supportsColor ? 'Color available' : 'B&W only'}</Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link to="/upload" className="flex-1"><Button variant="secondary" size="sm" className="w-full">Select</Button></Link>
                    <Link to={`/queue/${shop.id}`} className="flex-1"><Button variant="ghost" size="sm" className="w-full">View queue</Button></Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
