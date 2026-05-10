import type { IConferenceRepository } from '../interfaces/IConferenceRepository'
import type { Conference } from '@/types'
import { http } from './httpClient'

export class HttpConferenceRepository implements IConferenceRepository {
  async findAll(): Promise<Conference[]> {
    const { data } = await http.get<Conference[]>('/conferences')
    return data
  }

  async findBySlug(slug: string): Promise<Conference | null> {
    try {
      const { data } = await http.get<Conference>(`/conferences/slug/${slug}`)
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status: number } }).response?.status === 404) return null
      throw err
    }
  }

  async findById(id: string): Promise<Conference | null> {
    try {
      const { data } = await http.get<Conference>(`/conferences/${id}`)
      return data
    } catch (err: unknown) {
      if ((err as { response?: { status: number } }).response?.status === 404) return null
      throw err
    }
  }

  async findByOwner(ownerId: string): Promise<Conference[]> {
    const all = await this.findAll()
    return all.filter((c) => c.ownerId === ownerId)
  }

  async findByCollaborator(userId: string): Promise<Conference[]> {
    const all = await this.findAll()
    return all.filter((c) => c.collaboratorIds.includes(userId))
  }

  async create(conference: Omit<Conference, 'id'>): Promise<Conference> {
    const { data } = await http.post<Conference>('/conferences', conference)
    return data
  }

  async update(id: string, patch: Partial<Conference>): Promise<Conference> {
    const { data } = await http.put<Conference>(`/conferences/${id}`, patch)
    return data
  }
}
