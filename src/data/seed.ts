import db from './db.json'
import type { SystemConfig, User, Conference, Product, Order } from '../types'

interface DB {
  config: SystemConfig
  users: User[]
  conferences: Conference[]
  products: Product[]
  orders: Order[]
}

export function getDB(): DB {
  return JSON.parse(JSON.stringify(db))
}
