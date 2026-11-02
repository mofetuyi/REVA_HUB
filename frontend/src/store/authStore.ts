import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserMode } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  mode: UserMode

  login: (tokens: { access_token: string; refresh_token: string }, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  switchMode: (mode: UserMode) => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      mode: 'buyer',
      isAuthenticated: false,

      login: (tokens, user) => set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user,
        mode: user.current_mode,
        isAuthenticated: true,
      }),

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        mode: 'buyer',
        isAuthenticated: false,
      }),

      setUser: (user) => set({ user }),

      setAccessToken: (token) => set({ accessToken: token }),

      switchMode: (mode) => {
        set({ mode })
        const user = get().user
        if (user) {
          set({ user: { ...user, current_mode: mode } })
        }
      },
    }),
    {
      name: 'reva-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        mode: state.mode,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export const isUserPremium = (user: User | null | undefined): boolean => {
  if (!user || !user.is_premium) return false
  if (user.premium_expires_at) {
    const expiry = new Date(user.premium_expires_at).getTime()
    if (expiry < Date.now()) return false
  }
  return true
}
