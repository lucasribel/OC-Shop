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
  // key pode vir em base64 (btoa do PEM) ou como texto puro
  let pem = key
  // Tenta decodificar base64 se não contém BEGIN/END
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
    return o
  })
}

const H = {
  C:['id','name','slug','aiesec','active','status','startDate','endDate','orderDeadline','ownerId','collaboratorIds'],
  P:['id','conferenceId','name','description','price','stock','image','imageUrl','active','variants'],
  O:['id','conferenceId','conferenceSlug','userId','userName','buyerName','buyerEmail','buyerPhone','items','total','status','createdAt'],
  U:['id','email','name','picture','role','aiesec','googleId','conferenceIds'],
  F:['mode','allowedAdminDomain','setupCompleted'],
}

export async function onRequest(ctx) {
  const {request:req,env}=ctx
  const u=new URL(req.url)
  const p=u.pathname.replace('/api/','')
  const m=req.method

  if(m==='OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}})
  const cors={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'}

  try{
    const sid=env.SPREADSHEET_ID
    const tok=await accessToken(env.GOOGLE_SERVICE_EMAIL,env.GOOGLE_PRIVATE_KEY)
    const authH={Authorization:'Bearer '+tok}
    const uid=()=>crypto.randomUUID()

    async function sh(method,sheet,range,body){
      const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid+'/values/'+encodeURIComponent(sheet)+'!'+range,
        {method,headers:body?{...authH,'Content-Type':'application/json'}:authH,body:body?JSON.stringify(body):undefined})
      if(!r.ok)throw new Error('Sheets '+method+' '+range+': '+r.status)
      return r.status===204?null:r.json()
    }

    async function read(sheet){try{return await sh('GET',sheet,'A:Z')}catch{return{values:[]}}}
    async function append(sheet,data){
      const hd=H[sheet]||Object.keys(data)
      await sh('POST',sheet,'A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{values:[hd.map(k=>String(data[k]??''))]})
    }
    async function update(sheet,idx,data){
      const hd=H[sheet]||Object.keys(data)
      await sh('PUT',sheet,'A'+(idx+2)+'?valueInputOption=RAW',{values:[hd.map(k=>String(data[k]??''))]})
    }
    async function del(sheet,idx){
      const meta=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid,{headers:authH})
      const mj=await meta.json()
      const shj=mj.sheets.find(s=>s.properties.title===sheet)
      if(!shj)return
      await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sid+':batchUpdate',{
        method:'POST',headers:{...authH,'Content-Type':'application/json'},
        body:JSON.stringify({requests:[{deleteDimension:{range:{sheetId:shj.properties.sheetId,dimension:'ROWS',startIndex:idx+1,endIndex:idx+2}}}]})
      })
    }

    // ─── Health
    if(p==='health') return new Response(JSON.stringify({status:'ok'}),{headers:cors})

    // ─── Conferences
    if(p==='conferences'&&m==='GET'){const d=await read('Conferences');return new Response(JSON.stringify(parseRows(d.values,['collaboratorIds'])),{headers:cors})}
    if(p==='conferences'&&m==='POST'){const b=await req.json();b.id=b.id||uid();await append('Conferences',b);return new Response(JSON.stringify(b),{status:201,headers:cors})}
    if(p.match(/^conferences\/[^/]+$/)&&m==='PUT'){
      const id=p.split('/')[1],b=await req.json()
      const d=await read('Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update('Conferences',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }

    if(p.match(/^conferences\/[^/]+$/)&&m==='DELETE'){
      const id=p.split('/')[1]
      const d=await read('Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del('Conferences',i)
      return new Response(null,{status:204,headers:cors})
    }
    if(p.startsWith('conferences/slug/')&&m==='GET'){
      const slug=p.split('/').pop()
      const d=await read('Conferences'),items=parseRows(d.values,['collaboratorIds'])
      return new Response(JSON.stringify(items.find(c=>c.slug===slug)||null),{headers:cors})
    }

    // ─── Products
    if(p==='products'&&m==='GET'){
      const cid=u.searchParams.get('conferenceId')
      const d=await read('Products');let items=parseRows(d.values,['variants'])
      if(cid)items=items.filter(i=>i.conferenceId===cid)
      return new Response(JSON.stringify(items),{headers:cors})
    }
    if(p==='products'&&m==='POST'){const b=await req.json();b.id=b.id||uid();await append('Products',b);return new Response(JSON.stringify(b),{status:201,headers:cors})}
    if(p.match(/^products\/[^/]+$/)&&m==='PUT'){
      const id=p.split('/')[1],b=await req.json()
      const d=await read('Products'),rows=parseRows(d.values,['variants'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update('Products',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^products\/[^/]+$/)&&m==='DELETE'){
      const id=p.split('/')[1]
      const d=await read('Products'),rows=parseRows(d.values,['variants'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del('Products',i);return new Response(null,{status:204,headers:cors})
    }

    // ─── Orders
    if(p==='orders'&&m==='GET'){
      const cid=u.searchParams.get('conferenceId')
      const d=await read('Orders');let items=parseRows(d.values,['items'])
      if(cid)items=items.filter(o=>o.conferenceId===cid)
      return new Response(JSON.stringify(items),{headers:cors})
    }
    if(p==='orders'&&m==='POST'){const b=await req.json();b.id=b.id||uid();b.createdAt=b.createdAt||new Date().toISOString();b.status=b.status||'pending';await append('Orders',b);return new Response(JSON.stringify(b),{status:201,headers:cors})}
    if(p.match(/^orders\/[^/]+$/)&&m==='PUT'){
      const id=p.split('/')[1],b=await req.json()
      const d=await read('Orders'),rows=parseRows(d.values,['items'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update('Orders',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^orders\/[^/]+$/)&&m==='DELETE'){
      const id=p.split('/')[1]
      const d=await read('Orders'),rows=parseRows(d.values,['items'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      await del('Orders',i);return new Response(null,{status:204,headers:cors})
    }
    if(p.startsWith('orders/buyer')&&m==='GET'){
      const email=u.searchParams.get('email')
      const d=await read('Orders');let items=parseRows(d.values,['items'])
      if(email)items=items.filter(o=>o.buyerEmail===email)
      return new Response(JSON.stringify(items),{headers:cors})
    }

    // ─── Users
    if(p==='users'&&m==='GET'){const d=await read('Users');return new Response(JSON.stringify(parseRows(d.values,['conferenceIds'])),{headers:cors})}
    if(p==='users'&&m==='POST'){const b=await req.json();b.id=b.id||uid();await append('Users',b);return new Response(JSON.stringify(b),{status:201,headers:cors})}
    if(p.match(/^users\/[^/]+$/)&&m==='PUT'){
      const id=p.split('/')[1],b=await req.json()
      const d=await read('Users'),rows=parseRows(d.values,['conferenceIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update('Users',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.startsWith('users/email/')&&m==='GET'){
      const em=decodeURIComponent(p.replace('users/email/',''))
      const d=await read('Users'),items=parseRows(d.values,['conferenceIds'])
      return new Response(JSON.stringify(items.find(u=>u.email===em)||null),{headers:cors})
    }

    // ─── Config
    if(p==='config'&&m==='GET'){const d=await read('Config'),items=parseRows(d.values,[]);return new Response(JSON.stringify(items[0]||{mode:'closed',allowedAdminDomain:null,setupCompleted:false}),{headers:cors})}
    if(p==='config'&&m==='PUT'){const b=await req.json();const d=await read('Config'),rows=parseRows(d.values,[]);if(rows.length)await update('Config',0,b);else await append('Config',b);return new Response(JSON.stringify(b),{headers:cors})}

    // ─── Drive Setup
    if(p==='setup/drive'&&m==='POST'){
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

    return new Response(JSON.stringify({error:'Route not found: '+m+' /api/'+p}),{status:404,headers:cors})
  }catch(err){return new Response(JSON.stringify({error:err.message}),{status:500,headers:cors})}
}
