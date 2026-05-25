const fs = require('fs')
const path = require('path')
const router = require('express').Router()

const BACKEND_ENV = path.join(__dirname, '../../.env')
const FRONTEND_ENV = path.join(__dirname, '../../../.env')

// POST /api/setup/save-env
router.post('/save-env', (req, res) => {
  try {
    const {
      googleSheetsClientEmail,
      googleSheetsPrivateKey,
      spreadsheetId,
      oauthClientId,
      driveFolderId,
    } = req.body

    // Atualiza .env do backend (Sheets, Drive credentials)
    const setInFile = (filePath, key, value) => {
      if (!value) return
      let content = ''
      try { content = fs.readFileSync(filePath, 'utf8') } catch {}
      const regex = new RegExp(`^${key}=.*$`, 'm')
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value.includes('"') ? value : value}`)
      } else {
        content += `\n${key}=${value.includes('"') ? value : value}`
      }
      fs.writeFileSync(filePath, content.trim() + '\n')
    }

    // Backend: Google Sheets + Drive
    setInFile(BACKEND_ENV, 'GOOGLE_SHEETS_CLIENT_EMAIL', googleSheetsClientEmail)
    setInFile(BACKEND_ENV, 'GOOGLE_SHEETS_PRIVATE_KEY', googleSheetsPrivateKey)
    setInFile(BACKEND_ENV, 'SPREADSHEET_ID', spreadsheetId)
    setInFile(BACKEND_ENV, 'DRIVE_FOLDER_ID', driveFolderId)

    // Frontend: OAuth Client ID (VITE_ prefix obrigatório para o Vite ler)
    setInFile(FRONTEND_ENV, 'VITE_API_URL', 'http://localhost:3001')
    setInFile(FRONTEND_ENV, 'VITE_OAUTH_CLIENT_ID', oauthClientId)

    res.json({
      status: 'ok',
      message: '✅ Credenciais salvas! Reinicie o backend e o frontend.',
      instructions: [
        '1. Pressione Ctrl+C nos dois terminais',
        '2. Rode novamente: cd backend && npm run dev',
        '3. Em outro terminal: npm run dev',
        '4. Acesse http://localhost:5173 — o login Google estará ativo',
      ]
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar: ' + err.message })
  }
})

// GET /api/setup/current-env
router.get('/current-env', (_req, res) => {
  const config = {}
  const vars = {
    GOOGLE_SHEETS_CLIENT_EMAIL: BACKEND_ENV,
    SPREADSHEET_ID: BACKEND_ENV,
    DRIVE_FOLDER_ID: BACKEND_ENV,
    VITE_OAUTH_CLIENT_ID: FRONTEND_ENV,
  }
  for (const [v, filePath] of Object.entries(vars)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        if (line.startsWith(`${v}=`)) {
          config[v] = line.slice(v.length + 1).replace(/"/g, '')
        }
      }
    } catch {}
  }
  res.json(config)
})

module.exports = router
