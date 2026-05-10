import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import type { ReactNode } from 'react'

import Login from '@/pages/Login'
import MeusPedidos from '@/pages/MeusPedidos'
import AdminProdutos from '@/pages/admin/Produtos'
import AdminPedidos from '@/pages/admin/Pedidos'
import SuperAdmin from '@/pages/admin/SuperAdmin'
import Home from '@/pages/Home'
import ConferenceShopPage from '@/pages/ConferenceShopPage'
import AdminLogin from '@/pages/admin/AdminLogin'
import ConferenceSelect from '@/pages/admin/ConferenceSelect'
import Dashboard from '@/pages/admin/Dashboard'
import ConferenceConfig from '@/pages/admin/ConferenceConfig'
import Setup from '@/pages/Setup'

import { AdminLayout } from '@/components/layout/AdminLayout'
import {
  RequireAdminAccess,
  RequireSuperAdmin,
  GuestOnlyAdmin,
} from './guards'
import { SetupGuard } from './SetupGuard'

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
  if (role === 'admin' && !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/" replace />
  }
  if (role === 'super_admin' && user.role !== 'super_admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function GuestOnly({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // Setup — outside guard to avoid redirect loop
  { path: '/setup', element: <Setup /> },

  // Everything else is guarded by setup check
  {
    element: <SetupGuard><Outlet /></SetupGuard>,
    children: [
      // Public pages
      { path: '/shop', element: <Navigate to="/" replace /> },
      { index: true, element: <Home /> },
      { path: '/login', element: <GuestOnly><Login /></GuestOnly> },
      { path: '/entrar', element: <GuestOnlyAdmin><AdminLogin /></GuestOnlyAdmin> },

      // Admin management pages
      { path: '/admin', element: <RequireAdminAccess><ConferenceSelect /></RequireAdminAccess> },
      {
        path: '/admin/:slug',
        element: <RequireAdminAccess><AdminLayout><Outlet /></AdminLayout></RequireAdminAccess>,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'produtos', element: <AdminProdutos /> },
          { path: 'pedidos', element: <AdminPedidos /> },
          { path: 'configuracoes', element: <ConferenceConfig /> },
        ],
      },

      // Super admin
      { path: '/super', element: <RequireSuperAdmin><SuperAdmin /></RequireSuperAdmin> },

      // Old auth-only pages (keep for backward compat)
      {
        path: '/',
        element: <RequireAuth><Outlet /></RequireAuth>,
        children: [
          { path: 'meus-pedidos', element: <MeusPedidos /> },
          {
            path: 'admin/produtos',
            element: <RequireRole role="admin"><AdminProdutos /></RequireRole>,
          },
          {
            path: 'admin/pedidos',
            element: <RequireRole role="admin"><AdminPedidos /></RequireRole>,
          },
          {
            path: 'superadmin',
            element: <RequireRole role="super_admin"><SuperAdmin /></RequireRole>,
          },
        ],
      },

      // Dynamic slug — must come AFTER all specific paths
      { path: '/:slug', element: <ConferenceShopPage /> },

      // Fallback
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
