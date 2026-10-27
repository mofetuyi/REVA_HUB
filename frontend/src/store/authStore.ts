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
  activatePremium: (days?: number) => void
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

      activatePremium: (days = 30) => {
        const current = get().user
        if (!current) return
        const now = new Date()
        const currentExpiry = current.premium_expires_at ? new Date(current.premium_expires_at) : null
        const base = currentExpiry && currentExpiry > now ? currentExpiry : now
        const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
        const updatedUser = {
          ...current,
          is_premium: true,
          premium_expires_at: newExpiry.toISOString(),
          reva_id: current.reva_id || `REVA-${(current.id || 'DEMO').toUpperCase().replace(/-/g, '')}`,
        }
        set({ user: updatedUser })
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
