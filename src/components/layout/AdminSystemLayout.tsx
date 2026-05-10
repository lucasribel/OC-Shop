import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import type { ReactNode } from 'react'

interface AdminSystemLayoutProps {
  children: ReactNode
}

function NavLink({
  to,
  icon,
  label,
  active,
}: {
  to: string
  icon: string
  label: string
  active?: boolean
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-white/10 text-white border-l-3 border-[#037EF3]'
          : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export function AdminSystemLayout({ children }: AdminSystemLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/entrar')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1A1A2E] text-white">
      <div className="px-5 py-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="font-display font-bold text-base">AIESEC Shop</span>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        <NavLink to="/super" icon="⭐" label="Super Admin" active={location.pathname === '/super'} />
        <div className="border-t border-white/10 my-3" />
        <NavLink to="/admin" icon="←" label="Conferências" />
      </nav>

      {user && (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <div className="mt-0.5"><RoleBadge role={user.role} /></div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
            Sair
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile header + drawer */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 h-14 flex items-center gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900" aria-label="Abrir menu">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">Super Admin</span>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 shadow-2xl">{sidebarContent}</div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
