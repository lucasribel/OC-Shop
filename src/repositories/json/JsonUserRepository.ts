import { getDB } from '../../data/seed'
import type { IUserRepository } from '../interfaces/IUserRepository'
import type { User, SystemConfig } from '../../types'

interface MemState {
  users: User[] | null
  config: SystemConfig | null
}

const mem: MemState = { users: null, config: null }

function store(): { users: User[]; config: SystemConfig } {
  if (!mem.users || !mem.config) {
    const db = getDB()
    mem.users = db.users
    mem.config = db.config
  }
  return { users: mem.users!, config: mem.config! }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), 80))
}

function generateId(): string {
  return 'user_' + Math.random().toString(36).slice(2, 9)
}

export class JsonUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return delay(store().users.find((u) => u.id === id) ?? null)
  }

  async findByEmail(email: string): Promise<User | null> {
    return delay(store().users.find((u) => u.email === email) ?? null)
  }

  async findAll(): Promise<User[]> {
    return delay([...store().users])
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = { ...data, id: generateId() }
    store().users.push(user)
    return delay(user)
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const list = store().users
    const idx = list.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`User ${id} not found`)
    list[idx] = { ...list[idx], ...data }
    return delay(list[idx])
  }

  async getConfig(): Promise<SystemConfig> {
    return delay({ ...store().config })
  }

  async updateConfig(data: Partial<SystemConfig>): Promise<SystemConfig> {
    const cfg = store().config
    Object.assign(cfg, data)
    return delay({ ...cfg })
  }
}
