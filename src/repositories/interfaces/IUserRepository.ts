import type { User, SystemConfig } from '../../types'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findAll(): Promise<User[]>
  create(user: Omit<User, 'id'>): Promise<User>
  update(id: string, data: Partial<User>): Promise<User>
  getConfig(): Promise<SystemConfig>
  updateConfig(config: Partial<SystemConfig>): Promise<SystemConfig>
}
