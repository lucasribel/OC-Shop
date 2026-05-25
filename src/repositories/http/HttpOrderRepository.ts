import type { IOrderRepository } from '../interfaces/IOrderRepository'
import type { Order } from '@/types'
import { http } from './httpClient'

export class HttpOrderRepository implements IOrderRepository {
  async findByConference(conferenceId: string): Promise<Order[]> {
    const { data } = await http.get<Order[]>('/orders', { params: { conferenceId } })
    return data
  }

  async findByBuyer(email: string, phone?: string): Promise<Order[]> {
    const { data } = await http.get<Order[]>('/orders/buyer', { params: { email, phone } })
    return data
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const { data } = await http.get<Order[]>(`/orders/user/${userId}`)
    return data
  }

  async findActiveByBuyerAndConference(email: string, conferenceId: string): Promise<Order | null> {
    const orders = await this.findByBuyer(email)
    return (
      orders.find((o) => o.conferenceId === conferenceId && o.status !== 'cancelled') ?? null
    )
  }

  async create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const { data } = await http.post<Order>('/orders', order)
    return data
  }

  async updateStatus(id: string, status: Order['status']): Promise<Order> {
    const { data } = await http.put<Order>(`/orders/${id}/status`, { status })
    return data
  }

  async update(id: string, data: Partial<Order>): Promise<Order> {
    const { data: order } = await http.put<Order>(`/orders/${id}`, data)
    return order
  }

  async delete(id: string): Promise<void> {
    await http.delete(`/orders/${id}`)
  }
}
