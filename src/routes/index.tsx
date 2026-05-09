import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import type { ReactNode } from 'react'

import Login from '@/pages/Login'
import Shop from '@/pages/Shop'
import MeusPedidos from '@/pages/MeusPedidos'
import AdminProdutos from '@/pages/admin/Produtos'
import AdminPedidos from '@/pages/admin/Pedidos'
import SuperAdmin from '@/pages/admin/SuperAdmin'

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user) return <Navigate to="/login" replace />
  if (role === 'adm' && !['adm', 'super_adm'].includes(user.role)) {
    return <Navigate to="/shop" replace />
  }
  if (role === 'super_adm' && user.role !== 'super_adm') {
    return <Navigate to="/shop" replace />
  }
  return <>{children}</>
}

function GuestOnly({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/shop" replace />
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <Login />
      </GuestOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/shop" replace /> },
      { path: 'shop', element: <Shop /> },
      { path: 'meus-pedidos', element: <MeusPedidos /> },
      {
        path: 'admin/produtos',
        element: (
          <RequireRole role="adm">
            <AdminProdutos />
          </RequireRole>
        ),
      },
      {
        path: 'admin/pedidos',
        element: (
          <RequireRole role="adm">
            <AdminPedidos />
          </RequireRole>
        ),
      },
      {
        path: 'superadmin',
        element: (
          <RequireRole role="super_adm">
            <SuperAdmin />
          </RequireRole>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/shop" replace />,
  },
])
