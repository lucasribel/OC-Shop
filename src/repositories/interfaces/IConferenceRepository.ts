import type { Conference } from '../../types'

export interface IConferenceRepository {
  findAll(): Promise<Conference[]>
  findBySlug(slug: string): Promise<Conference | null>
  findById(id: string): Promise<Conference | null>
  findByOwner(ownerId: string): Promise<Conference[]>
  findByCollaborator(userId: string): Promise<Conference[]>
  create(conference: Omit<Conference, 'id'>): Promise<Conference>
  update(id: string, data: Partial<Conference>): Promise<Conference>
  addCollaborator(conferenceId: string, userId: string): Promise<Conference>
  removeCollaborator(conferenceId: string, userId: string): Promise<Conference>
  transferOwner(conferenceId: string, newOwnerId: string): Promise<Conference>
}
