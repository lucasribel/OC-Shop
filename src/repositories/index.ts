import { HttpProductRepository } from './http/HttpProductRepository'
import { HttpOrderRepository } from './http/HttpOrderRepository'
import { HttpConferenceRepository } from './http/HttpConferenceRepository'
import { HttpUserRepository } from './http/HttpUserRepository'
import { JsonSectionRepository } from './json/JsonSectionRepository'

export const productRepo = new HttpProductRepository()
export const orderRepo = new HttpOrderRepository()
export const conferenceRepo = new HttpConferenceRepository()
export const userRepo = new HttpUserRepository()
export const sectionRepo = new JsonSectionRepository()
