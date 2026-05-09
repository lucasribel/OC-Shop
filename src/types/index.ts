export interface User {
  id: string
  email: string
  name: string
  picture?: string
  role: 'user' | 'adm' | 'super_adm'
  aiesec?: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  image?: string
  conferenceId: string
  active: boolean
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Order {
  id: string
  userId: string
  userName: string
  conferenceId: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
}

export interface Conference {
  id: string
  name: string
  aiesec: string
  active: boolean
  startDate: string
  endDate: string
}
