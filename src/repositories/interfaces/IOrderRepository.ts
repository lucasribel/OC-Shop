import type { Order } from '../../types'

export interface IOrderRepository {
  findByConference(conferenceId: string): Promise<Order[]>
  findByBuyer(email: string, phone?: string): Promise<Order[]>
  findByUserId(userId: string): Promise<Order[]>
  findActiveByBuyerAndConference(email: string, conferenceId: string): Promise<Order | null>
  create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>
  updateStatus(id: string, status: Order['status']): Promise<Order>
}
