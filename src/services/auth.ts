/**
 * Google OAuth abstraction layer.
 *
 * Hoje: simulação (login / logout mockados).
 * Amanhã: integrar com @react-oauth/google ou Firebase Auth.
 *
 * NUNCA importar bibliotecas OAuth diretamente nos componentes.
 */

import type { User } from '@/types'

const MOCK_USER: User = {
  id: 'user-1',
  email: 'maria.silva@aiesec.net',
  name: 'Maria Silva',
  picture: undefined,
  role: 'user',
  aiesec: 'AIESEC Brasil',
}

const MOCK_ADM: User = {
  id: 'adm-1',
  email: 'admin@aiesec.net',
  name: 'Admin Local',
  picture: undefined,
  role: 'adm',
  aiesec: 'AIESEC São Paulo',
}

const MOCK_SUPER: User = {
  id: 'super-1',
  email: 'super@aiesec.net',
  name: 'Super Admin',
  picture: undefined,
  role: 'super_adm',
  aiesec: 'AIESEC Brasil',
}

let currentUser: User | null = null
let userIndex = 0
const mockUsers = [MOCK_USER, MOCK_ADM, MOCK_SUPER]

export async function signInWithGoogle(): Promise<User> {
  // Simula popup OAuth — alterna entre perfis para teste
  await new Promise((r) => setTimeout(r, 600))
  currentUser = mockUsers[userIndex % mockUsers.length]
  userIndex++
  return currentUser
}

export async function signOut(): Promise<void> {
  await new Promise((r) => setTimeout(r, 200))
  currentUser = null
}

export function getCurrentUser(): User | null {
  return currentUser
}
