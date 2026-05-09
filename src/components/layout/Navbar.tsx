import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
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

  if (!user) return null

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-500">
              AIESEC Shop
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/shop"
              className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
            >
              Loja
            </Link>
            <Link
              to="/meus-pedidos"
              className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
            >
              Meus Pedidos
            </Link>
            {(user.role === 'adm' || user.role === 'super_adm') && (
              <>
                <Link
                  to="/admin/produtos"
                  className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
                >
                  Admin Produtos
                </Link>
                <Link
                  to="/admin/pedidos"
                  className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
                >
                  Admin Pedidos
                </Link>
              </>
            )}
            {user.role === 'super_adm' && (
              <Link
                to="/superadmin"
                className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
              >
                Super Admin
              </Link>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user.name}
              </span>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <div className="mt-1">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
                <div className="md:hidden">
                  <Link
                    to="/shop"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    Loja
                  </Link>
                  <Link
                    to="/meus-pedidos"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setOpen(false)}
                  >
                    Meus Pedidos
                  </Link>
                  {(user.role === 'adm' || user.role === 'super_adm') && (
                    <>
                      <Link
                        to="/admin/produtos"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setOpen(false)}
                      >
                        Admin Produtos
                      </Link>
                      <Link
                        to="/admin/pedidos"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setOpen(false)}
                      >
                        Admin Pedidos
                      </Link>
                    </>
                  )}
                </div>
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => {
                      logout()
                      setOpen(false)
                      navigate('/login')
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
