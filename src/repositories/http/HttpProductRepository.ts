import type { IProductRepository } from '../interfaces/IProductRepository'
import type { Product } from '@/types'
import { http } from './httpClient'

export class HttpProductRepository implements IProductRepository {
  async findByConference(conferenceId: string): Promise<Product[]> {
    const { data } = await http.get<Product[]>('/products', { params: { conferenceId } })
    return data
  }

  async findById(id: string): Promise<Product | null> {
    try {
      const { data } = await http.get<Product>(`/products/${id}`)
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status: number } }).response?.status === 404) return null
      throw err
    }
  }

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const { data } = await http.post<Product>('/products', product)
    return data
  }

  async update(id: string, patch: Partial<Product>): Promise<Product> {
    const { data } = await http.put<Product>(`/products/${id}`, patch)
    return data
  }

  async delete(id: string): Promise<void> {
    await http.delete(`/products/${id}`)
  }
}
