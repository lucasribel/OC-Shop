# AIESEC Shop

Loja de conferências da AIESEC Brasil. **Grátis. Sem servidor.** Roda 100% no Cloudflare Pages + Google Sheets.

---

## 🚀 Deploy em 5 minutos

### Você vai precisar de:

- Uma conta Google (pessoal ou da sua AIESEC)
- Conta gratuita no [Cloudflare](https://dash.cloudflare.com)

### Passo 1 — Criar projeto no Google Cloud

1. Acesse **[console.cloud.google.com](https://console.cloud.google.com)**
2. Clique no seletor de projeto no topo → **NOVO PROJETO**
3. Nome: `AIESEC Shop` → **CRIAR**

### Passo 2 — Ativar APIs

Menu lateral: **APIs e serviços** → **Biblioteca**. Ative:
- ✅ Google Sheets API
- ✅ Google Drive API

### Passo 3 — Service Account (acesso à planilha)

**APIs e serviços** → **Credenciais** → **+ CRIAR CREDENCIAIS** → **Conta de serviço**

1. Nome: `aiesec-shop-sheets`. **Criar e concluir**.
2. Clique na conta → **Chaves** → **Adicionar chave** → **JSON**
3. Abra o arquivo baixado. Copie `client_email` e `private_key`.

### Passo 4 — Planilha

1. **[sheets.google.com](https://sheets.google.com)** → **+ Em branco**
2. Nome: `AIESEC Shop`
3. **Compartilhar** → cole o `client_email` → **Editor** → Enviar
4. Copie o ID da URL: `.../d/XXXXXXX/edit`

### Passo 5 — Login Google (OAuth)

1. **APIs e serviços** → **Tela de consentimento OAuth**
2. Tipo: **Externo** → Preencha nome e e-mail → **Publicar app**
3. **Credenciais** → **+ Criar** → **ID do cliente OAuth**
4. Tipo: **Aplicativo da Web**
5. Origens autorizadas: `http://localhost:5173` e `https://oc-shop.pages.dev`
6. URIs de redirecionamento: `http://localhost:5173` e `https://oc-shop.pages.dev`
7. Copie o **ID do cliente**

### Passo 6 — Deploy no Cloudflare

1. Acesse **[dash.cloudflare.com](https://dash.cloudflare.com)** → **Workers & Pages**
2. **Create** → **Pages** → **Connect to Git** → selecione o repositório
3. Build command: `npm run build` | Output: `dist`
4. **Save and Deploy**

### Passo 7 — Configurar variáveis

No Cloudflare Pages: **Settings** → **Environment variables**:

| Variável | Valor |
|---|---|
| `GOOGLE_SERVICE_EMAIL` | `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` do JSON (com `\n`) |
| `SPREADSHEET_ID` | ID da planilha |
| `VITE_OAUTH_CLIENT_ID` | ID do cliente OAuth |

### Passo 8 — Configurar local

Crie `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:3001
VITE_OAUTH_CLIENT_ID=SEU_CLIENT_ID
```

```bash
cd backend && npm install && npm run dev   # Terminal 1
npm run dev                                  # Terminal 2
```

Acesse **http://localhost:5173**. Login com Google real.

---

## Tecnologia

| Camada | O que usa |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS |
| API | Cloudflare Functions (serverless) |
| Banco | Google Sheets |
| Auth | Google Identity Services |
| Hospedagem | Cloudflare Pages (grátis) |
