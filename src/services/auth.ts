/**
 * Autenticação — Google OAuth real ou mock de desenvolvimento.
 */
import type { User } from '@/types'
import { initGoogleAuth, triggerGoogleLogin, isGoogleAuthConfigured } from './googleAuth'
import { api } from './api'

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
