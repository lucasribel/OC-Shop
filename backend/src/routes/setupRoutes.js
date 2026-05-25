const fs = require('fs')
const path = require('path')
const router = require('express').Router()

const BACKEND_ENV = path.join(__dirname, '../../.env')
const FRONTEND_ENV = path.join(__dirname, '../../../.env')

// Normaliza chave privada: aceita JSON copy-paste com \n literal
function normalizeKey(key) {
  if (!key) return ''
  let clean = key.replace(/^"/, '').replace(/"$/, '')  // remove aspas extras
  clean = clean.replace(/\\n/g, '\n')                    // \n literal → quebra real
  clean = clean.replace(/\r\n/g, '\n')                   // Windows line endings
  return clean
}

// Helper: salva uma variável no arquivo .env
function setInFile(filePath, key, value) {
  if (!value) return
  let content = ''
  try { content = fs.readFileSync(filePath, 'utf8') } catch {}
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const line = value.includes('\n') ? `${key}="${value.replace(/\n/g, '\\n')}"` : `${key}=${value}`
  if (regex.test(content)) {
    content = content.replace(regex, line)
  } else {
    content += '\n' + line
  }
  fs.writeFileSync(filePath, content.trim() + '\n')
}

// POST /api/setup/save-env
router.post('/save-env', (req, res) => {
  try {
    const { googleSheetsClientEmail, googleSheetsPrivateKey, spreadsheetId, oauthClientId, driveFolderId } = req.body

    // Normaliza a chave privada antes de salvar
    const normalizedKey = normalizeKey(googleSheetsPrivateKey)

    // Backend .env
    setInFile(BACKEND_ENV, 'GOOGLE_SHEETS_CLIENT_EMAIL', googleSheetsClientEmail)
    setInFile(BACKEND_ENV, 'GOOGLE_SHEETS_PRIVATE_KEY', normalizedKey)
    setInFile(BACKEND_ENV, 'SPREADSHEET_ID', spreadsheetId)
    setInFile(BACKEND_ENV, 'DRIVE_FOLDER_ID', driveFolderId)

    // Frontend .env (OAuth Client ID)
    setInFile(FRONTEND_ENV, 'VITE_API_URL', 'http://localhost:3001')
    setInFile(FRONTEND_ENV, 'VITE_OAUTH_CLIENT_ID', oauthClientId)

    res.json({
      status: 'ok',
      message: '✅ Credenciais salvas! Reinicie backend e frontend (Ctrl+C e rode de novo).',
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar: ' + err.message })
  }
})

// GET /api/setup/current-env
router.get('/current-env', (_req, res) => {
  const config = {}
  const vars = { GOOGLE_SHEETS_CLIENT_EMAIL: BACKEND_ENV, SPREADSHEET_ID: BACKEND_ENV, DRIVE_FOLDER_ID: BACKEND_ENV, VITE_OAUTH_CLIENT_ID: FRONTEND_ENV }
  for (const [v, filePath] of Object.entries(vars)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        if (line.startsWith(`${v}=`)) config[v] = line.slice(v.length + 1).replace(/"/g, '')
      }
    } catch {}
  }
  res.json(config)
})

module.exports = router
