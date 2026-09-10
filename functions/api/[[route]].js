/**
 * OC-Shop API — Cloudflare Function
 * CRUD via Google Sheets + Drive folder management
 */

function b64(obj) { return btoa(JSON.stringify(obj)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }

async function accessToken(email, key) {
  const now = Math.floor(Date.now()/1000)
  const jwt = await signJWT(
    { alg:'RS256', typ:'JWT' },
    { iss:email, scope:'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file', aud:'https://oauth2.googleapis.com/token', exp:now+3600, iat:now },
    key
  )
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+jwt
  })
  if (!res.ok) throw new Error('Token error: '+(await res.text()))
  return (await res.json()).access_token
}

async function signJWT(header, claim, key) {
  const enc = new TextEncoder()
  const input = enc.encode(b64(header)+'.'+b64(claim))
  let pem = key
  if (!pem.includes('BEGIN')) {
    try { pem = atob(pem) } catch {}
  }
  pem = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').replace(/\\n/g, '')
  const bin = Uint8Array.from([...atob(pem)].map(c=>c.charCodeAt(0)))
  const ck = await crypto.subtle.importKey('pkcs8',bin,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',ck,input)
  const sigRaw = String.fromCharCode(...new Uint8Array(sig))
  const sigB64 = btoa(sigRaw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
  return b64(header)+'.'+b64(claim)+'.'+sigB64
}

function parseRows(values, jsonFields) {
  if (!values||values.length<2) return []
  const h = values[0]
  return values.slice(1).map(r=>{
    const o={}
    h.forEach((k,i)=>{o[k]=r[i]||''})
    ;(jsonFields||[]).forEach(f=>{try{o[f]=JSON.parse(o[f]||'[]')}catch{o[f]=[]}})
    if('price'in o)o.price=Number(o.price)||0
    if('stock'in o)o.stock=Number(o.stock)||0
    if('total'in o)o.total=Number(o.total)||0
    if('active'in o)o.active=o.active==='true'
    if('setupCompleted'in o)o.setupCompleted=o.setupCompleted==='true'
    if('allowOrderEditing'in o)o.allowOrderEditing=o.allowOrderEditing!=='false'
    if('orderEditDeadlineHours'in o)o.orderEditDeadlineHours=Number(o.orderEditDeadlineHours)||48
    return o
  })
}

const H = {
  Conferences:['id','name','slug','aiesec','active','status','startDate','endDate','orderDeadline','ownerId','collaboratorIds','allowOrderEditing','orderEditDeadlineHours','spreadsheetId'],
  Products:['id','conferenceId','name','description','price','stock','image','imageUrl','active','variants'],
  Orders:['id','conferenceId','conferenceSlug','userId','userName','buyerName','buyerEmail','buyerPhone','items','total','status','createdAt'],
  Users:['id','email','name','picture','role','aiesec','googleId','conferenceIds'],
  Config:['mode','allowedAdminDomain','setupCompleted'],
}

// ---------------------------------------------------------------------------
// Auth helpers — hash de senha (PBKDF2), sessão assinada (HMAC), cookies
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 60000
const SESSION_COOKIE = 'oc_admin_session'
const SESSION_TTL_SECONDS = 7 * 24 * 3600

function bytesToB64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function pbkdf2(password, salt, iterations, lenBytes) {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    lenBytes * 8
  )
  return new Uint8Array(bits)
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS, 32)
  return ['pbkdf2_sha256', String(PBKDF2_ITERATIONS), bytesToB64url(salt), bytesToB64url(derived)].join('$')
}

