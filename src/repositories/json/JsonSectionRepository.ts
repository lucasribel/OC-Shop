import { getDB } from '../../data/seed'
import type { ISectionRepository } from '../interfaces/ISectionRepository'
import type { ProductSection } from '../../types'

let _data: ProductSection[] | null = null

function store(): ProductSection[] {
  if (!_data) _data = getDB().sections ?? []
  return _data
}

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), 80))
}

function generateId(): string {
  return 'sec_' + Math.random().toString(36).slice(2, 9)
}

export class JsonSectionRepository implements ISectionRepository {
  async findByConference(conferenceId: string): Promise<ProductSection[]> {
    return delay(
      store()
        .filter((s) => s.conferenceId === conferenceId)
        .sort((a, b) => a.order - b.order)
    )
  }

  async create(data: Omit<ProductSection, 'id'>): Promise<ProductSection> {
    const section: ProductSection = { ...data, id: generateId() }
    store().push(section)
    return delay(section)
  }

  async update(id: string, data: Partial<ProductSection>): Promise<ProductSection> {
    const list = store()
    const idx = list.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`Section ${id} not found`)
    list[idx] = { ...list[idx], ...data }
    return delay({ ...list[idx] })
  }

  async delete(id: string): Promise<void> {
    const list = store()
    const idx = list.findIndex((s) => s.id === id)
    if (idx !== -1) list.splice(idx, 1)
    return delay(undefined)
  }

  async reorder(conferenceId: string, orderedIds: string[]): Promise<ProductSection[]> {
    const list = store().filter((s) => s.conferenceId === conferenceId)
    orderedIds.forEach((id, index) => {
      const section = list.find((s) => s.id === id)
      if (section) section.order = index
    })
    return delay(
      list.sort((a, b) => a.order - b.order)
    )
  }

  async reorderProducts(sectionId: string, orderedProductIds: string[]): Promise<ProductSection> {
    const list = store()
    const idx = list.findIndex((s) => s.id === sectionId)
    if (idx === -1) throw new Error(`Section ${sectionId} not found`)
    list[idx] = { ...list[idx], productIds: orderedProductIds }
    return delay({ ...list[idx] })
  }
}
