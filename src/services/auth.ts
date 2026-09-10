/**
 * Autenticação — Google OAuth real ou mock de desenvolvimento.
 */
import type { User, AuthConfig } from '@/types'
import { initGoogleAuth, triggerGoogleLogin, isGoogleAuthConfigured } from './googleAuth'
import { api } from './api'
import { getApiUrl } from '@/config/api'

let currentUser: User | null = null
let mockIndex = 0
const mockUsers = ['super@aiesec.net', 'admin@aiesec.net', 'ana@aiesec.net']

export async function signInWithGoogle(): Promise<User | null> {
  if (isGoogleAuthConfigured()) {
    await initGoogleAuth()
    triggerGoogleLogin()
    return null // callback assíncrono via handleCredentialResponse
  }

  // Mock
  await new Promise((r) => setTimeout(r, 400))
  const email = mockUsers[mockIndex % mockUsers.length]
  mockIndex++
  currentUser = await api.users.getByEmail(email)
  return currentUser
}

export async function signOut(): Promise<void> {
  currentUser = null
}

export function getCurrentUser(): User | null {
  return currentUser
}

// ---------------------------------------------------------------------------
// Autenticação por senha (admin) + sessão em cookie HttpOnly
// ---------------------------------------------------------------------------

function authBase(): string {
  const url = getApiUrl()
  if (url === 'mock') return ''
  return url.startsWith('http') ? `${url}/api` : '/api'
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const base = authBase()
  if (!base) return { adminAuthMode: 'google' }
  const res = await fetch(`${base}/auth/config`).catch(() => null)
  if (!res || !res.ok) return { adminAuthMode: 'google' }
  return res.json()
}

async function userByEmailOrSynthetic(email: string): Promise<User> {
  const existing = await api.users.getByEmail(email).catch(() => null)
  if (existing) return existing
  return { id: 'admin-password', email, name: email.split('@')[0] || email, role: 'super_admin', conferenceIds: [] }
}

export async function loginWithPassword(email: string, password: string): Promise<User> {
  const base = authBase()
  if (!base) throw new Error('Backend indisponível')
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Falha ao entrar' }))
    throw new Error(err.error || 'Credenciais inválidas')
  }
  const data = await res.json()
  return userByEmailOrSynthetic(data.email)
}

export async function logoutSession(): Promise<void> {
  const base = authBase()
  if (!base) return
  await fetch(`${base}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
}

export async function restoreSession(): Promise<{ user: User | null; adminAuthMode: 'google' | 'password' }> {
  const base = authBase()
  if (!base) return { user: null, adminAuthMode: 'google' }
  const res = await fetch(`${base}/auth/me`, { credentials: 'include' }).catch(() => null)
  if (!res || !res.ok) return { user: null, adminAuthMode: 'google' }
  const data = await res.json()
  const mode: 'google' | 'password' = data.adminAuthMode === 'password' ? 'password' : 'google'
  if (mode !== 'password') return { user: null, adminAuthMode: mode }
  if (!data.authenticated || !data.email) return { user: null, adminAuthMode: 'password' }
  return { user: await userByEmailOrSynthetic(data.email), adminAuthMode: 'password' }
}

export async function setAdminPassword(email: string, password: string, adminAuthMode: 'google' | 'password'): Promise<void> {
  const base = authBase()
  if (!base) throw new Error('Backend indisponível')
  const res = await fetch(`${base}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, adminAuthMode }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Falha ao salvar' }))
    throw new Error(err.error || 'Falha ao salvar')
  }
}
