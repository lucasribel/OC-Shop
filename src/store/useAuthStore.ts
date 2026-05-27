import { create } from 'zustand'
import type { User } from '@/types'
import { signInWithGoogle, signOut } from '@/services/auth'
import { isGoogleAuthConfigured } from '@/services/googleAuth'

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

    // Se OAuth real está configurado, escuta o evento de callback
    if (isGoogleAuthConfigured()) {
      const handleLoginEvent = (e: Event) => {
        const user = (e as CustomEvent).detail as User
        set({ user, loading: false })
      }
      const handleErrorEvent = (e: Event) => {
        const msg = (e as CustomEvent).detail as string
        set({ error: msg || 'Falha ao autenticar', loading: false })
      }

      window.addEventListener('ocshop:login', handleLoginEvent, { once: true })
      window.addEventListener('ocshop:login-error', handleErrorEvent, { once: true })

      // Dispara o login
      const result = await signInWithGoogle()

      // Timeout de segurança
      setTimeout(() => {
        set({ loading: false, error: get().user ? null : 'Popup do Google não abriu. Verifique se o navegador não bloqueou.' })
      }, 15000)
      return
    }

    // Mock fallback
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
