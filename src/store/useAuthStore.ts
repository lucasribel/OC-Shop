import { create } from 'zustand'
import type { User } from '@/types'
import { signInWithGoogle, signOut } from '@/services/auth'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async () => {
    set({ loading: true, error: null })
    try {
      const user = await signInWithGoogle()
      set({ user, loading: false })
    } catch {
      set({ error: 'Falha ao autenticar. Tente novamente.', loading: false })
    }
  },

  logout: async () => {
    await signOut()
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
