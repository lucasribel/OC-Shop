const { randomUUID } = require('crypto')
const { sheets, SPREADSHEET_ID } = require('../config/googleSheets')
const { loadDB } = require('./mockData')

const SHEETS_ENABLED = !!(SPREADSHEET_ID && process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY)

// Mock data singleton
const mock = { _db: null }
function getMock() {
  if (!mock._db) mock._db = loadDB()
  return mock._db
}

const SHEET_NAMES = { conferences: 'Conferences', products: 'Products', orders: 'Orders', users: 'Users', config: 'Config' }

const HEADERS = {
  conferences: ['id', 'name', 'slug', 'aiesec', 'active', 'status', 'startDate', 'endDate', 'orderDeadline', 'ownerId', 'collaboratorIds'],
  products: ['id', 'conferenceId', 'name', 'description', 'price', 'stock', 'image', 'imageUrl', 'active', 'variants'],
  orders: ['id', 'conferenceId', 'conferenceSlug', 'userId', 'userName', 'buyerName', 'buyerEmail', 'buyerPhone', 'items', 'total', 'status', 'createdAt'],
  users: ['id', 'email', 'name', 'picture', 'role', 'aiesec', 'googleId', 'conferenceIds'],
  config: ['mode', 'allowedAdminDomain', 'setupCompleted'],
}

// ─── Read ─────────────────────────────────

async function readRows(sheetName) {
  if (!SHEETS_ENABLED) {
    const keyMap = { Conferences: 'conferences', Products: 'products', Orders: 'orders', Users: 'users', Config: 'config' }
    const key = keyMap[sheetName]
    if (!key) return []
    const items = getMock()[key] || []
    if (!Array.isArray(items)) return [[], ['config_field'], [{ ...items }]]
    if (items.length === 0) return []
    const h = Object.keys(items[0])
    return items.map(item => {
      const row = {}
      h.forEach(field => { row[field] = String(item[field] ?? '') })
      return row
    })
  }
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A:Z` })
  const rows = res.data.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
}

// ─── Helpers ──────────────────────────────

function parseRow(row, jsonFields = []) {
  const parsed = { ...row }
  for (const field of jsonFields) {
    if (parsed[field]) { try { parsed[field] = JSON.parse(parsed[field]) } catch { parsed[field] = [] } }
    else { parsed[field] = [] }
  }
  if ('active' in parsed) parsed.active = parsed.active === 'true' || parsed.active === true
  if ('setupCompleted' in parsed) parsed.setupCompleted = parsed.setupCompleted === 'true' || parsed.setupCompleted === true
  if ('price' in parsed) parsed.price = Number(parsed.price)
  if ('stock' in parsed) parsed.stock = Number(parsed.stock)
  if ('total' in parsed) parsed.total = Number(parsed.total)
  return parsed
}

function rowToArray(headers, data) {
  return headers.map(h => { const val = data[h]; if (val === undefined || val === null) return ''; if (typeof val === 'object') return JSON.stringify(val); return String(val) })
}

// ─── Write ────────────────────────────────

async function appendRow(sheetName, headers, data) {
  if (!SHEETS_ENABLED) {
    const keyMap = { Conferences: 'conferences', Products: 'products', Orders: 'orders', Users: 'users', Config: 'config' }
    const key = keyMap[sheetName]
    if (key) getMock()[key].push({ ...data, id: data.id || randomUUID() })
    return
  }
  await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A1`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [rowToArray(headers, data)] } })
}

