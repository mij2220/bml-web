import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, access: string, refresh: string) => void
  updateUser: (user: User) => void
  clearAuth: () => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('bml_access', accessToken)
        localStorage.setItem('bml_refresh', refreshToken)
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },
      updateUser: (user) => set({ user }),
      clearAuth: () => {
        localStorage.removeItem('bml_access')
        localStorage.removeItem('bml_refresh')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    { name: 'bml-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)
