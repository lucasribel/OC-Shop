import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    setOpen(false)
    setMobileOpen(false)
    navigate('/')
  }

  const isAdminUser = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'collaborator')

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg className="w-7 h-7 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="text-lg font-display font-bold text-[#037EF3]">AIESEC Shop</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link to="/meus-pedidos" className="text-sm font-medium text-gray-500 hover:text-[#037EF3] transition-colors">
                  Meus Pedidos
                </Link>
                {isAdminUser && (
                  <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-[#037EF3] transition-colors">
                    Admin
                  </Link>
                )}
                {/* User menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {open && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                        <div className="mt-1.5"><RoleBadge role={user.role} /></div>
                      </div>
                      <div className="py-1">
                        <Link to="/meus-pedidos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>
                          Meus Pedidos
                        </Link>
                        {isAdminUser && (
                          <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>
                            Admin
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-gray-50 pt-1">
                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-[#E53E3E] hover:bg-red-50 transition-colors">
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
              >
                Entrar →
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
              <span className="font-display font-bold text-[#037EF3]">AIESEC Shop</span>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="py-4 px-4 space-y-1">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Link to="/meus-pedidos" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                    Meus Pedidos
                  </Link>
                  {isAdminUser && (
                    <Link to="/admin" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>
                      Admin
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm text-[#E53E3E] hover:bg-red-50 rounded-lg mt-4">
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { navigate('/login'); setMobileOpen(false) }}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
                >
                  Entrar →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
