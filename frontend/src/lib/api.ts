import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Inject auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 – try to refresh without disruptively kicking users out of public pages
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true
      const refresh = useAuthStore.getState().refreshToken
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          const newToken = res.data.access_token
          useAuthStore.getState().setAccessToken(newToken)
          if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          // Only redirect if explicitly on a private account management route
          const path = window.location.pathname
          if (path.startsWith('/admin') || path.startsWith('/my-') || path.startsWith('/settings') || path.startsWith('/staff/dashboard')) {
            useAuthStore.getState().logout()
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg: string }) => d.msg).join(', ')
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
