/**
 * Google Identity Services — OAuth real.
 *
 * Requer OAuth Client ID configurado no Google Cloud Console.
 * O Client ID vem de VITE_OAUTH_CLIENT_ID no .env do frontend.
 */

import { api } from './api'

// Tipagem mínima para o Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          prompt: (momentListener?: (notification: any) => void) => void
          renderButton: (element: HTMLElement, config: { theme: string; size: string }) => void
        }
      }
    }
  }
}

const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID as string | undefined

let initialized = false

/**
 * Inicializa o Google Identity Services com o Client ID.
 * Só precisa ser chamado uma vez.
 */
export function initGoogleAuth() {
  if (!CLIENT_ID) return
  if (initialized) return

  function waitForGoogle(): Promise<void> {
    return new Promise((resolve) => {
      if (window.google?.accounts) {
        resolve()
        return
      }
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (window.google?.accounts) {
          clearInterval(interval)
          resolve()
        } else if (attempts > 50) {
          clearInterval(interval)
          resolve() // timeout, sem Google
        }
      }, 100)
    })
  }

  waitForGoogle().then(() => {
    if (!window.google?.accounts) return
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID!,
      callback: handleCredentialResponse,
    })
    initialized = true
  })
}

/**
 * Decodifica o JWT retornado pelo Google (sem validar — validação é server-side).
 * O payload contém: email, name, picture, sub (Google ID)
 */
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

async function handleCredentialResponse(response: { credential: string }) {
  try {
    const payload = decodeJwt(response.credential)
    if (!payload) throw new Error('Token inválido')

    const { email, name, picture, sub: googleId } = payload

    // Busca usuário no backend
    let user = await api.users.getByEmail(email)

    if (!user) {
      // Cria novo usuário se não existir
      user = await api.users.create({
        email,
        name,
        picture,
        role: 'user',
        googleId,
        conferenceIds: [],
      })
    } else if (!user.googleId) {
      // Atualiza Google ID se faltar
      await api.users.update(user.id, { googleId, picture: picture || user.picture })
    }

    // Store via módulo — o useAuthStore observa isso
    const { useAuthStore } = await import('@/store/useAuthStore')
    useAuthStore.getState().setUser(user)

    // Evento custom para páginas saberem que houve login
    window.dispatchEvent(new CustomEvent('ocshop:login', { detail: user }))
  } catch (err) {
    console.error('[GoogleAuth] Erro no login:', err)
    window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: String(err) }))
  }
}

/**
 * Dispara o prompt de login do Google (One Tap ou popup).
 */
export function triggerGoogleLogin() {
  if (!window.google?.accounts) {
    console.warn('[GoogleAuth] Google Identity Services não carregado.')
    return
  }
  window.google.accounts.id.prompt()
}

/**
 * Verifica se OAuth está configurado.
 */
export function isGoogleAuthConfigured(): boolean {
  return !!CLIENT_ID
}