async function verifyPassword(password, stored) {
  if (!stored) return false
  const parts = String(stored).split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false
  const iterations = parseInt(parts[1], 10)
  if (!iterations || iterations < 1) return false
  const salt = b64urlToBytes(parts[2])
  const expected = b64urlToBytes(parts[3])
  const actual = await pbkdf2(password, salt, iterations, expected.length)
  // comparação em tempo constante
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

async function sessionKey(env) {
  const enc = new TextEncoder()
  const secret = env.GOOGLE_PRIVATE_KEY || env.GOOGLE_SERVICE_EMAIL || 'oc-shop-session'
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function signSession(env, payload) {
  const key = await sessionKey(env)
  const enc = new TextEncoder()
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return body + '.' + bytesToB64url(new Uint8Array(sig))
}

async function verifySession(env, token) {
  if (!token || token.indexOf('.') === -1) return null
  const dot = token.lastIndexOf('.')
  const body = token.slice(0, dot)
  const key = await sessionKey(env)
  const enc = new TextEncoder()
  const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(token.slice(dot + 1)), enc.encode(body))
  if (!ok) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

function getCookie(req, name) {
  const header = req.headers.get('Cookie') || ''
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}

export async function onRequest(ctx) {
  const {request:req,env}=ctx
  const u=new URL(req.url)
  const p=u.pathname.replace('/api/','')
  const m=req.method

  if(m==='OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}})
  const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}

  try{
    const masterSid=env.SPREADSHEET_ID
    const tok=await accessToken(env.GOOGLE_SERVICE_EMAIL,env.GOOGLE_PRIVATE_KEY)
    const authH={Authorization:'Bearer '+tok}
    const uid=()=>crypto.randomUUID()

    // ── Sheets helpers (sid parameterizado) ──
    async function sh(sid,method,sheet,range,body){
      const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid+'/values/'+encodeURIComponent(sheet)+'!'+range,
        {method,headers:body?{...authH,'Content-Type':'application/json'}:authH,body:body?JSON.stringify(body):undefined})
      if(!r.ok)throw new Error('Sheets '+method+' '+range+': '+r.status)
      return r.status===204?null:r.json()
    }
    async function read(sid,sheet){try{return await sh(sid,'GET',sheet,'A:Z')}catch{return{values:[]}}}
    function cellVal(v){return typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'')}
    async function append(sid,sheet,data){
      const hd=H[sheet]||Object.keys(data)
      await sh(sid,'POST',sheet,'A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{values:[hd.map(k=>cellVal(data[k]))]})
    }
    async function update(sid,sheet,idx,data){
      const hd=H[sheet]||Object.keys(data)
      await sh(sid,'PUT',sheet,'A'+(idx+2)+'?valueInputOption=RAW',{values:[hd.map(k=>cellVal(data[k]))]})
    }
    async function del(sid,sheet,idx){
      const meta=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid,{headers:authH})
      const mj=await meta.json()
      const shj=mj.sheets.find(s=>s.properties.title===sheet)
      if(!shj)return
      await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid+':batchUpdate',{
        method:'POST',headers:{...authH,'Content-Type':'application/json'},
        body:JSON.stringify({requests:[{deleteDimension:{range:{sheetId:shj.properties.sheetId,dimension:'ROWS',startIndex:idx+1,endIndex:idx+2}}}]})
      })
    }

    // ── Auth sheet (credenciais do admin, nunca expostas) ──
    async function getAuthConfig(sid){
      const d = await read(sid, 'Auth')
      const rows = parseRows(d.values, [])
      const r = rows[0] || {}
      return {
        adminAuthMode: r.adminAuthMode === 'password' ? 'password' : 'google',
        adminEmail: (r.adminEmail || '').trim().toLowerCase(),
        adminPasswordHash: r.adminPasswordHash || '',
      }
    }

    async function writeAuth(sid, cfg){
      await sh(sid, 'PUT', 'Auth', 'A1:C2', {
        values: [
          ['adminAuthMode', 'adminEmail', 'adminPasswordHash'],
          [cfg.adminAuthMode, cfg.adminEmail, cfg.adminPasswordHash],
        ],
      })
    }

    async function isAuthedAdmin(req, env, sid){
      const cfg = await getAuthConfig(sid)
      if (cfg.adminAuthMode !== 'password') return true // modo google: auth legada client-side
      const token = getCookie(req, SESSION_COOKIE)
      const s = await verifySession(env, token)
      return !!(s && s.role === 'admin')
    }

    // ── Resolve spreadsheet para conferência ──
    async function getConfSpreadsheetId(conferenceId){
      const d=await read(masterSid,'Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const conf=rows.find(r=>r.id===conferenceId)
      return conf?.spreadsheetId||masterSid
    }

    // ─── Health
    if(p==='health') return new Response(JSON.stringify({status:'ok'}),{headers:cors})

    // ─── Auth
    if(p==='auth/config' && m==='GET'){
      const cfg = await getAuthConfig(masterSid)
      return new Response(JSON.stringify({ adminAuthMode: cfg.adminAuthMode, adminEmail: cfg.adminEmail }), { headers: cors })
    }

    if(p==='auth/me' && m==='GET'){
      const cfg = await getAuthConfig(masterSid)
      if (cfg.adminAuthMode !== 'password') {
        return new Response(JSON.stringify({ authenticated: false, adminAuthMode: 'google' }), { headers: cors })
      }
      const token = getCookie(req, SESSION_COOKIE)
      const s = await verifySession(env, token)
      if (s && s.role === 'admin') {
        return new Response(JSON.stringify({ authenticated: true, email: s.sub, adminAuthMode: 'password' }), { headers: cors })
      }
      return new Response(JSON.stringify({ authenticated: false, adminAuthMode: 'password' }), { headers: cors })
    }

    if(p==='auth/login' && m==='POST'){
      const cfg = await getAuthConfig(masterSid)
      if (cfg.adminAuthMode !== 'password') {
        return new Response(JSON.stringify({ error: 'Login por senha não está ativo' }), { status: 403, headers: cors })
      }
      const b = await req.json()
      const email = String(b.email || '').trim().toLowerCase()
      const password = String(b.password || '')
      if (!email || !password || email !== cfg.adminEmail || !(await verifyPassword(password, cfg.adminPasswordHash))) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401, headers: cors })
      }
      const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
      const token = await signSession(env, { sub: email, role: 'admin', exp })
      const res = new Response(JSON.stringify({ email, role: 'admin' }), { headers: cors })
      res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`)
      return res
    }

    if(p==='auth/logout' && m==='POST'){
      const res = new Response(JSON.stringify({ ok: true }), { headers: cors })
      res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
      return res
    }

    if(p==='auth/set-password' && m==='POST'){
      const cfg = await getAuthConfig(masterSid)
      const token = getCookie(req, SESSION_COOKIE)
      const s = await verifySession(env, token)
      const hasSession = !!(s && s.role === 'admin')
      // Bootstrap: permite definir credenciais sem sessão apenas enquanto não há admin configurado
      if (!hasSession && (cfg.adminEmail || cfg.adminAuthMode === 'password')) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: cors })
      }
      const b = await req.json()
      const email = String(b.email || '').trim().toLowerCase()
      const password = String(b.password || '')
      const mode = b.adminAuthMode === 'password' ? 'password' : 'google'
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Informe e-mail e senha' }), { status: 400, headers: cors })
      }
      const hash = await hashPassword(password)
      await writeAuth(masterSid, { adminAuthMode: mode, adminEmail: email, adminPasswordHash: hash })
      return new Response(JSON.stringify({ ok: true, adminAuthMode: mode }), { headers: cors })
    }

    // ─── Conferences
    if(p==='conferences'&&m==='GET'){const d=await read(masterSid,'Conferences');return new Response(JSON.stringify(parseRows(d.values,['collaboratorIds'])),{headers:cors})}
    if(p==='conferences'&&m==='POST'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const b=await req.json();b.id=b.id||uid()
      if(!b.spreadsheetId)b.spreadsheetId=masterSid
      await append(masterSid,'Conferences',b)
      return new Response(JSON.stringify(b),{status:201,headers:cors})
    }
    if(p.match(/^conferences\/[^/]+$/)&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1],b=await req.json()
      const d=await read(masterSid,'Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update(masterSid,'Conferences',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^conferences\/[^/]+$/)&&m==='DELETE'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1]
      const d=await read(masterSid,'Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del(masterSid,'Conferences',i)
      return new Response(null,{status:204,headers:cors})
    }
    if(p.startsWith('conferences/slug/')&&m==='GET'){
      const slug=p.split('/').pop()
      const d=await read(masterSid,'Conferences'),items=parseRows(d.values,['collaboratorIds'])
      return new Response(JSON.stringify(items.find(c=>c.slug===slug)||null),{headers:cors})
    }

    // ─── Products
    if(p==='products'&&m==='GET'){
      const cid=u.searchParams.get('conferenceId')
      const sid=cid?await getConfSpreadsheetId(cid):masterSid
      const d=await read(sid,'Products');let items=parseRows(d.values,['variants'])
      if(cid)items=items.filter(i=>i.conferenceId===cid)
      return new Response(JSON.stringify(items),{headers:cors})
    }
    if(p.match(/^products\/[^/]+$/)&&m==='GET'){
      const id=p.split('/')[1]
      // Procura no master e em todas as conf sheets
      let prod=null
      const d0=await read(masterSid,'Products');const r0=parseRows(d0.values,['variants'])
      prod=r0.find(r=>r.id===id)
      if(!prod){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Products');const rows=parseRows(d.values,['variants']);const found=rows.find(r=>r.id===id);if(found){prod=found;break}}catch{}
          }
        }
      }
      if(!prod)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      return new Response(JSON.stringify(prod),{headers:cors})
    }
    if(p==='products'&&m==='POST'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const b=await req.json();b.id=b.id||uid()
      const sid=await getConfSpreadsheetId(b.conferenceId)
      await append(sid,'Products',b)
      return new Response(JSON.stringify(b),{status:201,headers:cors})
    }
    if(p.match(/^products\/[^/]+$/)&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1],b=await req.json()
      // Encontra o produto e seu spreadsheet
      let sid=masterSid,rows,idx=-1
      const d0=await read(masterSid,'Products');rows=parseRows(d0.values,['variants']);idx=rows.findIndex(r=>r.id===id)
      if(idx===-1){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Products');rows=parseRows(d.values,['variants']);idx=rows.findIndex(r=>r.id===id);if(idx!==-1){sid=c.spreadsheetId;break}}catch{}
          }
        }
      }
      if(idx===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[idx],...b};await update(sid,'Products',idx,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^products\/[^/]+$/)&&m==='DELETE'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1]
      let sid=masterSid,rows,idx=-1
      const d0=await read(masterSid,'Products');rows=parseRows(d0.values,['variants']);idx=rows.findIndex(r=>r.id===id)
      if(idx===-1){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Products');rows=parseRows(d.values,['variants']);idx=rows.findIndex(r=>r.id===id);if(idx!==-1){sid=c.spreadsheetId;break}}catch{}
          }
        }
      }
      if(idx===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del(sid,'Products',idx);return new Response(null,{status:204,headers:cors})
    }

    // ─── Orders
    if(p==='orders'&&m==='GET'){
      const cid=u.searchParams.get('conferenceId')
      const sid=cid?await getConfSpreadsheetId(cid):masterSid
      const d=await read(sid,'Orders');let items=parseRows(d.values,['items'])
      if(cid)items=items.filter(o=>o.conferenceId===cid)
      return new Response(JSON.stringify(items),{headers:cors})
    }
    if(p==='orders'&&m==='POST'){
      const b=await req.json();b.id=b.id||uid();b.createdAt=b.createdAt||new Date().toISOString();b.status=b.status||'pending'
      const sid=await getConfSpreadsheetId(b.conferenceId)
      await append(sid,'Orders',b)
      return new Response(JSON.stringify(b),{status:201,headers:cors})
    }
    if(p.match(/^orders\/[^/]+$/)&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1],b=await req.json()
      let sid=masterSid,rows,idx=-1
      const d0=await read(masterSid,'Orders');rows=parseRows(d0.values,['items']);idx=rows.findIndex(r=>r.id===id)
      if(idx===-1){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Orders');rows=parseRows(d.values,['items']);idx=rows.findIndex(r=>r.id===id);if(idx!==-1){sid=c.spreadsheetId;break}}catch{}
          }
        }
      }
      if(idx===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[idx],...b};await update(sid,'Orders',idx,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^orders\/[^/]+\/status$/)&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1],b=await req.json()
      let sid=masterSid,rows,idx=-1
      const d0=await read(masterSid,'Orders');rows=parseRows(d0.values,['items']);idx=rows.findIndex(r=>r.id===id)
      if(idx===-1){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Orders');rows=parseRows(d.values,['items']);idx=rows.findIndex(r=>r.id===id);if(idx!==-1){sid=c.spreadsheetId;break}}catch{}
          }
        }
      }
      if(idx===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[idx],status:b.status};await update(sid,'Orders',idx,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^orders\/[^/]+$/)&&m==='DELETE'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1]
      let sid=masterSid,rows,idx=-1
      const d0=await read(masterSid,'Orders');rows=parseRows(d0.values,['items']);idx=rows.findIndex(r=>r.id===id)
      if(idx===-1){
        const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
        for(const c of cr){
          if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
            try{const d=await read(c.spreadsheetId,'Orders');rows=parseRows(d.values,['items']);idx=rows.findIndex(r=>r.id===id);if(idx!==-1){sid=c.spreadsheetId;break}}catch{}
          }
        }
      }
      if(idx===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del(sid,'Orders',idx);return new Response(null,{status:204,headers:cors})
    }
    if(p.startsWith('orders/buyer')&&m==='GET'){
      const email=u.searchParams.get('email')
      // Busca no master e em todas as conf sheets
      let items=[]
      const d0=await read(masterSid,'Orders');items=parseRows(d0.values,['items'])
      const confs=await read(masterSid,'Conferences');const cr=parseRows(confs.values,['collaboratorIds'])
      for(const c of cr){
        if(c.spreadsheetId&&c.spreadsheetId!==masterSid){
          try{const d=await read(c.spreadsheetId,'Orders');items=items.concat(parseRows(d.values,['items']))}catch{}
        }
      }
      if(email)items=items.filter(o=>o.buyerEmail===email)
      return new Response(JSON.stringify(items),{headers:cors})
    }

    // ─── Users
    if(p==='users'&&m==='GET'){const d=await read(masterSid,'Users');return new Response(JSON.stringify(parseRows(d.values,['conferenceIds'])),{headers:cors})}
    if(p==='users'&&m==='POST'){const b=await req.json();b.id=b.id||uid();await append(masterSid,'Users',b);return new Response(JSON.stringify(b),{status:201,headers:cors})}
    if(p.match(/^users\/[^/]+$/)&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const id=p.split('/')[1],b=await req.json()
      const d=await read(masterSid,'Users'),rows=parseRows(d.values,['conferenceIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update(masterSid,'Users',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.startsWith('users/email/')&&m==='GET'){
      const em=decodeURIComponent(p.replace('users/email/',''))
      const d=await read(masterSid,'Users'),items=parseRows(d.values,['conferenceIds'])
      return new Response(JSON.stringify(items.find(u=>u.email===em)||null),{headers:cors})
    }

    // ─── Config
    if(p==='config'&&m==='GET'){
      const d=await read(masterSid,'Config'),items=parseRows(d.values,[]);
      const cfg=items[0]||{mode:'closed',allowedAdminDomain:null,setupCompleted:false};
      const ac=await getAuthConfig(masterSid);
      cfg.adminAuthMode=ac.adminAuthMode;
      return new Response(JSON.stringify(cfg),{headers:cors})
    }
    if(p==='config'&&m==='PUT'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const b=await req.json();const d=await read(masterSid,'Config'),rows=parseRows(d.values,[]);
      if(rows.length){const up={...rows[0],...b};await update(masterSid,'Config',0,up);return new Response(JSON.stringify(up),{headers:cors})}
      await append(masterSid,'Config',b);return new Response(JSON.stringify(b),{headers:cors})
    }

    // ─── Drive Setup
    if(p==='setup/drive'&&m==='POST'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      async function ffc(name,parent){
        const q=parent?"'"+parent+"' in parents and name='"+name+"' and mimeType='application/vnd.google-apps.folder' and trashed=false":"name='"+name+"' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        const l=await fetch('https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)',{headers:authH})
        const d=await l.json()
        if(d.files&&d.files.length)return d.files[0].id
        const c=await fetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{...authH,'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:parent?[parent]:[]})})
        return (await c.json()).id
      }
      const rid=await ffc('OC-Shop',null)
      const sid=await ffc('_system',rid)
      const cid=await ffc('Conferences',rid)
      return new Response(JSON.stringify({rootId:rid,systemId:sid,conferencesId:cid}),{headers:cors})
    }

    // ─── Upload (converte para data URL, armazenamento sem Drive)
    if(p.startsWith('upload/')&&m==='POST'){
      if(!(await isAuthedAdmin(req,env,masterSid)))return new Response(JSON.stringify({error:'Não autorizado'}),{status:401,headers:cors})
      const form=await req.formData()
      const file=form.get('image')
      if(!file||typeof file==='string')return new Response(JSON.stringify({error:'No image file'}),{status:400,headers:cors})
      const bytes=await file.arrayBuffer()
      const arr=new Uint8Array(bytes)
      let b64=''
      const CHUNK=0x8000;for(let i=0;i<arr.length;i+=CHUNK)b64+=String.fromCharCode.apply(null,arr.subarray(i,i+CHUNK))
      b64=btoa(b64)
      const url='data:'+(file.type||'image/png')+';base64,'+b64
      return new Response(JSON.stringify({url}),{headers:cors})
    }

    return new Response(JSON.stringify({error:'Route not found: '+m+' /api/'+p}),{status:404,headers:cors})
  }catch(err){return new Response(JSON.stringify({error:err.message}),{status:500,headers:cors})}
}
