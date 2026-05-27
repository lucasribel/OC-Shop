/**
 * Cloudflare Pages Function — CRUD completo via Google Sheets API
 */
async function getAccessToken(email, key) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = { iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }
  const jwt = await signJWT(header, claim, key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error('Token error: ' + (await res.text()))
  return (await res.json()).access_token
}

async function signJWT(header, claim, key) {
  const encoder = new TextEncoder()
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const input = encoder.encode(`${b64(header)}.${b64(claim)}`)
  const normalizedKey = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
  const pem = normalizedKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binary = Uint8Array.from([...atob(pem)].map(c => c.charCodeAt(0)))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binary, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, input)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64(header)}.${b64(claim)}.${sigB64}`
}

function parseRows(values, jsonFields = []) {
  if (!values || values.length < 2) return []
  const headers = values[0]
  return values.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    jsonFields.forEach(f => { try { obj[f] = JSON.parse(obj[f] || '[]') } catch { obj[f] = [] } })
    if ('price' in obj) obj.price = Number(obj.price) || 0
    if ('stock' in obj) obj.stock = Number(obj.stock) || 0
    if ('total' in obj) obj.total = Number(obj.total) || 0
    if ('active' in obj) obj.active = obj.active === 'true'
    if ('setupCompleted' in obj) obj.setupCompleted = obj.setupCompleted === 'true'
    return obj
  })
}

function rowToArray(headers, data) {
  return headers.map(h => {
    const v = data[h]
    if (v === undefined || v === null) return ''
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  })
}

function uuid() { return crypto.randomUUID() }

const SHEETS = { conferences: 'Conferences', products: 'Products', orders: 'Orders', users: 'Users', config: 'Config' }

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/', '')
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } })
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  try {
    const SID = env.SPREADSHEET_ID
    const token = await getAccessToken(env.GOOGLE_SERVICE_EMAIL, env.GOOGLE_PRIVATE_KEY)

    async function read(sheet) {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/${encodeURIComponent(sheet)}!A:Z`, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return { values: [] }
      return r.json()
    }

    async function append(sheet, data) {
      const headers = Object.keys(data)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/${encodeURIComponent(sheet)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowToArray(headers, data)] })
      })
    }

    async function updateRows(sheet, rowIndex, data) {
      const headers = Object.keys(data)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/${encodeURIComponent(sheet)}!A${rowIndex + 2}?valueInputOption=RAW`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowToArray(headers, data)] })
      })
    }

    async function deleteRow(sheet, rowIndex) {
      const meta = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}`, { headers: { Authorization: `Bearer ${token}` } })
      const m = await meta.json()
      const sh = m.sheets.find(s => s.properties.title === sheet)
      if (!sh) return
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}:batchUpdate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sh.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }] })
      })
    }

    // ─── Health ─────────────────────
    if (path === 'health') return new Response(JSON.stringify({ status: 'ok' }), { headers: cors })

    // ─── Conferences ────────────────
    if (path === 'conferences' && method === 'GET') {
      const data = await read(SHEETS.conferences)
      return new Response(JSON.stringify(parseRows(data.values, ['collaboratorIds'])), { headers: cors })
    }
    if (path === 'conferences' && method === 'POST') {
      const body = await request.json()
      const record = { ...body, id: body.id || uuid() }
      await append(SHEETS.conferences, record)
      return new Response(JSON.stringify(record), { status: 201, headers: cors })
    }
    if (path.match(/^conferences\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await read(SHEETS.conferences)
      const rows = parseRows(data.values, ['collaboratorIds'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRows(SHEETS.conferences, idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.startsWith('conferences/slug/') && method === 'GET') {
      const slug = path.split('/').pop()
      const data = await read(SHEETS.conferences)
      const items = parseRows(data.values, ['collaboratorIds'])
      return new Response(JSON.stringify(items.find(c => c.slug === slug) || null), { headers: cors })
    }

    // ─── Products ───────────────────
    if (path === 'products' && method === 'GET') {
      const cid = url.searchParams.get('conferenceId')
      const data = await read(SHEETS.products)
      let items = parseRows(data.values, ['variants'])
      if (cid) items = items.filter(p => p.conferenceId === cid)
      return new Response(JSON.stringify(items), { headers: cors })
    }
    if (path === 'products' && method === 'POST') {
      const body = await request.json()
      const record = { ...body, id: body.id || uuid(), active: true }
      await append(SHEETS.products, record)
      return new Response(JSON.stringify(record), { status: 201, headers: cors })
    }
    if (path.match(/^products\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await read(SHEETS.products)
      const rows = parseRows(data.values, ['variants'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRows(SHEETS.products, idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.match(/^products\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[1]
      const data = await read(SHEETS.products)
      const rows = parseRows(data.values, ['variants'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      await deleteRow(SHEETS.products, idx)
      return new Response(null, { status: 204, headers: cors })
    }

    // ─── Orders ─────────────────────
    if (path === 'orders' && method === 'GET') {
      const cid = url.searchParams.get('conferenceId')
      const data = await read(SHEETS.orders)
      let items = parseRows(data.values, ['items'])
      if (cid) items = items.filter(o => o.conferenceId === cid)
      return new Response(JSON.stringify(items), { headers: cors })
    }
    if (path === 'orders' && method === 'POST') {
      const body = await request.json()
      const record = { ...body, id: body.id || uuid(), createdAt: body.createdAt || new Date().toISOString(), status: body.status || 'pending' }
      await append(SHEETS.orders, record)
      return new Response(JSON.stringify(record), { status: 201, headers: cors })
    }
    if (path.match(/^orders\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await read(SHEETS.orders)
      const rows = parseRows(data.values, ['items'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRows(SHEETS.orders, idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.match(/^orders\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[1]
      const data = await read(SHEETS.orders)
      const rows = parseRows(data.values, ['items'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      await deleteRow(SHEETS.orders, idx)
      return new Response(null, { status: 204, headers: cors })
    }
    if (path.startsWith('orders/buyer') && method === 'GET') {
      const email = url.searchParams.get('email')
      const data = await read(SHEETS.orders)
      let items = parseRows(data.values, ['items'])
      if (email) items = items.filter(o => o.buyerEmail === email)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    // ─── Users ──────────────────────
    if (path === 'users' && method === 'GET') {
      const data = await read(SHEETS.users)
      return new Response(JSON.stringify(parseRows(data.values, ['conferenceIds'])), { headers: cors })
    }
    if (path === 'users' && method === 'POST') {
      const body = await request.json()
      const record = { ...body, id: body.id || uuid() }
      await append(SHEETS.users, record)
      return new Response(JSON.stringify(record), { status: 201, headers: cors })
    }
    if (path.match(/^users\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await read(SHEETS.users)
      const rows = parseRows(data.values, ['conferenceIds'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRows(SHEETS.users, idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.startsWith('users/email/') && method === 'GET') {
      const em = decodeURIComponent(path.replace('users/email/', ''))
      const data = await read(SHEETS.users)
      const items = parseRows(data.values, ['conferenceIds'])
      return new Response(JSON.stringify(items.find(u => u.email === em) || null), { headers: cors })
    }

    // ─── Config ─────────────────────
    if (path === 'config' && method === 'GET') {
      const data = await read(SHEETS.config)
      const items = parseRows(data.values, [])
      return new Response(JSON.stringify(items[0] || { mode: 'closed', allowedAdminDomain: null, setupCompleted: false }), { headers: cors })
    }
    if (path === 'config' && method === 'PUT') {
      const body = await request.json()
      const data = await read(SHEETS.config)
      const rows = parseRows(data.values, [])
      if (rows.length) await updateRows(SHEETS.config, 0, body)
      else await append(SHEETS.config, body)
      return new Response(JSON.stringify(body), { headers: cors })
    }

    return new Response(JSON.stringify({ error: `Route not found: ${method} /api/${path}` }), { status: 404, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
}
