// scripts/setup.js
// Validação do ambiente de execução
const fs = require('fs')
const path = require('path')

console.log('\n\ud83d\udd0d OC-Shop — Relatório de Saúde do Sistema\n')
console.log('=' .repeat(60))

// 1. Variáveis de ambiente
console.log('\n\ud83d\udccb Ambiente:')
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  lines.forEach(line => {
    const [key] = line.split('=')
    console.log(`  ${key}: ${key.includes('KEY') ? '*** configurada' : 'configurada'}`)
  })
} else {
  console.log('  \u26a0\ufe0f  Arquivo .env não encontrado')
}

// 2. Frontend
console.log('\n\ud83c\udfa8 Frontend:')
const distPath = path.join(__dirname, '..', 'dist')
console.log(`  Build: ${fs.existsSync(distPath) ? '\u2705 dist/ presente' : '\u26a0\ufe0f  dist/ não encontrada (rode npm run build)'}`)

// 3. Backend
console.log('\n\ud83d\udd27 Backend:')
const backendPkg = path.join(__dirname, '..', 'backend', 'package.json')
if (fs.existsSync(backendPkg)) {
  console.log('  package.json: \u2705')
  const backendModules = path.join(__dirname, '..', 'backend', 'node_modules')
  console.log(`  Dependências: ${fs.existsSync(backendModules) ? '\u2705 node_modules/ instalado' : '\u26a0\ufe0f  npm install no backend pendente'}`)
} else {
  console.log('  \u274c backend/package.json não encontrado')
}

// 4. Conexão com backend
console.log('\n\ud83c\udf10 Conexão:')
const VITE_API_URL = process.env.VITE_API_URL
if (VITE_API_URL && VITE_API_URL !== 'mock') {
  console.log(`  VITE_API_URL: ${VITE_API_URL}`)
  console.log('  \u2139\ufe0f  Teste completo de conexão requer servidor rodando')
} else {
  console.log('  Modo: mock (dados locais)')
}

console.log('\n' + '='.repeat(60))
console.log('\ud83d\ude80 Setup concluído. Rode "npm run dev" para iniciar.\n')
