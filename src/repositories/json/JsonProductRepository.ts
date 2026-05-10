import { getDB } from '../../data/seed'
import type { IProductRepository } from '../interfaces/IProductRepository'
import type { Product } from '../../types'

let _data: Product[] | null = null

function store(): Product[] {
  if (!_data) _data = getDB().products
  return _data
}

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), 80))
}

function generateId(): string {
  return 'prod_' + Math.random().toString(36).slice(2, 9)
}

export class JsonProductRepository implements IProductRepository {
  async findByConference(conferenceId: string): Promise<Product[]> {
    return delay(store().filter((p) => p.conferenceId === conferenceId && p.active))
  }

  async findById(id: string): Promise<Product | null> {
    return delay(store().find((p) => p.id === id) ?? null)
  }

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const product: Product = { ...data, id: generateId() }
    store().push(product)
    return delay(product)
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const list = store()
    const idx = list.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`Product ${id} not found`)
    list[idx] = { ...list[idx], ...data }
    return delay(list[idx])
  }

  async delete(id: string): Promise<void> {
    const list = store()
    const idx = list.findIndex((p) => p.id === id)
    if (idx !== -1) list.splice(idx, 1)
    return delay(undefined)
  }
}
