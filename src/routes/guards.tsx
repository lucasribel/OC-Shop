import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import type { ReactNode } from 'react'

export function RequireAdminAccess({ children }: { children: ReactNode }) {
  const { user, isCollaborator } = useAuthStore()
  if (!user) return <Navigate to="/entrar" replace />
  if (!isCollaborator()) return <Navigate to="/" replace />
  return <>{children}</>
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuthStore()
  if (!user) return <Navigate to="/entrar" replace />
  if (!isSuperAdmin()) return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function GuestOnlyAdmin({ children }: { children: ReactNode }) {
  const { user, isCollaborator } = useAuthStore()
  if (user && isCollaborator()) return <Navigate to="/admin" replace />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}
