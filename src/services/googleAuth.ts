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
  console.log('[GoogleAuth] Aguardando carregamento do Google Identity Services...')
  return new Promise((resolve, reject) => {
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (window.google?.accounts) {
        clearInterval(interval)
        console.log('[GoogleAuth] GIS carregado após', attempts * 200, 'ms')
        resolve()
      } else if (attempts > 50) {
        clearInterval(interval)
        console.error('[GoogleAuth] GIS não carregou após 10s. O script gsi/client está no index.html?')
        reject(new Error('Serviço Google não carregou. Verifique sua conexão.'))
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
    console.log('[GoogleAuth] Inicializando com client_id:', CLIENT_ID.substring(0, 25) + '...')
    window.google!.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
    })
    initialized = true
  })()

  await initPromise
}

export async function triggerGoogleLogin() {
  if (!CLIENT_ID) {
    console.warn('[GoogleAuth] Sem CLIENT_ID configurado')
    return
  }
  await initGoogleAuth()

  console.log('[GoogleAuth] Disparando prompt do Google...')
  window.google?.accounts.id.prompt((notification) => {
    // Diagnóstico: o Google NÃO mostrou o One Tap. Motivo:
    const reason = notification.getNotDisplayedReason?.() || notification.getDismissedReason?.()
    console.warn('[GoogleAuth] Prompt NÃO exibido. Motivo:', reason || notification)
    if (notification.isNotDisplayed?.()) {
      console.warn('[GoogleAuth] Detalhes:', notification.getNotDisplayedReason())
    }
  })
}

export function isGoogleAuthConfigured(): boolean {
  return CLIENT_ID.length > 10
}