async function updateRow(sheetName, rowIndex, headers, data) {
  if (!SHEETS_ENABLED) {
    const keyMap = { Conferences: 'conferences', Products: 'products', Orders: 'orders', Users: 'users' }
    const key = keyMap[sheetName]
    if (key && getMock()[key] && getMock()[key][rowIndex]) Object.assign(getMock()[key][rowIndex], data)
    return
  }
  await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A${rowIndex + 2}`, valueInputOption: 'RAW', requestBody: { values: [rowToArray(headers, data)] } })
}

async function deleteRow(sheetName, rowIndex) {
  if (!SHEETS_ENABLED) {
    const keyMap = { Conferences: 'conferences', Products: 'products', Orders: 'orders', Users: 'users' }
    const key = keyMap[sheetName]
    if (key && getMock()[key]) getMock()[key].splice(rowIndex, 1)
    return
  }
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName)
  if (!sheet) throw new Error(`Aba "${sheetName}" não encontrada`)
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }] } })
}

function notFound(entity, id) { const err = new Error(`${entity} não encontrado(a)`); err.status = 404; return err }

// ─── Conferences ──────────────────────────

const conferences = {
  async findAll() { const rows = await readRows(SHEET_NAMES.conferences); return rows.filter(r => r.id).map(r => parseRow(r, ['collaboratorIds'])) },
  async findById(id) { return (await conferences.findAll()).find(c => c.id === id) || null },
  async findBySlug(slug) { return (await conferences.findAll()).find(c => c.slug === slug) || null },
  async findByOwner(ownerId) { return (await conferences.findAll()).filter(c => c.ownerId === ownerId) },
  async findByCollaborator(userId) { return (await conferences.findAll()).filter(c => Array.isArray(c.collaboratorIds) && c.collaboratorIds.includes(userId)) },
  async create(data) { const record = { ...data, id: randomUUID() }; await appendRow(SHEET_NAMES.conferences, HEADERS.conferences, record); return record },
  async update(id, data) { const rows = await readRows(SHEET_NAMES.conferences); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Conferência', id); const updated = { ...parseRow(rows[idx], ['collaboratorIds']), ...data }; await updateRow(SHEET_NAMES.conferences, idx, HEADERS.conferences, updated); return updated },
}

// ─── Products ─────────────────────────────

const products = {
  async findAll() { const rows = await readRows(SHEET_NAMES.products); return rows.filter(r => r.id).map(r => parseRow(r, ['variants'])) },
  async findByConference(conferenceId) { return (await products.findAll()).filter(p => p.conferenceId === conferenceId) },
  async findById(id) { return (await products.findAll()).find(p => p.id === id) || null },
  async create(data) { const record = { ...data, id: randomUUID(), active: data.active !== false }; await appendRow(SHEET_NAMES.products, HEADERS.products, record); return record },
  async update(id, data) { const rows = await readRows(SHEET_NAMES.products); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Produto', id); const updated = { ...parseRow(rows[idx], ['variants']), ...data }; await updateRow(SHEET_NAMES.products, idx, HEADERS.products, updated); return updated },
  async delete(id) { const rows = await readRows(SHEET_NAMES.products); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Produto', id); await deleteRow(SHEET_NAMES.products, idx) },
}

// ─── Orders ───────────────────────────────

const orders = {
  async findAll() { const rows = await readRows(SHEET_NAMES.orders); return rows.filter(r => r.id).map(r => parseRow(r, ['items'])) },
  async findByConference(conferenceId) { return (await orders.findAll()).filter(o => o.conferenceId === conferenceId) },
  async findByUserId(userId) { return (await orders.findAll()).filter(o => o.userId === userId) },
  async findByBuyer(email, phone) { return (await orders.findAll()).filter(o => o.buyerEmail === email || (phone && o.buyerPhone === phone)) },
  async findActiveByBuyerAndConference(email, conferenceId) { return (await orders.findAll()).find(o => o.buyerEmail === email && o.conferenceId === conferenceId && o.status !== 'cancelled') || null },
  async findById(id) { return (await orders.findAll()).find(o => o.id === id) || null },
  async create(data) { const record = { ...data, id: randomUUID(), createdAt: new Date().toISOString() }; await appendRow(SHEET_NAMES.orders, HEADERS.orders, record); return record },
  async updateStatus(id, status) { const rows = await readRows(SHEET_NAMES.orders); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Pedido', id); const updated = { ...parseRow(rows[idx], ['items']), status }; await updateRow(SHEET_NAMES.orders, idx, HEADERS.orders, updated); return updated },
  async update(id, data) { const rows = await readRows(SHEET_NAMES.orders); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Pedido', id); const updated = { ...parseRow(rows[idx], ['items']), ...data }; await updateRow(SHEET_NAMES.orders, idx, HEADERS.orders, updated); return updated },
  async delete(id) { const rows = await readRows(SHEET_NAMES.orders); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Pedido', id); await deleteRow(SHEET_NAMES.orders, idx) },
}

// ─── Users ────────────────────────────────

const users = {
  async findAll() { const rows = await readRows(SHEET_NAMES.users); return rows.filter(r => r.id).map(r => parseRow(r, ['conferenceIds'])) },
  async findById(id) { return (await users.findAll()).find(u => u.id === id) || null },
  async findByEmail(email) { return (await users.findAll()).find(u => u.email === email) || null },
  async create(data) { const record = { ...data, id: randomUUID() }; await appendRow(SHEET_NAMES.users, HEADERS.users, record); return record },
  async update(id, data) { const rows = await readRows(SHEET_NAMES.users); const idx = rows.findIndex(r => r.id === id); if (idx === -1) throw notFound('Usuário', id); const updated = { ...parseRow(rows[idx], ['conferenceIds']), ...data }; await updateRow(SHEET_NAMES.users, idx, HEADERS.users, updated); return updated },
}

// ─── Config ───────────────────────────────

const config = {
  async get() { const rows = await readRows(SHEET_NAMES.config); if (!rows.length) return { mode: 'closed', allowedAdminDomain: null, setupCompleted: false }; return parseRow(rows[0]) },
  async update(data) { const rows = await readRows(SHEET_NAMES.config); if (!rows.length) { await appendRow(SHEET_NAMES.config, HEADERS.config, data) } else { await updateRow(SHEET_NAMES.config, 0, HEADERS.config, data) }; return data },
}

module.exports = { conferences, products, orders, users, config }
