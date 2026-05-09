import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  )
}

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
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
  adm: 'info',
  super_adm: 'warning',
}

export function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    user: 'Usuário',
    adm: 'ADM',
    super_adm: 'Super ADM',
  }
  return (
    <Badge variant={roleVariant[role] ?? 'default'}>
      {labels[role] ?? role}
    </Badge>
  )
}
