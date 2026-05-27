import { HttpProductRepository } from './http/HttpProductRepository'
import { HttpOrderRepository } from './http/HttpOrderRepository'
import { HttpConferenceRepository } from './http/HttpConferenceRepository'
import { HttpUserRepository } from './http/HttpUserRepository'
import { JsonProductRepository } from './json/JsonProductRepository'
import { JsonOrderRepository } from './json/JsonOrderRepository'
import { JsonConferenceRepository } from './json/JsonConferenceRepository'
import { JsonUserRepository } from './json/JsonUserRepository'
import { JsonSectionRepository } from './json/JsonSectionRepository'
import { getApiUrl } from '@/config/api'

const apiUrl = getApiUrl()
// 'mock' → JSON local | '' ou 'http...' → HTTP (Cloudflare Functions ou backend externo)
const isMock = apiUrl === 'mock'

if (isMock) {
  console.log('[OC-Shop] Modo mock (dados locais)')
} else {
  console.log('[OC-Shop] Modo API —', apiUrl || '/api (mesmo domínio)')
}

export const productRepo = isMock ? new JsonProductRepository() : new HttpProductRepository()
export const orderRepo = isMock ? new JsonOrderRepository() : new HttpOrderRepository()
export const conferenceRepo = isMock ? new JsonConferenceRepository() : new HttpConferenceRepository()
export const userRepo = isMock ? new JsonUserRepository() : new HttpUserRepository()
export const sectionRepo = new JsonSectionRepository()
