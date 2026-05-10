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

  async addCollaborator(conferenceId: string, userId: string): Promise<Conference> {
    const conf = store().find((c) => c.id === conferenceId)
    if (!conf) throw new Error(`Conference ${conferenceId} not found`)
    if (!conf.collaboratorIds.includes(userId)) {
      conf.collaboratorIds.push(userId)
      const users = getDB().users
      const user = users.find((u) => u.id === userId)
      if (user && !user.conferenceIds?.includes(conferenceId)) {
        user.conferenceIds = [...(user.conferenceIds || []), conferenceId]
      }
    }
    return delay({ ...conf })
  }

  async removeCollaborator(conferenceId: string, userId: string): Promise<Conference> {
    const conf = store().find((c) => c.id === conferenceId)
    if (!conf) throw new Error(`Conference ${conferenceId} not found`)
    conf.collaboratorIds = conf.collaboratorIds.filter((id) => id !== userId)
    const users = getDB().users
    const user = users.find((u) => u.id === userId)
    if (user?.conferenceIds) {
      user.conferenceIds = user.conferenceIds.filter((id) => id !== conferenceId)
    }
    return delay({ ...conf })
  }

  async transferOwner(conferenceId: string, newOwnerId: string): Promise<Conference> {
    const conf = store().find((c) => c.id === conferenceId)
    if (!conf) throw new Error(`Conference ${conferenceId} not found`)
    const oldOwnerId = conf.ownerId
    conf.ownerId = newOwnerId
    if (!conf.collaboratorIds.includes(oldOwnerId)) {
      conf.collaboratorIds.push(oldOwnerId)
    }
    conf.collaboratorIds = conf.collaboratorIds.filter((id) => id !== newOwnerId)
    return delay({ ...conf })
  }
}
