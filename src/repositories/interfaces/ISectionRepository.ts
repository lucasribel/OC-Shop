import type { ProductSection } from '../../types'

export interface ISectionRepository {
  findByConference(conferenceId: string): Promise<ProductSection[]>
  create(section: Omit<ProductSection, 'id'>): Promise<ProductSection>
  update(id: string, data: Partial<ProductSection>): Promise<ProductSection>
  delete(id: string): Promise<void>
  reorder(conferenceId: string, orderedIds: string[]): Promise<ProductSection[]>
  reorderProducts(sectionId: string, orderedProductIds: string[]): Promise<ProductSection>
}
