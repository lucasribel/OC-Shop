// Mock data — usado quando Google Sheets não está configurado
const path = require('path')
const fs = require('fs')

let _db = null

function loadDB() {
  if (_db) return _db
  try {
    const dbPath = path.join(__dirname, '../../../src/data/db.json')
    _db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
    console.log('[mockData] Dados carregados de src/data/db.json')
  } catch {
    console.log('[mockData] db.json não encontrado — usando dados vazios')
    _db = {
      config: { mode: 'closed', allowedAdminDomain: null, setupCompleted: true },
      users: [],
      conferences: [],
      sections: [],
      products: [],
      orders: [],
    }
  }
  return _db
}

function resetDB() {
  _db = null
}

module.exports = { loadDB, resetDB }
