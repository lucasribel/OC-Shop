/**
 * API abstraction layer.
 *
 * Camada que expõe funções para os componentes e stores.
 * Internamente delega para os repositórios — nunca contém dados hardcoded.
 *
 * Hoje: repositórios JSON (dados mockados).
 * Amanhã: trocar repositórios por implementações Firebase/Sheets.
 */

import { productRepo, orderRepo, conferenceRepo, userRepo, sectionRepo } from '../repositories'
import type { Product, Order, Conference, OrderItem, User, SystemConfig } from '../types'

// ---------------------------------------------------------------------------
// Tipos auxiliares para compatibilidade com páginas existentes
// ---------------------------------------------------------------------------

// Items que as páginas passam — sem selectedVariants
type PageOrderItem = Omit<OrderItem, 'selectedVariants'>

interface CreateOrderInput {
  userId: string
  userName: string
  conferenceId: string
  items: PageOrderItem[]
  total: number
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function fetchProducts(conferenceId?: string): Promise<Product[]> {
  if (conferenceId) {
    return productRepo.findByConference(conferenceId)
  }
  // Se não informou conferência, usa a primeira ativa
  const all = await conferenceRepo.findAll()
  const active = all.find((c) => c.status === 'open')
  if (!active) return []
  return productRepo.findByConference(active.id)
}

export async function createProduct(
  data: Omit<Product, 'id'>
): Promise<Product> {
  const defaults = {
    image: data.image ?? '',
    imageUrl: data.imageUrl ?? data.image ?? '',
    variants: data.variants ?? [],
  }
  return productRepo.create({ ...defaults, ...data })
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<Product> {
  return productRepo.update(id, data)
}

export async function deleteProduct(id: string): Promise<void> {
  return productRepo.delete(id)
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function fetchOrders(conferenceId?: string): Promise<Order[]> {
  if (conferenceId) return orderRepo.findByConference(conferenceId)
  const all = await conferenceRepo.findAll()
  const active = all.find((c) => c.status === 'open')
  if (!active) return []
  return orderRepo.findByConference(active.id)
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  return orderRepo.findByUserId(userId)
}

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  // Busca conferência para obter slug
  const conf = await conferenceRepo.findById(data.conferenceId)
  if (!conf) throw new Error('Conferência não encontrada')

  // Regra: verificar se conferência está aberta
  if (conf.status !== 'open') {
    throw new Error('A loja está fechada para esta conferência')
  }

  // Busca dados do usuário para enriquecer o pedido
  let buyerEmail = ''
  if (data.userId) {
    const user = await userRepo.findById(data.userId)
    if (user) {
      buyerEmail = user.email
    }
  }

  // Regra: um pedido ativo por comprador por conferência
  const existing = await orderRepo.findActiveByBuyerAndConference(
    buyerEmail,
    data.conferenceId
  )
  if (existing) {
    throw new Error('Você já possui um pedido ativo para esta conferência')
  }

  // Regra: verificar estoque
  for (const item of data.items) {
    const product = await productRepo.findById(item.productId)
    if (!product) throw new Error(`Produto ${item.productName} não encontrado`)
    if (product.stock < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.productName}`)
    }
  }

  // Cria o pedido completo
  const fullOrder: Omit<Order, 'id' | 'createdAt'> = {
    conferenceId: data.conferenceId,
    conferenceSlug: conf.slug,
    userId: data.userId,
    userName: data.userName,
    buyerName: data.userName,
    buyerEmail,
    buyerPhone: '',
    items: data.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedVariants: {},
    })),
    total: data.total,
    status: 'pending',
  }

  return orderRepo.create(fullOrder)
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  return orderRepo.updateStatus(id, status)
}

// ---------------------------------------------------------------------------
// Conference
// ---------------------------------------------------------------------------

export async function fetchActiveConference(): Promise<Conference | null> {
  const all = await conferenceRepo.findAll()
  return all.find((c) => c.status === 'open') ?? null
}

export async function setConferenceActive(
  id: string,
  active: boolean
): Promise<Conference> {
  return conferenceRepo.update(id, {
    status: active ? 'open' : 'closed',
  })
}

// ---------------------------------------------------------------------------
// API object — namespace para páginas novas
// ---------------------------------------------------------------------------

interface CreateBuyerOrderInput {
  conferenceId: string
  conferenceSlug: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string
  userId: string
  userName: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    selectedVariants: Record<string, string>
  }>
  total: number
}

export const api = {
  conferences: {
    listAll: () => conferenceRepo.findAll(),
    getBySlug: (slug: string) => conferenceRepo.findBySlug(slug),
    getById: (id: string) => conferenceRepo.findById(id),
    listByOwner: (ownerId: string) => conferenceRepo.findByOwner(ownerId),
    listByCollaborator: (userId: string) => conferenceRepo.findByCollaborator(userId),
    create: (data: Omit<Conference, 'id'>) => conferenceRepo.create(data),
    update: (id: string, data: Partial<Conference>) => conferenceRepo.update(id, data),
    addCollaborator: (conferenceId: string, userId: string) => conferenceRepo.addCollaborator(conferenceId, userId),
    removeCollaborator: (conferenceId: string, userId: string) => conferenceRepo.removeCollaborator(conferenceId, userId),
    transferOwner: (conferenceId: string, newOwnerId: string) => conferenceRepo.transferOwner(conferenceId, newOwnerId),
  },
  products: {
    listByConference: (conferenceId: string) =>
      productRepo.findByConference(conferenceId),
    getById: (id: string) => productRepo.findById(id),
  },
  sections: {
    listByConference: (conferenceId: string) => sectionRepo.findByConference(conferenceId),
    create: (data: Parameters<typeof sectionRepo.create>[0]) => sectionRepo.create(data),
    update: (id: string, data: Parameters<typeof sectionRepo.update>[1]) => sectionRepo.update(id, data),
    delete: (id: string) => sectionRepo.delete(id),
    reorder: (conferenceId: string, orderedIds: string[]) => sectionRepo.reorder(conferenceId, orderedIds),
    reorderProducts: (sectionId: string, orderedProductIds: string[]) => sectionRepo.reorderProducts(sectionId, orderedProductIds),
  },
  orders: {
    checkDuplicate: (email: string, conferenceId: string) =>
      orderRepo.findActiveByBuyerAndConference(email, conferenceId),
    listByBuyer: (email: string, phone?: string) =>
      orderRepo.findByBuyer(email, phone),
    listByUser: (userId: string) =>
      orderRepo.findByUserId(userId),
    listByConference: (conferenceId: string) =>
      orderRepo.findByConference(conferenceId),
    create: async (data: CreateBuyerOrderInput): Promise<Order> => {
      // Verificar estoque
      for (const item of data.items) {
        const product = await productRepo.findById(item.productId)
        if (!product) throw new Error(`Produto ${item.productName} não encontrado`)
        if (product.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para ${item.productName}`)
        }
      }

      return orderRepo.create({
        conferenceId: data.conferenceId,
        conferenceSlug: data.conferenceSlug,
        userId: data.userId,
        userName: data.userName,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        items: data.items,
        total: data.total,
        status: 'pending',
      })
    },
    update: (id: string, data: Partial<Order>) => orderRepo.update(id, data),
    updateStatus: (id: string, status: Order['status']) => orderRepo.updateStatus(id, status),
    delete: (id: string) => orderRepo.delete(id),
  },
  users: {
    getConfig: () => userRepo.getConfig(),
    getById: (id: string) => userRepo.findById(id),
    getByEmail: (email: string) => userRepo.findByEmail(email),
    listAll: () => userRepo.findAll(),
    create: (data: Omit<User, 'id'>) => userRepo.create(data),
    update: (id: string, data: Partial<User>) => userRepo.update(id, data),
    updateConfig: (data: Partial<SystemConfig>) => userRepo.updateConfig(data),
  },
}
