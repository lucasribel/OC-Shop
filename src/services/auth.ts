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
  return res.json()
}

export async function registerAdmin(email: string, name: string, password: string): Promise<User> {
  const base = authBase()
  if (!base) throw new Error('Backend indisponível')
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Falha ao criar conta' }))
    throw new Error(err.error || 'Falha ao criar conta')
  }
  return res.json()
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
  if (mode !== 'password' || !data.authenticated || !data.user) return { user: null, adminAuthMode: mode }
  return { user: data.user, adminAuthMode: 'password' }
}

export async function setAuthMode(adminAuthMode: 'google' | 'password'): Promise<void> {
  const base = authBase()
  if (!base) throw new Error('Backend indisponível')
  const res = await fetch(`${base}/auth/set-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminAuthMode }),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Falha ao salvar' }))
    throw new Error(err.error || 'Falha ao salvar')
  }
}
