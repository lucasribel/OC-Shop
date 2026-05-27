# AIESEC Shop

Loja de conferências da AIESEC Brasil. **100% serverless. Custo zero.**

---

## 🚀 Configuração Completa (15 minutos)

Você vai precisar de: uma conta Google + [GitHub](https://github.com) + [Cloudflare](https://dash.cloudflare.com).

---

## PASSO 1 — Google Cloud (5 min)

### 1.1 Criar projeto
1. [console.cloud.google.com](https://console.cloud.google.com) → seletor no topo → **NOVO PROJETO**
2. Nome: `AIESEC Shop` → **CRIAR**

### 1.2 Ativar APIs
Menu lateral → **APIs e serviços** → **Biblioteca** → ative:
- ✅ Google Sheets API
- ✅ Google Drive API

### 1.3 Service Account (acesso às planilhas)
1. **Credenciais** → **+ CRIAR** → **Conta de serviço**
2. Nome: `aiesec-shop-sheets` → **CRIAR E CONCLUIR**
3. Clique na conta → **Chaves** → **Adicionar chave** → **JSON**
4. ⚠️ **Guarde o arquivo baixado.** Dele você vai precisar de:
   - `client_email` → ex: `aiesec-shop-sheets@...iam.gserviceaccount.com`
   - `private_key` → começa com `-----BEGIN PRIVATE KEY-----`

### 1.4 Login Google (OAuth)
1. **Tela de consentimento OAuth** → **CRIAR** → tipo **Externo**
2. Preencha nome `AIESEC Shop` + seu e-mail → **SALVAR E CONTINUAR**
3. Clique **PUBLICAR APP** (em "Teste", adicione seu e-mail em Test users)
4. **Credenciais** → **+ CRIAR** → **ID do cliente OAuth**
5. Tipo: **Aplicativo da Web** → Nome: `AIESEC Shop`
6. Origens autorizadas: `http://localhost:5173` e `https://oc-shop.pages.dev`
7. URIs de redirecionamento: `http://localhost:5173` e `https://oc-shop.pages.dev`
8. **CRIAR** → copie o **ID do cliente**

---

## PASSO 2 — Google Sheets (2 min)

1. [sheets.google.com](https://sheets.google.com) → **+ Em branco**
2. Nome: `AIESEC Shop`
3. **Compartilhar** → cole o `client_email` da Service Account → **Editor** → Enviar
4. Copie o ID da URL: `.../d/`**`XXXXXXX`**`/edit`

---

## PASSO 3 — Cloudflare (5 min)

### 3.1 Deploy do frontend
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. **Create** → **Pages** → **Upload assets**
3. Nome do projeto: `oc-shop`
4. Arraste a pasta `dist/` (gere com `npm run build`)
5. **Deploy**

### 3.2 Configurar secrets
No Cloudflare Pages → `oc-shop` → **Settings** → **Environment variables** → **Add secret**:

| Nome | Valor |
|---|---|
| `GOOGLE_SERVICE_EMAIL` | `client_email` da Service Account |
| `GOOGLE_PRIVATE_KEY` | `private_key` — cole EXATAMENTE como está no JSON, com as quebras de linha |
| `SPREADSHEET_ID` | ID da planilha |
| `VITE_OAUTH_CLIENT_ID` | ID do cliente OAuth |

### 3.3 Redeploy
Após salvar as secrets, volte em **Deployments** → **...** (3 pontinhos) → **Retry deployment**.

---

## PASSO 4 — Local (opcional, para desenvolvimento)

```bash
git clone https://github.com/lucasribel/OC-Shop
cd OC-Shop
npm install
cd backend && npm install && cd ..

# Crie .env na raiz:
echo "VITE_API_URL=http://localhost:3001" > .env
echo "VITE_OAUTH_CLIENT_ID=SEU_CLIENT_ID" >> .env

# Backend
cd backend
echo "GOOGLE_SHEETS_CLIENT_EMAIL=..." > .env
echo "GOOGLE_SHEETS_PRIVATE_KEY=..." >> .env
echo "SPREADSHEET_ID=..." >> .env
echo "PORT=3001" >> .env
npm run dev

# Frontend (outro terminal)
npm run dev
```

---

## ✅ Verificação

1. **Health:** `curl https://oc-shop.pages.dev/api/health` → `{"status":"ok"}`
2. **Conferências:** `curl https://oc-shop.pages.dev/api/conferences` → dados da planilha
3. **Login:** acesse `https://oc-shop.pages.dev/login` → clique **Entrar com Google**

---

## 📁 Estrutura no Google Drive

O sistema cria automaticamente:

```
📁 OC-Shop/    ← compartilhada com você
├── 📁 _system/
├── 📁 Conferences/
│   ├── 📁 {slug}/
│   │   └── 📁 images/   ← imagens dos produtos
```

---

## 🔧 Resolução de problemas

| Erro | Solução |
|---|---|
| 403 no login | Adicione `https://oc-shop.pages.dev` nas origens autorizadas do OAuth |
| 500 na API | Verifique se as secrets do Cloudflare estão corretas |
| "Tempo esgotado" | Permita popups para o site no navegador |
| Pasta não aparece | Acesse "Partilhados comigo" no Google Drive |
