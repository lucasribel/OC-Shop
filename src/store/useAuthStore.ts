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
  isAdmin: () => boolean
  isCollaborator: () => boolean
  isSuperAdmin: () => boolean
  hasConferenceAccess: (conferenceId: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  isAdmin: () => {
    const role = get().user?.role
    return role === 'admin' || role === 'super_admin'
  },

  isCollaborator: () => {
    const role = get().user?.role
    return role === 'collaborator' || role === 'admin' || role === 'super_admin'
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',

  hasConferenceAccess: (conferenceId: string) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'super_admin') return true
    return user.conferenceIds?.includes(conferenceId) ?? false
  },
}))
