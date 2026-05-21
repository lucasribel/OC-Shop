require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })
const ID = process.env.SPREADSHEET_ID

// ---------------------------------------------------------------------------
// Estrutura das abas
// ---------------------------------------------------------------------------

const TABS = {
  Config:      ['mode', 'allowedAdminDomain', 'setupCompleted'],
  Users:       ['id', 'email', 'name', 'picture', 'role', 'aiesec', 'googleId', 'conferenceIds'],
  Conferences: ['id', 'name', 'slug', 'aiesec', 'active', 'status', 'startDate', 'endDate', 'orderDeadline', 'ownerId', 'collaboratorIds'],
  Products:    ['id', 'conferenceId', 'name', 'description', 'price', 'stock', 'image', 'imageUrl', 'active', 'variants'],
  Orders:      ['id', 'conferenceId', 'conferenceSlug', 'userId', 'userName', 'buyerName', 'buyerEmail', 'buyerPhone', 'items', 'total', 'status', 'createdAt'],
}

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

const SEED = {
  Config: [
    ['open', 'aiesec.net', 'true'],
  ],
  Users: [
    ['u1', 'super@aiesec.net',       'Super Admin',       '', 'super_admin',  'AIESEC Brasil',    '', '[]'],
    ['u2', 'admin@aiesec.net',        'Admin AIESEC SP',   '', 'admin',        'AIESEC São Paulo', '', '["conf1"]'],
    ['u3', 'ana@aiesec.net',          'Ana Colaboradora',  '', 'collaborator', 'AIESEC SP',        '', '["conf1"]'],
    ['u4', 'maria.silva@gmail.com',   'Maria Silva',       '', 'user',         '',                 '', '[]'],
  ],
  Conferences: [
    ['conf1', 'Conferência 2026.1',   'conferencia-2026-1',   'AIESEC Brasil', 'true',  'open',   '2026-06-01', '2026-06-05', '2026-05-20', 'u1', '["u2","u3"]'],
    ['conf2', 'Summit Nacional 2025', 'summit-nacional-2025', 'AIESEC Brasil', 'false', 'closed', '2025-11-10', '2025-11-14', '2025-11-01', 'u1', '[]'],
  ],
  Products: [
    ['p1', 'conf1', 'Kit Delegado',           'Camiseta, crachá e materiais', '89.9',  '50',  'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'true', '[]'],
    ['p2', 'conf1', 'Hoodie Oficial',          'Moletom oficial da conferência','149.9', '30',  'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'true', '[{"label":"Tamanho","options":["P","M","G","GG"]}]'],
    ['p3', 'conf1', 'Caneca Personalizada',    'Caneca exclusiva',             '39.9',  '100', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'true', '[]'],
    ['p4', 'conf1', 'E-book Guia do Delegado', 'PDF completo gratuito',        '0',     '999', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'https://lh3.googleusercontent.com/d/19bnzu7l1v7yCUewjp4Bqf9aWPV7f7qqI', 'true', '[]'],
  ],
  Orders: [
    ['o1', 'conf1', 'conferencia-2026-1', 'u4', 'Maria Silva', 'Maria Silva', 'maria.silva@gmail.com', '', '[{"productId":"p1","productName":"Kit Delegado","quantity":1,"unitPrice":89.9,"selectedVariants":{}}]', '89.9', 'confirmed', '2026-05-01T10:00:00.000Z'],
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getExistingSheets() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: ID })
  return res.data.sheets.map(s => s.properties.title)
}

async function createSheet(title) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
  console.log(`  Aba criada: ${title}`)
}

async function writeRows(tab, rows) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: ID,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Conectando ao Google Sheets...')
  const existing = await getExistingSheets()
  console.log('Abas existentes:', existing.join(', ') || '(nenhuma)')

  for (const [tab, headers] of Object.entries(TABS)) {
    if (!existing.includes(tab)) {
      await createSheet(tab)
    } else {
      console.log(`  Aba já existe: ${tab}`)
    }

    const data = SEED[tab] ?? []
    await writeRows(tab, [headers, ...data])
    console.log(`  Dados gravados em "${tab}": ${data.length} registro(s)`)
  }

  console.log('\nSetup concluído! Teste em: localhost:3001/api/conferences')
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
