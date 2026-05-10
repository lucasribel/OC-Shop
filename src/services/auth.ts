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
  id: 'u4',
  email: 'maria.silva@gmail.com',
  name: 'Maria Silva',
  picture: undefined,
  role: 'user',
  aiesec: 'AIESEC Brasil',
}

const MOCK_ADM: User = {
  id: 'u2',
  email: 'admin@aiesec.net',
  name: 'Admin AIESEC SP',
  picture: undefined,
  role: 'admin',
  aiesec: 'AIESEC São Paulo',
  conferenceIds: ['conf1', 'conf2'],
}

const MOCK_SUPER: User = {
  id: 'u1',
  email: 'super@aiesec.net',
  name: 'Super Admin',
  picture: undefined,
  role: 'super_admin',
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
