import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'active' | 'closed' | 'pending' | 'confirmed' | 'cancelled' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantDot: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  active: 'bg-[#00A94F]',
  closed: 'bg-[#6B7280]',
  pending: 'bg-[#F48024]',
  confirmed: 'bg-[#00A94F]',
  cancelled: 'bg-[#E53E3E]',
  info: 'bg-[#037EF3]',
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-[#6B7280]',
  active: 'bg-[#E6F7EE] text-[#00A94F]',
  closed: 'bg-[#F3F4F6] text-[#6B7280]',
  pending: 'bg-[#FFF3E0] text-[#F48024]',
  confirmed: 'bg-[#E6F7EE] text-[#00A94F]',
  cancelled: 'bg-[#FEE2E2] text-[#E53E3E]',
  info: 'bg-[#E8F4FE] text-[#037EF3]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold
        ${variantClasses[variant]}
        ${className}
      `.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${variantDot[variant]}`} />
      {children}
    </span>
  )
}

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
}

export function OrderStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
  }
  return (
    <Badge variant={statusVariant[status] ?? 'default'}>
      {labels[status] ?? status}
    </Badge>
  )
}

const roleVariant: Record<string, BadgeVariant> = {
  user: 'default',
  collaborator: 'info',
  admin: 'active',
  super_admin: 'pending',
  adm: 'active',
  super_adm: 'pending',
}

const roleLabels: Record<string, string> = {
  user: 'Usuário',
  collaborator: 'Colaborador',
  admin: 'Admin',
  super_admin: 'Super Admin',
  adm: 'ADM',
  super_adm: 'Super ADM',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={roleVariant[role] ?? 'default'}>
      {roleLabels[role] ?? role}
    </Badge>
  )
}
