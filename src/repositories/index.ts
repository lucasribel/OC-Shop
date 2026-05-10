import { JsonProductRepository } from './json/JsonProductRepository'
import { JsonOrderRepository } from './json/JsonOrderRepository'
import { JsonConferenceRepository } from './json/JsonConferenceRepository'
import { JsonUserRepository } from './json/JsonUserRepository'

// Troque a implementação aqui quando migrar para Sheets ou Firebase.
// Os componentes nunca importam diretamente das pastas json/ sheets/ firebase/
export const productRepo = new JsonProductRepository()
export const orderRepo = new JsonOrderRepository()
export const conferenceRepo = new JsonConferenceRepository()
export const userRepo = new JsonUserRepository()
