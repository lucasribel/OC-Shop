/**
 * Google OAuth 2.0 — Implicit Flow direto.
 * Popup → Google → redirect → localStorage → parent processa token.
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

async function handleToken(accessToken: string) {
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
}

export function triggerGoogleLogin() {
  if (!CLIENT_ID) return

  const redirectUri = window.location.origin
  const state = Math.random().toString(36).substring(2)
  localStorage.setItem('oauth_state', state)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('scope', 'email profile')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('include_granted_scopes', 'true')

  const w = 500, h = 600
  const popup = window.open(authUrl.toString(), 'google-signin',
    `width=${w},height=${h},left=${(screen.width-w)/2},top=${(screen.height-h)/2}`)

  if (!popup) {
    window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: 'Popup bloqueado. Permita popups.' }))
    return
  }

  // Poll: verifica localStorage a cada 300ms
  const poll = setInterval(async () => {
    const tokenData = localStorage.getItem('oauth_token')
    const tokenState = localStorage.getItem('oauth_token_state')
    if (tokenData && tokenState === state) {
      clearInterval(poll)
      localStorage.removeItem('oauth_token')
      localStorage.removeItem('oauth_token_state')
      localStorage.removeItem('oauth_state')
      try { await handleToken(tokenData) }
      catch (e: any) { window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: e.message })) }
    }
  }, 300)

  // Timeout de 60s — para de tentar
  setTimeout(() => {
    clearInterval(poll)
    if (!localStorage.getItem('oauth_token')) {
      window.dispatchEvent(new CustomEvent('ocshop:login-error', { detail: 'Tempo esgotado. Tente novamente.' }))
    }
  }, 60000)
}

// Executado na página de callback (quando Google redireciona para nosso domínio)
export function handleOAuthRedirect() {
  if (!window.location.hash || !window.location.hash.includes('access_token')) return

  const hash = window.location.hash
  const params = new URLSearchParams(hash.replace('#', ''))
  const accessToken = params.get('access_token')
  const state = params.get('state')

  if (accessToken && state) {
    // Salva no localStorage — a página principal (opener) vai ler
    localStorage.setItem('oauth_token', accessToken)
    localStorage.setItem('oauth_token_state', state)

    // Tenta postMessage (se opener ainda existe)
    if (window.opener) {
      window.opener.postMessage({ type: 'oauth_callback' }, window.location.origin)
    }
    window.close()
  }
}

export function initGoogleAuth(): void {}
export function isGoogleAuthConfigured(): boolean { return CLIENT_ID.length > 10 }
