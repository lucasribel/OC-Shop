const fs = require('fs')
const path = require('path')
const router = require('express').Router()

const ENV_PATH = path.join(__dirname, '../../.env')

// POST /api/setup/save-env
// Recebe as credenciais do wizard e salva no .env do backend
router.post('/save-env', (req, res) => {
  try {
    const {
      googleSheetsClientEmail,
      googleSheetsPrivateKey,
      spreadsheetId,
      oauthClientId,
      driveFolderId,
    } = req.body

    // Lê o .env atual
    let envContent = ''
    try { envContent = fs.readFileSync(ENV_PATH, 'utf8') } catch {}

    const setOrUpdate = (key, value) => {
      if (!value) return
      const regex = new RegExp(`^${key}=.*$`, 'm')
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value.includes(' ') ? `"${value}"` : value}`)
      } else {
        envContent += `\n${key}=${value.includes(' ') ? `"${value}"` : value}`
      }
    }

    setOrUpdate('GOOGLE_SHEETS_CLIENT_EMAIL', googleSheetsClientEmail)
    setOrUpdate('GOOGLE_SHEETS_PRIVATE_KEY', googleSheetsPrivateKey)
    setOrUpdate('SPREADSHEET_ID', spreadsheetId)
    setOrUpdate('VITE_OAUTH_CLIENT_ID', oauthClientId)
    setOrUpdate('DRIVE_FOLDER_ID', driveFolderId)

    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n')

    res.json({ status: 'ok', message: 'Configurações salvas no .env' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configurações: ' + err.message })
  }
})

// GET /api/setup/current-env
router.get('/current-env', (_req, res) => {
  const config = {}
  const vars = ['GOOGLE_SHEETS_CLIENT_EMAIL', 'SPREADSHEET_ID', 'VITE_OAUTH_CLIENT_ID', 'DRIVE_FOLDER_ID']
  try {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8')
    for (const line of envContent.split('\n')) {
      for (const v of vars) {
        if (line.startsWith(`${v}=`)) {
          config[v] = line.slice(v.length + 1).replace(/"/g, '')
        }
      }
    }
  } catch {}
  res.json(config)
})

module.exports = router
