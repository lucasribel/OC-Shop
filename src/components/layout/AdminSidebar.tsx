import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

function NavLink({
  to,
  icon,
  label,
  active,
  onClick,
}: {
  to: string
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-white/10 text-white border-l-3 border-[#037EF3] ml-0'
          : 'text-gray-300 hover:bg-white/5 hover:text-white ml-0'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin, isSuperAdmin } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/entrar')
  }

  const isActive = (path: string) => location.pathname === path

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1A1A2E] text-white">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="font-display font-bold text-base">AIESEC Shop</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {slug && (
          <>
            <NavLink
              to={`/admin/${slug}/dashboard`}
              icon="📊"
              label="Dashboard"
              active={isActive(`/admin/${slug}/dashboard`)}
              onClick={onClose}
            />
            <NavLink
              to={`/admin/${slug}/produtos`}
              icon="📦"
              label="Produtos"
              active={isActive(`/admin/${slug}/produtos`)}
              onClick={onClose}
            />
            <NavLink
              to={`/admin/${slug}/secoes`}
              icon="🗂️"
              label="Seções do Shop"
              active={isActive(`/admin/${slug}/secoes`)}
              onClick={onClose}
            />
            <NavLink
              to={`/admin/${slug}/pedidos`}
              icon="🧾"
              label="Pedidos"
              active={isActive(`/admin/${slug}/pedidos`)}
              onClick={onClose}
            />
            <NavLink
              to={`/admin/${slug}/equipe`}
              icon="👥"
              label="Equipe"
              active={isActive(`/admin/${slug}/equipe`)}
              onClick={onClose}
            />
            {isAdmin() && (
              <NavLink
                to={`/admin/${slug}/configuracoes`}
                icon="⚙️"
                label="Configurações"
                active={isActive(`/admin/${slug}/configuracoes`)}
                onClick={onClose}
              />
            )}
          </>
        )}

        <div className="border-t border-white/10 my-3" />

        {isSuperAdmin() && (
          <NavLink
            to="/super"
            icon="⭐"
            label="Super Admin"
            active={isActive('/super')}
            onClick={onClose}
          />
        )}

        <NavLink
          to="/admin"
          icon="←"
          label="Conferências"
          active={isActive('/admin')}
          onClick={onClose}
        />
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <div className="mt-0.5">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
