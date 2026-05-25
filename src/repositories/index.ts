import { HttpProductRepository } from './http/HttpProductRepository'
import { HttpOrderRepository } from './http/HttpOrderRepository'
import { HttpConferenceRepository } from './http/HttpConferenceRepository'
import { HttpUserRepository } from './http/HttpUserRepository'
import { JsonProductRepository } from './json/JsonProductRepository'
import { JsonOrderRepository } from './json/JsonOrderRepository'
import { JsonConferenceRepository } from './json/JsonConferenceRepository'
import { JsonUserRepository } from './json/JsonUserRepository'
import { JsonSectionRepository } from './json/JsonSectionRepository'

// Só usa HTTP se VITE_API_URL for uma URL real (começa com http:// ou https://)
const apiUrl = import.meta.env.VITE_API_URL as string | undefined
const isHttp = typeof apiUrl === 'string' && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))

if (isHttp) {
  console.log('[OC-Shop] Modo HTTP — conectando ao backend em', apiUrl)
} else {
  console.log('[OC-Shop] Modo mock (dados locais)')
}

export const productRepo = isHttp ? new HttpProductRepository() : new JsonProductRepository()
export const orderRepo = isHttp ? new HttpOrderRepository() : new JsonOrderRepository()
export const conferenceRepo = isHttp ? new HttpConferenceRepository() : new JsonConferenceRepository()
export const userRepo = isHttp ? new HttpUserRepository() : new JsonUserRepository()
export const sectionRepo = new JsonSectionRepository()
