import { getDB } from '../../data/seed'
import type { IConferenceRepository } from '../interfaces/IConferenceRepository'
import type { Conference } from '../../types'

let _data: Conference[] | null = null

function store(): Conference[] {
  if (!_data) _data = getDB().conferences
  return _data
}

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), 80))
}

function generateId(): string {
  return 'conf_' + Math.random().toString(36).slice(2, 9)
}

export class JsonConferenceRepository implements IConferenceRepository {
  async findAll(): Promise<Conference[]> {
    return delay([...store()])
  }

  async findBySlug(slug: string): Promise<Conference | null> {
    return delay(store().find((c) => c.slug === slug) ?? null)
  }

  async findById(id: string): Promise<Conference | null> {
    return delay(store().find((c) => c.id === id) ?? null)
  }

  async findByOwner(ownerId: string): Promise<Conference[]> {
    return delay(store().filter((c) => c.ownerId === ownerId))
  }

  async findByCollaborator(userId: string): Promise<Conference[]> {
    return delay(store().filter((c) => c.collaboratorIds.includes(userId)))
  }

  async create(data: Omit<Conference, 'id'>): Promise<Conference> {
    const conference: Conference = { ...data, id: generateId() }
    store().push(conference)
    return delay(conference)
  }

  async update(id: string, data: Partial<Conference>): Promise<Conference> {
    const list = store()
    const idx = list.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error(`Conference ${id} not found`)
    list[idx] = { ...list[idx], ...data }
    return delay(list[idx])
  }
}
