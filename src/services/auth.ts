/**
 * Autenticação — Google OAuth real ou mock de desenvolvimento.
 */

import type { User } from '@/types'
import { initGoogleAuth, triggerGoogleLogin, isGoogleAuthConfigured } from './googleAuth'
import { api } from './api'

// Mock apenas para dev sem Client ID
let currentUser: User | null = null
let mockIndex = 0
const mockUsers = ['super@aiesec.net', 'admin@aiesec.net', 'ana@aiesec.net']

/**
 * Login — tenta OAuth real primeiro, fallback para mock em dev.
 */
export async function signInWithGoogle(): Promise<User | null> {
  // Se OAuth está configurado, usa Google real
  if (isGoogleAuthConfigured()) {
    initGoogleAuth()
    triggerGoogleLogin()
    // O callback handleCredentialResponse vai setar o user via useAuthStore
    // Retornamos null porque o fluxo é assíncrono via callback
    return null
  }

  // Mock fallback
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
