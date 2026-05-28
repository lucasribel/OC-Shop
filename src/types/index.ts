// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export type SystemMode = 'open' | 'closed'

export type UserRole = 'user' | 'adm' | 'super_adm' | 'collaborator' | 'admin' | 'super_admin'

export interface SystemConfig {
  mode: SystemMode
  allowedAdminDomain: string | null
  setupCompleted: boolean
  aiesecName?: string
  pixKey?: string
  pixName?: string
  pixInstructions?: string
  spreadsheetId?: string
  spreadsheetUrl?: string
  driveFolderId?: string
  driveFolderUrl?: string
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  role: UserRole
  aiesec?: string
  googleId?: string
  conferenceIds?: string[]
}

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

export interface Conference {
  id: string
  name: string
  slug: string
  aiesec: string
  active: boolean
  status: 'draft' | 'open' | 'closed'
  startDate: string
  endDate: string
  orderDeadline: string
  ownerId: string
  collaboratorIds: string[]
  allowOrderEditing?: boolean
  orderEditDeadlineHours?: number
  pageConfig?: {
    bannerUrl?: string
    bannerTitle?: string
    description?: string
  }
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ProductVariant {
  label: string
  options: string[]
}

export interface Product {
  id: string
  conferenceId: string
  name: string
  description: string
  price: number
  stock: number
  image?: string
  imageUrl: string
  active: boolean
  variants: ProductVariant[]
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  selectedVariants: Record<string, string>
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Order {
  id: string
  conferenceId: string
  conferenceSlug: string
  userId: string
  userName: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
}

export interface ProductSection {
  id: string
  conferenceId: string
  name: string
  description?: string
  order: number
  productIds: string[]
}

export interface ConferencePage {
  conferenceId: string
  bannerUrl?: string
  bannerTitle?: string
  description?: string
  sections: ProductSection[]
}
