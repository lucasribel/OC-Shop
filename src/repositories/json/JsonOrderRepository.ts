import { getDB } from '../../data/seed'
import type { IOrderRepository } from '../interfaces/IOrderRepository'
import type { Order } from '../../types'

let _data: Order[] | null = null

function store(): Order[] {
  if (!_data) _data = getDB().orders
  return _data
}

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), 80))
}

function generateId(): string {
  return 'ord_' + Math.random().toString(36).slice(2, 9)
}

export class JsonOrderRepository implements IOrderRepository {
  async findByConference(conferenceId: string): Promise<Order[]> {
    return delay(store().filter((o) => o.conferenceId === conferenceId))
  }

  async findByBuyer(email: string, _phone?: string): Promise<Order[]> {
    return delay(store().filter((o) => o.buyerEmail === email))
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return delay(store().filter((o) => o.userId === userId))
  }

  async findActiveByBuyerAndConference(
    email: string,
    conferenceId: string
  ): Promise<Order | null> {
    return delay(
      store().find(
        (o) =>
          o.buyerEmail === email &&
          o.conferenceId === conferenceId &&
          o.status !== 'cancelled'
      ) ?? null
    )
  }

  async create(data: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const order: Order = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    store().push(order)
    return delay(order)
  }

  async updateStatus(id: string, status: Order['status']): Promise<Order> {
    const list = store()
    const idx = list.findIndex((o) => o.id === id)
    if (idx === -1) throw new Error(`Order ${id} not found`)
    list[idx] = { ...list[idx], status }
    return delay(list[idx])
  }
}
