/**
 * Cloudflare Pages Function — API proxy para Google Sheets
 * Rota: functions/api/[[route]].js
 * 
 * Secrets no Cloudflare:
 *   GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY, SPREADSHEET_ID
 */

async function getAccessToken(email, key) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = { iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }
  const jwt = await signJWT(header, claim, key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) throw new Error('Token error: ' + (await res.text()))
  return (await res.json()).access_token
}

async function signJWT(header, claim, key) {
  const encoder = new TextEncoder()
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const input = encoder.encode(`${b64(header)}.${b64(claim)}`)
  const pem = key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
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

    // ─── Health ─────────────────────────────
    if (path === 'health') {
      return new Response(JSON.stringify({ status: 'ok' }), { headers: cors })
    }

    // ─── Conferences ────────────────────────
    if (path === 'conferences' && method === 'GET') {
      const q = url.searchParams.get('conferenceId')
      const data = await read('Conferences')
      let items = parseRows(data.values, ['collaboratorIds'])
      if (q) items = items.filter(c => c.id === q || c.conferenceId === q)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    if (path.startsWith('conferences/slug/') && method === 'GET') {
      const slug = path.split('/').pop()
      const data = await read('Conferences')
      const items = parseRows(data.values, ['collaboratorIds'])
      const found = items.find(c => c.slug === slug) || null
      if (!found) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors })
      return new Response(JSON.stringify(found), { headers: cors })
    }

    // ─── Products ───────────────────────────
    if (path === 'products' && method === 'GET') {
      const q = url.searchParams.get('conferenceId')
      const data = await read('Products')
      let items = parseRows(data.values, ['variants'])
      if (q) items = items.filter(p => p.conferenceId === q)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    // ─── Orders ─────────────────────────────
    if (path === 'orders' && method === 'GET') {
      const cid = url.searchParams.get('conferenceId')
      const data = await read('Orders')
      let items = parseRows(data.values, ['items'])
      if (cid) items = items.filter(o => o.conferenceId === cid)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    if (path.startsWith('orders/buyer') && method === 'GET') {
      const email = url.searchParams.get('email')
      const data = await read('Orders')
      let items = parseRows(data.values, ['items'])
      if (email) items = items.filter(o => o.buyerEmail === email)
      return new Response(JSON.stringify(items), { headers: cors })
    }

    // ─── Users ──────────────────────────────
    if (path === 'users' && method === 'GET') {
      const data = await read('Users')
      return new Response(JSON.stringify(parseRows(data.values, ['conferenceIds'])), { headers: cors })
    }

    if (path.startsWith('users/email/') && method === 'GET') {
      const em = path.replace('users/email/', '')
      const data = await read('Users')
      const items = parseRows(data.values, ['conferenceIds'])
      return new Response(JSON.stringify(items.find(u => u.email === em) || null), { headers: cors })
    }

    // ─── Config ─────────────────────────────
    if (path === 'config' && method === 'GET') {
      const data = await read('Config')
      const items = parseRows(data.values, [])
      return new Response(JSON.stringify(items[0] || { mode: 'closed', allowedAdminDomain: null, setupCompleted: false }), { headers: cors })
    }

    // ─── Fallback ───────────────────────────
    return new Response(JSON.stringify({ error: `Route not found: ${method} /api/${path}` }), { status: 404, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors })
  }
}
