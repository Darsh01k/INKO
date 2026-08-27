import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotificationsBell() {
  const { user } = useAuth()
  const { settings, speak } = useSettings()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const enabled = !!user && settings.notifications
  const prevUnread = useRef(0)

  const list = useQuery({
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<any[]>('/notifications')).data ?? [],
  })
  const unread = useQuery({
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    queryKey: ['notifications-unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data?.count ?? 0,
  })

  useEffect(() => {
    const c = unread.data ?? 0
    if (settings.sound && c > prevUnread.current && (list.data?.length ?? 0) > 0) {
      const newest = list.data?.[0]
      if (newest?.title) speak(newest.title)
    }
    prevUnread.current = c
  }, [unread.data, list.data, settings.sound, speak])

  async function markRead(id: string) {
    try { await api.post(`/notifications/${id}/read`) } finally { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notifications-unread'] }) }
  }
  async function markAll() {
    try { await api.post('/notifications/read-all') } finally { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notifications-unread'] }) }
  }

  if (!settings.notifications) {
    return (
      <button aria-label="Notifications off" title="Notifications off — enable in Settings" className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300">
        <BellOff className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {(unread.data ?? 0) > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread.data}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-sm font-semibold">Notifications</p>
              {(unread.data ?? 0) > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.20_260)] hover:underline"><CheckCheck className="h-3.5 w-3.5"/> Mark all read</button>
              )}
            </div>
            <div className="mt-2 max-h-80 overflow-auto p-2">
              {(list.data ?? []).length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">Nothing yet — order & token updates land here.</p>
              ) : list.data!.map(n => {
                const inner = (
                  <div className={cn('rounded-xl px-3 py-2.5', n.read ? 'opacity-60' : 'bg-indigo-50/70')}>
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                    {!n.read && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                  </div>
                )
                return n.linkPath ? (
                  <Link key={n.id} to={n.linkPath} onClick={() => { setOpen(false); if (!n.read) void markRead(n.id) }} className="block">{inner}</Link>
                ) : (
                  <button key={n.id} onClick={() => { if (!n.read) void markRead(n.id) }} className="block w-full text-left">{inner}</button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
