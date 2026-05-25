// scripts/reset-dev-state.js
const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, '../src/data/db.json')
const templatePath = path.join(__dirname, '../src/data/db.template.json')

if (fs.existsSync(templatePath)) {
  fs.copyFileSync(templatePath, dbPath)
  console.log('\u2705 Estado de dev resetado para o template original')
} else {
  console.warn('\u26a0\ufe0f  db.template.json não encontrado — criando db.json vazio')
  fs.writeFileSync(dbPath, JSON.stringify({
    config: { mode: 'closed', allowedAdminDomain: null, setupCompleted: false },
    users: [], conferences: [], sections: [], products: [], orders: [],
  }, null, 2))
}

console.log('\ud83d\ude80 Servidor dev iniciando do zero...')
