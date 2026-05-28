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

    // ── Resolve spreadsheet para conferência ──
    async function getConfSpreadsheetId(conferenceId){
      const d=await read(masterSid,'Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const conf=rows.find(r=>r.id===conferenceId)
      return conf?.spreadsheetId||masterSid
    }

    // ─── Health
    if(p==='health') return new Response(JSON.stringify({status:'ok'}),{headers:cors})

    // ─── Conferences
    if(p==='conferences'&&m==='GET'){const d=await read(masterSid,'Conferences');return new Response(JSON.stringify(parseRows(d.values,['collaboratorIds'])),{headers:cors})}
    if(p==='conferences'&&m==='POST'){
      const b=await req.json();b.id=b.id||uid()
      if(!b.spreadsheetId)b.spreadsheetId=masterSid
      await append(masterSid,'Conferences',b)
      return new Response(JSON.stringify(b),{status:201,headers:cors})
    }
    if(p.match(/^conferences\/[^/]+$/)&&m==='PUT'){
      const id=p.split('/')[1],b=await req.json()
      const d=await read(masterSid,'Conferences'),rows=parseRows(d.values,['collaboratorIds'])
      const i=rows.findIndex(r=>r.id===id)
      if(i===-1)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:cors})
      const up={...rows[i],...b};await update(masterSid,'Conferences',i,up);return new Response(JSON.stringify(up),{headers:cors})
    }
    if(p.match(/^conferences\/[^/]+$/)&&m==='DELETE'){
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
      const b=await req.json();b.id=b.id||uid()
      const sid=await getConfSpreadsheetId(b.conferenceId)
      await append(sid,'Products',b)
      return new Response(JSON.stringify(b),{status:201,headers:cors})
    }
    if(p.match(/^products\/[^/]+$/)&&m==='PUT'){
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
    if(p==='config'&&m==='GET'){const d=await read(masterSid,'Config'),items=parseRows(d.values,[]);return new Response(JSON.stringify(items[0]||{mode:'closed',allowedAdminDomain:null,setupCompleted:false}),{headers:cors})}
    if(p==='config'&&m==='PUT'){const b=await req.json();const d=await read(masterSid,'Config'),rows=parseRows(d.values,[]);if(rows.length)await update(masterSid,'Config',0,b);else await append(masterSid,'Config',b);return new Response(JSON.stringify(b),{headers:cors})}

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

    // ─── Upload (converte para data URL, armazenamento sem Drive)
    if(p.startsWith('upload/')&&m==='POST'){
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
