import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { Printer, LogOut, LayoutDashboard, UploadCloud, History, Settings, User, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { NotificationsBell } from '@/components/NotificationsBell'
import { cn } from '@/lib/utils'

export function CustomerShell() {
  const { user, logout } = useAuth()
  const { t } = useSettings()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  function handleLogout() { logout(); navigate('/login', { replace: true }) }
  const NAV = [
    { to: '/customer/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { to: '/upload', label: t('navUpload'), icon: UploadCloud },
    { to: '/history', label: t('navOrders'), icon: History },
  ]
  return (
    <div className="flex min-h-screen flex-col bg-[#fcfcfd]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/customer/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient shadow-sm"><Printer className="h-5 w-5 text-white" /></span>
            <span className="hidden text-[17px] font-bold tracking-tight sm:inline">Inko</span>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 sm:inline">{t('appTagCustomer')}</span>
          </Link>
          <nav className="ml-8 hidden items-center gap-1.5 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition', isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                <item.icon className="h-4 w-4" />{item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex flex-1 justify-end items-center gap-2">
            <NotificationsBell />
            {!user && (
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">{t('signIn')}</Link>
            )}
            {user && (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pl-3 pr-2 shadow-sm hover:bg-slate-50 sm:px-3" aria-haspopup="menu" aria-expanded={menuOpen}>
                  <div className="hidden text-left leading-tight sm:block"><p className="text-sm font-medium leading-none">{user.fullName}</p><p className="text-xs text-slate-500">CUSTOMER</p></div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{user.fullName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="px-3 py-2"><p className="text-sm font-medium">{user.fullName}</p><p className="text-xs text-slate-500">{user.email ?? user.phone ?? '—'}</p></div>
                      <div className="my-1 h-px bg-slate-100" />
                      <Link to="/customer/profile" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><User className="h-4 w-4 text-slate-500" /> {t('profile')}</Link>
                      <Link to="/customer/settings" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><Settings className="h-4 w-4 text-slate-500" /> {t('settings')}</Link>
                      <div className="my-1 h-px bg-slate-100" />
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> {t('signOut')}</button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <nav className="grid gap-1">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}>
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
              <Link to="/customer/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"><User className="h-4 w-4" /> {t('profile')}</Link>
              <Link to="/customer/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"><Settings className="h-4 w-4" /> {t('settings')}</Link>
              <button onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left"><LogOut className="h-4 w-4" /> {t('signOut')}</button>
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 sm:py-8"><Outlet /></main>
      <footer className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>{t('footerCustomer').replace('{year}', String(new Date().getFullYear()))}</p><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('allSystems')}</span></div></footer>
    </div>
  )
}
