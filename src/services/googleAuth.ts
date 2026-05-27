/**
 * Google OAuth 2.0 — Implicit Flow direto.
 * Sem GIS, sem One Tap, sem renderButton.
 * Abre popup para accounts.google.com/o/oauth2/v2/auth
 */
import { api } from './api'

const CLIENT_ID = (import.meta.env.VITE_OAUTH_CLIENT_ID as string) || ''

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

async function handleToken(accessToken: string, idToken?: string) {
  try {
    // Pega dados do usuário via Google API
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`)
    const profile = await res.json()
    if (!profile.email) throw new Error('Não foi possível obter perfil')

    const { email, name, picture, sub: googleId } = profile
    let user = await api.users.getByEmail(email)
    if (!user) user = await api.users.create({ email, name, picture, role: 'user', googleId, conferenceIds: [] })
    else if (!user.googleId) await api.users.update(user.id, { googleId, picture: picture || user.picture })

    const { useAuthStore } = await import('@/store/useAuthStore')
    useAuthStore.getState().setUser(user)
    window.dispatchEvent(new CustomEvent('ocshop:login', { detail: user }))
  } catch (err: any) {
    window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: String(err.message || err) }))
  }
}

export function triggerGoogleLogin() {
  if (!CLIENT_ID) return

  const redirectUri = window.location.origin
  const scope = 'email profile openid'
  const state = Math.random().toString(36).substring(2)

  // Armazena state para verificar no callback
  sessionStorage.setItem('oauth_state', state)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'token id_token')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('nonce', Math.random().toString(36).substring(2))
  authUrl.searchParams.set('include_granted_scopes', 'true')

  // Handler para o callback via postMessage ou redirect
  const handleMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return
    if (e.data?.type === 'oauth_callback') {
      window.removeEventListener('message', handleMessage)
      const hash = e.data.hash
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const idToken = params.get('id_token')
      const returnedState = params.get('state')
      const error = params.get('error')

      if (error) {
        window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: error }))
        return
      }
      if (returnedState !== sessionStorage.getItem('oauth_state')) {
        window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: 'State mismatch' }))
        return
      }
      if (accessToken) handleToken(accessToken, idToken || undefined)
    }
  }
  window.addEventListener('message', handleMessage, { once: false })

  // Abre popup
  const w = 500, h = 600
  const left = (screen.width - w) / 2
  const top = (screen.height - h) / 2
  const popup = window.open(
    authUrl.toString(),
    'google-signin',
    `width=${w},height=${h},left=${left},top=${top}`
  )

  if (!popup) {
    window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: 'Popup bloqueado. Permita popups para este site.' }))
    return
  }

  // Poll para detectar quando o popup fecha
  const pollTimer = setInterval(() => {
    if (popup.closed) {
      clearInterval(pollTimer)
      window.removeEventListener('message', handleMessage)
      // Se chegou aqui sem callback, o popup foi fechado sem completar
      if (!sessionStorage.getItem('oauth_done')) {
        window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: 'Login cancelado' }))
      }
    }
  }, 500)
}

// Página que recebe o redirect do Google e envia por postMessage
// Este script é injetado quando a URL contém o hash do OAuth
export function handleOAuthRedirect() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const hash = window.location.hash
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_callback', hash }, window.location.origin)
      sessionStorage.setItem('oauth_done', '1')
      window.close()
    } else {
      // Se não tem opener (popup foi bloqueado), processa direto
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      if (accessToken) handleToken(accessToken, params.get('id_token') || undefined)
      // Limpa o hash da URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }
}

export function initGoogleAuth(): void {}
export function isGoogleAuthConfigured(): boolean { return CLIENT_ID.length > 10 }
