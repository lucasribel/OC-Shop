import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { signInWithGoogle, signOut } from '@/services/auth'
import { isGoogleAuthConfigured } from '@/services/googleAuth'

interface ConferenceAccess {
  id: string
  ownerId: string
  collaboratorIds?: string[]
}

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
  hasConferenceAccess: (conference: ConferenceAccess) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
      await signInWithGoogle()

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

  hasConferenceAccess: (conference) => {
    const user = get().user
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (conference.ownerId === user.id) return true
    if (conference.collaboratorIds?.includes(user.id)) return true
    return user.conferenceIds?.includes(conference.id) ?? false
  },
    }),
    {
      name: 'oc-shop-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
