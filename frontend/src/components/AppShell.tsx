import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { Printer, LogOut, LayoutDashboard, UploadCloud, History, Store, ShieldCheck, Menu, X, ChevronRight, Bell, Settings, User, QrCode } from 'lucide-react'
import { useAuth, type Role } from '@/lib/auth'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: React.ElementType; roles?: Role[]; badge?: string }

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Customer', icon: LayoutDashboard, roles: ['CUSTOMER'], badge: 'YOU' },
  { to: '/upload', label: 'Upload', icon: UploadCloud, roles: ['CUSTOMER'] },
  { to: '/history', label: 'Orders', icon: History, roles: ['CUSTOMER'] },
  { to: '/shop/dashboard', label: 'Shop Dashboard', icon: Store, roles: ['SHOPKEEPER','ADMIN','SUPER_ADMIN'] },
  { to: '/shop/queue', label: 'Queue', icon: UploadCloud, roles: ['SHOPKEEPER','ADMIN','SUPER_ADMIN'] },
  { to: '/shop/qr', label: 'QR Codes', icon: QrCode, roles: ['SHOPKEEPER','ADMIN','SUPER_ADMIN'] },
  { to: '/admin/dashboard', label: 'Admin Console', icon: ShieldCheck, roles: ['ADMIN','SUPER_ADMIN'] },
]

function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length <= 1) return null
  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex">
      <Link to="/dashboard" className="hover:text-slate-700">Home</Link>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          <span className={cn(i === parts.length - 1 ? 'font-medium text-slate-900 capitalize' : 'capitalize')}>{p.replace(/-/g,' ')}</span>
        </span>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const filteredNav = NAV.filter((item) => !item.roles || user?.roles.some((r) => (item.roles as string[]).includes(r)))

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Top bar - sticky with blur */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient shadow-sm">
              <Printer className="h-5 w-5 text-white" />
            </span>
            <span className="hidden text-[17px] font-bold tracking-tight sm:inline">Inko</span>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 sm:inline">PRINT OS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition',
                    isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-1 justify-end items-center gap-2">
            {/* Notifications placeholder */}
            <button aria-label="Notifications" className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 sm:inline-flex">
              <Bell className="h-4 w-4" />
            </button>

            {/* User dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pl-3 pr-2 shadow-sm hover:bg-slate-50 sm:px-3"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <div className="hidden text-left leading-tight sm:block">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                    <p className="text-xs text-slate-500">{user.roles[0]}</p>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {user.fullName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}
                  </span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-slate-500">{user.email ?? user.phone ?? '—'}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {user.roles.map(r => <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{r}</span>)}
                        </div>
                      </div>
                      <div className="my-1 h-px bg-slate-100" />
                      <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 text-left">
                        <User className="h-4 w-4 text-slate-500" /> Profile
                      </button>
                      <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 text-left">
                        <Settings className="h-4 w-4 text-slate-500" /> Settings
                      </button>
                      <div className="my-1 h-px bg-slate-100" />
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <nav className="grid gap-1">
              {filteredNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')
                  }
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
              <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Breadcrumbs bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center">
          <Breadcrumbs />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Inko — Smart Printing Platform. Built for shops, loved by customers.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-700">Privacy</a>
            <a href="#" className="hover:text-slate-700">Terms</a>
            <a href="#" className="hover:text-slate-700">Support</a>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
