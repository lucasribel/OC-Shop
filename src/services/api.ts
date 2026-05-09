import type { Product, Order, Conference } from '@/types'

/**
 * API abstraction layer.
 *
 * Hoje: dados mockados (estáticos).
 * Amanhã: substituir implementações por chamadas Axios ao backend.
 *
 * NUNCA chamar HTTP diretamente nos componentes.
 * NUNCA importar axios fora deste arquivo.
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockConference: Conference = {
  id: 'conf-1',
  name: 'CONF Nacional 2026',
  aiesec: 'AIESEC Brasil',
  active: true,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
}

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Kit Delegado',
    description: 'Camiseta, crachá e materiais do evento',
    price: 89.90,
    stock: 150,
    conferenceId: 'conf-1',
    active: true,
  },
  {
    id: 'prod-2',
    name: 'Hoodie Oficial',
    description: 'Moletom bordado da conferência',
    price: 149.90,
    stock: 50,
    conferenceId: 'conf-1',
    active: true,
  },
  {
    id: 'prod-3',
    name: 'Caneca Personalizada',
    description: 'Caneca 300ml com logo do evento',
    price: 39.90,
    stock: 200,
    conferenceId: 'conf-1',
    active: true,
  },
  {
    id: 'prod-4',
    name: 'E-book Guia do Delegado',
    description: 'PDF com informações úteis para o evento',
    price: 0,
    stock: 999,
    conferenceId: 'conf-1',
    active: true,
  },
]

const mockOrders: Order[] = [
  {
    id: 'ord-1',
    userId: 'user-1',
    userName: 'Maria Silva',
    conferenceId: 'conf-1',
    items: [
      { productId: 'prod-1', productName: 'Kit Delegado', quantity: 1, unitPrice: 89.90 },
    ],
    total: 89.90,
    status: 'confirmed',
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'ord-2',
    userId: 'user-2',
    userName: 'João Santos',
    conferenceId: 'conf-1',
    items: [
      { productId: 'prod-2', productName: 'Hoodie Oficial', quantity: 2, unitPrice: 149.90 },
      { productId: 'prod-3', productName: 'Caneca Personalizada', quantity: 1, unitPrice: 39.90 },
    ],
    total: 339.70,
    status: 'pending',
    createdAt: '2026-05-03T14:30:00Z',
  },
]

// ---------------------------------------------------------------------------
// Simulated delay
// ---------------------------------------------------------------------------

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function fetchProducts(conferenceId?: string): Promise<Product[]> {
  await delay()
  let list = mockProducts.filter((p) => p.active)
  if (conferenceId) {
    list = list.filter((p) => p.conferenceId === conferenceId)
  }
  return list
}

export async function createProduct(
  data: Omit<Product, 'id'>
): Promise<Product> {
  await delay()
  const product: Product = { ...data, id: `prod-${Date.now()}` }
  mockProducts.push(product)
  return product
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<Product> {
  await delay()
  const idx = mockProducts.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Produto não encontrado')
  mockProducts[idx] = { ...mockProducts[idx], ...data }
  return mockProducts[idx]
}

export async function deleteProduct(id: string): Promise<void> {
  await delay()
  const idx = mockProducts.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Produto não encontrado')
  mockProducts.splice(idx, 1)
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function fetchOrders(conferenceId?: string): Promise<Order[]> {
  await delay()
  let list = [...mockOrders]
  if (conferenceId) {
    list = list.filter((o) => o.conferenceId === conferenceId)
  }
  return list
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  await delay()
  return mockOrders.filter((o) => o.userId === userId)
}

export async function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'status'>
): Promise<Order> {
  await delay()

  // Regra: um pedido ativo por conferência
  const existing = mockOrders.find(
    (o) => o.userId === data.userId && o.conferenceId === data.conferenceId && o.status !== 'cancelled'
  )
  if (existing) {
    throw new Error('Você já possui um pedido ativo para esta conferência')
  }

  // Regra: verificar estoque
  for (const item of data.items) {
    const product = mockProducts.find((p) => p.id === item.productId)
    if (!product) throw new Error(`Produto ${item.productName} não encontrado`)
    if (product.stock < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.productName}`)
    }
    product.stock -= item.quantity
  }

  const order: Order = {
    ...data,
    id: `ord-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  mockOrders.push(order)
  return order
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  await delay()
  const idx = mockOrders.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error('Pedido não encontrado')
  mockOrders[idx] = { ...mockOrders[idx], status }
  return mockOrders[idx]
}

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

export async function fetchActiveConference(): Promise<Conference | null> {
  await delay()
  return mockConference.active ? mockConference : null
}

export async function setConferenceActive(
  id: string,
  active: boolean
): Promise<Conference> {
  await delay()
  mockConference.active = active
  return mockConference
}
