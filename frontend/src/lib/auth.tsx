import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokens } from './api'

export interface CurrentUser {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  roles: string[]
  permissions: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  shopId?: string | null
}

export type Role = (typeof ROLES)[number]
export const ROLES = ['CUSTOMER', 'SHOPKEEPER', 'ADMIN', 'SUPER_ADMIN'] as const

export type SessionArea = 'customer' | 'shop' | 'admin'
export const AREA_LOGIN: Record<SessionArea, string> = { customer: '/login', shop: '/shop/login', admin: '/admin/login' }
export const AREA_HOME: Record<SessionArea, string> = { customer: '/customer/dashboard', shop: '/shop/dashboard', admin: '/admin/dashboard' }
export const AREA_LABEL: Record<SessionArea, string> = { customer: 'Customer', shop: 'Shop', admin: 'Admin' }

export function getSessionArea(): SessionArea | null {
  const v = localStorage.getItem('inko.lastLoginRole')
  return v === 'customer' || v === 'shop' || v === 'admin' ? v : null
}
export function setSessionArea(area: SessionArea) {
  localStorage.setItem('inko.lastLoginRole', area)
}

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  loginWithPassword: (identifier: string, password: string) => Promise<CurrentUser>
  requestOtp: (identifier: string) => Promise<string>
  verifyOtp: (identifier: string, code: string) => Promise<CurrentUser>
  register: (fullName: string, email: string | undefined, phone: string | undefined, password: string) => Promise<CurrentUser>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (identifier: string, code: string, newPassword: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<CurrentUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applySession(data: { accessToken: string; refreshToken: string; user: CurrentUser }) {
  tokens.set(data.accessToken, data.refreshToken)
  return data.user
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!tokens.access || !tokens.refresh) {
        setIsLoading(false)
        return
      }
      try {
        const { data } = await api.get<CurrentUser>('/users/me')
        if (!cancelled) setUser(data)
      } catch {
        tokens.clear()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const loginWithPassword = useCallback(async (identifier: string, password: string) => {
    const { data } = await api.post('/auth/login', { identifier, password })
    const nextUser = applySession(data)
    setUser(nextUser)
    return nextUser
  }, [])

  const requestOtp = useCallback(async (identifier: string) => {
    const { data } = await api.post('/auth/otp/request', { identifier })
    if (!data.delivered) throw new Error('OTP could not be sent')
    return data.devCode as string
  }, [])

  const verifyOtp = useCallback(async (identifier: string, code: string) => {
    const { data } = await api.post('/auth/otp/verify', { identifier, code })
    const nextUser = applySession(data)
    setUser(nextUser)
    return nextUser
  }, [])

  const register = useCallback(
    async (fullName: string, email: string | undefined, phone: string | undefined, password: string) => {
      const { data } = await api.post('/auth/register', {
        fullName,
        email: email || undefined,
        phone: phone || undefined,
        password,
      })
      const nextUser = applySession(data)
      setUser(nextUser)
      return nextUser
    },
    [],
  )

  const forgotPassword = useCallback(async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data.devCode as string
  }, [])

  const resetPassword = useCallback(async (identifier: string, code: string, newPassword: string) => {
    await api.post('/auth/reset-password', { identifier, code, newPassword })
  }, [])

  const logout = useCallback(() => {
    const refreshToken = tokens.refresh
    if (refreshToken) {
      void api.post('/auth/logout', { refreshToken }).catch(() => undefined)
    }
    tokens.clear()
    localStorage.removeItem('inko.lastLoginRole')
    setUser(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const { data } = await api.get<CurrentUser>('/users/me')
    setUser(data)
    return data
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      loginWithPassword,
      requestOtp,
      verifyOtp,
      register,
      forgotPassword,
      resetPassword,
      logout,
      refreshMe,
    }),
    [user, isLoading, loginWithPassword, requestOtp, verifyOtp, register, forgotPassword, resetPassword, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
