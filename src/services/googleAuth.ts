/**
 * Google Identity Services — OAuth real.
 */
import { api } from './api'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          prompt: (momentListener?: (notification: any) => void) => void
        }
      }
    }
  }
}

const CLIENT_ID = (import.meta.env.VITE_OAUTH_CLIENT_ID as string) || ''

let initialized = false
let initPromise: Promise<void> | null = null

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

async function handleCredentialResponse(response: { credential: string }) {
  try {
    const payload = decodeJwt(response.credential)
    if (!payload) throw new Error('Token inválido')
    const { email, name, picture, sub: googleId } = payload
    let user = await api.users.getByEmail(email)
    if (!user) user = await api.users.create({ email, name, picture, role: 'user', googleId, conferenceIds: [] })
    else if (!user.googleId) await api.users.update(user.id, { googleId, picture: picture || user.picture })
    const { useAuthStore } = await import('@/store/useAuthStore')
    useAuthStore.getState().setUser(user)
    window.dispatchEvent(new CustomEvent('ocshop:login', { detail: user }))
  } catch (err) {
    console.error('[GoogleAuth] Erro:', err)
    window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: String(err) }))
  }
}

function waitForGoogle(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let attempts = 0
    const interval = setInterval(() => {
      if (window.google?.accounts) {
        clearInterval(interval)
        resolve()
      } else if (++attempts > 50) {
        clearInterval(interval)
        reject(new Error('Google Identity Services não carregou'))
      }
    }, 200)
  })
}

export async function initGoogleAuth(): Promise<void> {
  if (!CLIENT_ID) return
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    await waitForGoogle()
    window.google!.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredentialResponse })
    initialized = true
    console.log('[GoogleAuth] Inicializado com client_id:', CLIENT_ID.substring(0, 20) + '...')
  })()

  await initPromise
}

export async function triggerGoogleLogin() {
  if (!CLIENT_ID) return
  await initGoogleAuth()
  window.google?.accounts.id.prompt()
}

export function isGoogleAuthConfigured(): boolean {
  return CLIENT_ID.length > 10
}
