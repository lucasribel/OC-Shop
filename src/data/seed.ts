import dbSetup from './db.setup.json'
import dbFechado from './db.fechado.json'
import dbAberto from './db.aberto.json'
import dbProduction from './db.json'
import type { SystemConfig, User, Conference, Product, Order, ProductSection } from '../types'

export interface DB {
  config: SystemConfig
  users: User[]
  conferences: Conference[]
  sections: ProductSection[]
  products: Product[]
  orders: Order[]
}

// Singleton em memória — retorna por REFERÊNCIA (mutável)
let _db: DB | null = null

function selectDB(): DB {
  const mode = import.meta.env.VITE_DB_MODE || 'production'
  const source = (() => {
    switch (mode) {
      case 'setup':    return dbSetup
      case 'fechado':  return dbFechado
      case 'aberto':   return dbAberto
      default:         return dbProduction
    }
  })()
  // Deep copy APENAS na inicialização — depois trabalha por referência
  return JSON.parse(JSON.stringify(source))
}

// Retorna a MESMA instância a cada chamada (referência mutável)
export function getDB(): DB {
  if (!_db) _db = selectDB()
  return _db
}

// Útil para recarregar dados em modo dev
export function resetDB(): void {
  _db = null
}
