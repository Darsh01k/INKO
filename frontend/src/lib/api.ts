import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const ACCESS_KEY = 'inko.access_token'
const REFRESH_KEY = 'inko.refresh_token'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem('inko.lastLoginRole')
  },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = tokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ApiErrorBody {
  status: number
  code: string
  message: string
  details?: Record<string, string>
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined
    if (body?.message) {
      const fieldErrors = body.details ? Object.values(body.details) : []
      return fieldErrors.length ? `${body.message}: ${fieldErrors.join(', ')}` : body.message
    }
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server — is the backend running on :8080?'
    return error.message || 'Something went wrong'
  }
  return 'Something went wrong'
}

// ---- Single-flight refresh: concurrent 401s share one /auth/refresh call ----

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokens.refresh
  if (!refreshToken) throw new Error('No refresh token')
  const response = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
  )
  const { accessToken, refreshToken: nextRefresh } = response.data
  tokens.set(accessToken, nextRefresh)
  return accessToken as string
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const url = original?.url ?? ''

    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh') ||
      url.includes('/auth/register') || url.includes('/auth/otp')

    if (status === 401 && original && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken()
        const token = await refreshPromise
        refreshPromise = null
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
        return api(original)
      } catch (refreshError) {
        refreshPromise = null
        tokens.clear()
        window.location.assign('/login')
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)
