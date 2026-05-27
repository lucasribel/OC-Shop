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

const SHEET_HEADERS = {
  Conferences: ['id','name','slug','aiesec','active','status','startDate','endDate','orderDeadline','ownerId','collaboratorIds'],
  Products:    ['id','conferenceId','name','description','price','stock','image','imageUrl','active','variants'],
  Orders:      ['id','conferenceId','conferenceSlug','userId','userName','buyerName','buyerEmail','buyerPhone','items','total','status','createdAt'],
  Users:       ['id','email','name','picture','role','aiesec','googleId','conferenceIds'],
  Config:      ['mode','allowedAdminDomain','setupCompleted'],
}

const SHEET_MAP = { conferences: 'Conferences', products: 'Products', orders: 'Orders', users: 'Users', config: 'Config' }

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

    async function sheetCall(sheet, method, range, body) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/${encodeURIComponent(sheet)}!${range}`
      const opts = { method, headers: { Authorization: `Bearer ${token}` } }
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
      const r = await fetch(url, opts)
      if (!r.ok) throw new Error(`Sheets API ${method} ${range}: ${r.status}`)
      if (r.status === 204) return null
      return r.json()
    }

    async function readSheet(sheet) {
      try { return await sheetCall(sheet, 'GET', 'A:Z') }
      catch { return { values: [] } }
    }

    async function appendRow(sheet, data) {
      const headers = SHEET_HEADERS[sheet] || Object.keys(data)
      const values = headers.map(h => data[h] !== undefined ? String(data[h]) : '')
      await sheetCall(sheet, 'POST', 'A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { values: [values] })
    }

    async function updateRow(sheet, rowIndex, data) {
      const headers = SHEET_HEADERS[sheet] || Object.keys(data)
      const values = headers.map(h => data[h] !== undefined ? String(data[h]) : '')
      await sheetCall(sheet, 'PUT', `A${rowIndex + 2}?valueInputOption=RAW`, { values: [values] })
    }

    async function deleteSheetRow(sheet, rowIndex) {
      const meta = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}`, { headers: { Authorization: `Bearer ${token}` } })
      const m = await meta.json()
      const sh = m.sheets.find(s => s.properties.title === sheet)
      if (!sh) return
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SID}:batchUpdate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: sh.properties.sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 } } }] })
      })
    }

    function uuid() { return crypto.randomUUID() }

    // ─── Health ─────────────────────
    if (path === 'health') return new Response(JSON.stringify({ status: 'ok' }), { headers: cors })

    // ─── Conferences ────────────────
    if (path === 'conferences' && method === 'GET') {
      const data = await readSheet('Conferences')
      return new Response(JSON.stringify(parseRows(data.values, ['collaboratorIds'])), { headers: cors })
    }
    if (path === 'conferences' && method === 'POST') {
      const body = await request.json()
      body.id = body.id || uuid()
      await appendRow('Conferences', body)
      return new Response(JSON.stringify(body), { status: 201, headers: cors })
    }
    if (path.match(/^conferences\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await readSheet('Conferences')
      const rows = parseRows(data.values, ['collaboratorIds'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRow('Conferences', idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.startsWith('conferences/slug/') && method === 'GET') {
      const slug = path.split('/').pop()
      const data = await readSheet('Conferences')
      const items = parseRows(data.values, ['collaboratorIds'])
      return new Response(JSON.stringify(items.find(c => c.slug === slug) || null), { headers: cors })
    }

    // ─── Products ───────────────────
    if (path === 'products' && method === 'GET') {
      const cid = url.searchParams.get('conferenceId')
      const data = await readSheet('Products')
      let items = parseRows(data.values, ['variants'])
      if (cid) items = items.filter(p => p.conferenceId === cid)
      return new Response(JSON.stringify(items), { headers: cors })
    }
    if (path === 'products' && method === 'POST') {
      const body = await request.json()
      body.id = body.id || uuid()
      await appendRow('Products', body)
      return new Response(JSON.stringify(body), { status: 201, headers: cors })
    }
    if (path.match(/^products\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await readSheet('Products')
      const rows = parseRows(data.values, ['variants'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRow('Products', idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.match(/^products\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[1]
      const data = await readSheet('Products')
      const rows = parseRows(data.values, ['variants'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      await deleteSheetRow('Products', idx)
      return new Response(null, { status: 204, headers: cors })
    }

    // ─── Orders ─────────────────────
    if (path === 'orders' && method === 'GET') {
      const cid = url.searchParams.get('conferenceId')
      const data = await readSheet('Orders')
      let items = parseRows(data.values, ['items'])
      if (cid) items = items.filter(o => o.conferenceId === cid)
      return new Response(JSON.stringify(items), { headers: cors })
    }
    if (path === 'orders' && method === 'POST') {
      const body = await request.json()
      body.id = body.id || uuid()
      body.createdAt = body.createdAt || new Date().toISOString()
      body.status = body.status || 'pending'
      await appendRow('Orders', body)
      return new Response(JSON.stringify(body), { status: 201, headers: cors })
    }
    if (path.match(/^orders\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await readSheet('Orders')
      const rows = parseRows(data.values, ['items'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRow('Orders', idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.match(/^orders\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[1]
      const data = await readSheet('Orders')
      const rows = parseRows(data.values, ['items'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      await deleteSheetRow('Orders', idx)
      return new Response(null, { status: 204, headers: cors })
    }
    if (path.startsWith('orders/buyer') && method === 'GET') {
      const email = url.searchParams.get('email')
      const data = await readSheet('Orders')
      let items = parseRows(data.values, ['items'])
      if (email) items = items.filter(o => o.buyerEmail === email)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    // ─── Users ──────────────────────
    if (path === 'users' && method === 'GET') {
      const data = await readSheet('Users')
      return new Response(JSON.stringify(parseRows(data.values, ['conferenceIds'])), { headers: cors })
    }
    if (path === 'users' && method === 'POST') {
      const body = await request.json()
      body.id = body.id || uuid()
      await appendRow('Users', body)
      return new Response(JSON.stringify(body), { status: 201, headers: cors })
    }
    if (path.match(/^users\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[1]
      const body = await request.json()
      const data = await readSheet('Users')
      const rows = parseRows(data.values, ['conferenceIds'])
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      const updated = { ...rows[idx], ...body }
      await updateRow('Users', idx, updated)
      return new Response(JSON.stringify(updated), { headers: cors })
    }
    if (path.startsWith('users/email/') && method === 'GET') {
      const em = decodeURIComponent(path.replace('users/email/', ''))
      const data = await readSheet('Users')
      const items = parseRows(data.values, ['conferenceIds'])
      return new Response(JSON.stringify(items.find(u => u.email === em) || null), { headers: cors })
    }

    // ─── Config ─────────────────────
    if (path === 'config' && method === 'GET') {
      const data = await readSheet('Config')
      const items = parseRows(data.values, [])
      return new Response(JSON.stringify(items[0] || { mode: 'closed', allowedAdminDomain: null, setupCompleted: false }), { headers: cors })
    }
    if (path === 'config' && method === 'PUT') {
      const body = await request.json()
      const data = await readSheet('Config')
      const rows = parseRows(data.values, [])
      if (rows.length) await updateRow('Config', 0, body)
      else await appendRow('Config', body)
      return new Response(JSON.stringify(body), { headers: cors })
    }

    return new Response(JSON.stringify({ error: `Route not found: ${method} /api/${path}` }), { status: 404, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
}
