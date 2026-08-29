import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ── Button ──
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-[oklch(0.55_0.20_260)] text-white hover:bg-[oklch(0.50_0.22_260)] shadow-sm hover:shadow-md focus-visible:ring-[oklch(0.55_0.20_260)]',
        secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm',
        outline: 'border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-500',
        subtle: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-[15px]',
        icon: 'h-9 w-9 p-0 rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  )
}

// ── Input ──
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[oklch(0.55_0.20_260)] focus:outline-none focus:ring-4 focus:ring-[oklch(0.55_0.20_260/0.12)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm shadow-sm placeholder:text-slate-400 hover:border-slate-300 focus:border-[oklch(0.55_0.20_260)] focus:outline-none focus:ring-4 focus:ring-[oklch(0.55_0.20_260/0.12)] disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-sm hover:border-slate-300 focus:border-[oklch(0.55_0.20_260)] focus:outline-none focus:ring-4 focus:ring-[oklch(0.55_0.20_260/0.12)] disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-slate-700', className)} {...props} />
}

// ── Card ──
export function Card({ className, children, hover, ...props }: { className?: string; children: React.ReactNode; hover?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', hover && 'transition hover:shadow-md hover:border-slate-300', className)} {...props}>
      {children}
    </div>
  )
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-3', className)} {...props} />
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-3', className)} {...props} />
}
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}

// ── Badge ──
const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', {
  variants: {
    tone: {
      default: 'border-slate-200 bg-slate-100 text-slate-700',
      brand: 'border-[oklch(0.85_0.06_260)] bg-[oklch(0.95_0.04_260)] text-[oklch(0.45_0.18_260)]',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-700',
      danger: 'border-red-200 bg-red-50 text-red-700',
      info: 'border-sky-200 bg-sky-50 text-sky-700',
      neutral: 'border-slate-200 bg-white text-slate-600',
    },
  },
  defaultVariants: { tone: 'default' },
})
export function Badge({ tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

// ── Alert ──
export function Alert({ tone = 'error', children, className }: { tone?: 'error' | 'success' | 'info' | 'warning'; children: React.ReactNode; className?: string }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  } as const
  return <div className={cn('rounded-xl border px-4 py-3 text-sm leading-relaxed', tones[tone], className)} role="alert">{children}</div>
}

// ── Skeleton ──
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200', className)} {...props} />
}
export function SkeletonCard() {
  return (
    <Card className="p-5 space-y-3">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/5" />
    </Card>
  )
}

// ── Separator & Progress ──
export function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px w-full bg-slate-200', className)} {...props} />
}
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className="h-full rounded-full bg-[oklch(0.55_0.20_260)] transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// ── Dialog (accessible, lightweight) ──
export function Dialog({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative z-10 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-xl border border-slate-200 animate-in">
        {title && <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-white pb-2 -mx-1 px-1">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

// ── Empty State ──
export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
      {Icon && <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm border border-slate-200"><Icon className="h-6 w-6 text-slate-400" /></div>}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Toast (simple) ──
let toastListeners: Array<(t: { id: number; message: string; tone: string }) => void> = []
let toastId = 0
export function toast(message: string, tone: 'success' | 'error' | 'info' = 'info') {
  const id = ++toastId
  toastListeners.forEach((l) => l({ id, message, tone }))
  setTimeout(() => toastListeners.forEach((l) => l({ id: -id, message: '', tone: '' })), 3500)
}
export function Toaster() {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; tone: string }>>([])
  React.useEffect(() => {
    const fn = (t: { id: number; message: string; tone: string }) => {
      if (t.id < 0) setToasts((prev) => prev.filter((x) => x.id !== -t.id))
      else setToasts((prev) => [...prev, t])
    }
    toastListeners.push(fn)
    return () => { toastListeners = toastListeners.filter((x) => x !== fn) }
  }, [])
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn('rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur bg-white', t.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800', t.tone === 'error' && 'border-red-200 bg-red-50 text-red-800', t.tone === 'info' && 'border-slate-200')}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Stepper ──
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={cn('flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border', i === current ? 'bg-[oklch(0.55_0.20_260)] text-white border-transparent shadow-sm' : i < current ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200')}>
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shrink-0', i === current ? 'bg-white/20 text-white' : i < current ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>{i < current ? '✓' : i + 1}</span>
            <span className="whitespace-nowrap">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={cn('h-px w-6 sm:w-8 shrink-0', i < current ? 'bg-emerald-300' : 'bg-slate-200')} />}
        </React.Fragment>
      ))}
    </div>
  )
}
