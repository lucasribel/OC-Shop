import type { Product } from '../../types'

export interface IProductRepository {
  findByConference(conferenceId: string): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  create(product: Omit<Product, 'id'>): Promise<Product>
  update(id: string, data: Partial<Product>): Promise<Product>
  delete(id: string): Promise<void>
}
