import type { IUserRepository } from '../interfaces/IUserRepository'
import type { User, SystemConfig } from '@/types'
import { http } from './httpClient'

export class HttpUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const { data } = await http.get<User>(`/users/${id}`)
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status: number } }).response?.status === 404) return null
      throw err
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data } = await http.get<User>(`/users/email/${email}`)
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status: number } }).response?.status === 404) return null
      throw err
    }
  }

  async findAll(): Promise<User[]> {
    const { data } = await http.get<User[]>('/users')
    return data
  }

  async create(user: Omit<User, 'id'>): Promise<User> {
    const { data } = await http.post<User>('/users', user)
    return data
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    const { data } = await http.put<User>(`/users/${id}`, patch)
    return data
  }

  async getConfig(): Promise<SystemConfig> {
    const { data } = await http.get<SystemConfig>('/config')
    return data
  }

  async updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    const { data } = await http.put<SystemConfig>('/config', config)
    return data
  }
}
