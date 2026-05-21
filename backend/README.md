# OC-Shop — API Backend

API REST em Node.js + Express que usa **Google Sheets** como banco de dados e **Firebase Admin** para autenticação de rotas protegidas.

---

## Índice

- [Como executar](#como-executar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Configurar Google Sheets](#configurar-google-sheets)
- [Configurar Firebase](#configurar-firebase)
- [Endpoints](#endpoints)
- [Criar objetos na planilha](#criar-objetos-na-planilha)
- [Scripts utilitários](#scripts-utilitários)

---

## Como executar

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de variáveis de ambiente
copy .env.example .env
# Edite o .env com suas credenciais (veja seção abaixo)

# 3. Rodar em desenvolvimento (hot reload)
npm run dev

# 4. Rodar em produção
npm start
```

A API sobe em `http://localhost:3001` por padrão.

---

## Variáveis de ambiente

Crie o arquivo `backend/.env` com os valores abaixo:

```env
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173

# Firebase Admin SDK (necessário para rotas protegidas)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Google Sheets (necessário para leitura/gravação de dados)
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
SPREADSHEET_ID=

# Google Drive (para armazenar imagens de produtos)
DRIVE_FOLDER_ID=
```

> Sem as credenciais do Google Sheets a API sobe normalmente mas retorna dados vazios.
> Sem o Firebase as rotas públicas funcionam, mas rotas de admin retornam 401.

---

## Configurar Google Sheets

### 1. Criar projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto
3. No menu lateral: **APIs & Services → Enable APIs**
4. Habilite: **Google Sheets API** e **Google Drive API**

### 2. Criar Service Account

1. **APIs & Services → Credentials → Create Credentials → Service Account**
2. Dê um nome e clique em **Done**
3. Clique na service account criada → aba **Keys → Add Key → JSON**
4. Um arquivo `.json` será baixado. Dele você vai extrair:
   - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`

### 3. Criar a planilha

1. Crie uma planilha em [sheets.google.com](https://sheets.google.com)
2. Compartilhe com o e-mail da service account como **Editor**
3. Copie o ID da URL: `docs.google.com/spreadsheets/d/**ID_AQUI**/edit`
4. Cole em `SPREADSHEET_ID`

### 4. Criar as abas com os cabeçalhos corretos

A planilha precisa ter **5 abas** com os cabeçalhos na linha 1:

**Config**
| mode | allowedAdminDomain | setupCompleted |
|------|--------------------|----------------|
| open | aiesec.net | true |

**Users**
| id | email | name | picture | role | aiesec | googleId | conferenceIds |
|----|-------|------|---------|------|--------|----------|---------------|

**Conferences**
| id | name | slug | aiesec | active | status | startDate | endDate | orderDeadline | ownerId | collaboratorIds |
|----|------|------|--------|--------|--------|-----------|---------|---------------|---------|-----------------|

**Products**
| id | conferenceId | name | description | price | stock | image | imageUrl | active | variants |
|----|-------------|------|-------------|-------|-------|-------|----------|--------|----------|

**Orders**
| id | conferenceId | conferenceSlug | userId | userName | buyerName | buyerEmail | buyerPhone | items | total | status | createdAt |
|----|-------------|----------------|--------|----------|-----------|-----------|------------|-------|-------|--------|-----------|

> Use o script `node scripts/setup-sheets.js` para criar tudo automaticamente (veja Scripts).

---

## Configurar Firebase

Necessário apenas para rotas de administração (criar/editar produtos, conferências, etc.).

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie ou abra seu projeto
3. **Project Settings → Service Accounts → Generate new private key**
4. Do JSON baixado extraia:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

---

## Endpoints

### Autenticação

Rotas marcadas com 🔒 exigem header:
```
Authorization: Bearer <firebase_id_token>
```

---

### Conferências — `/api/conferences`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/conferences` | Público | Lista todas as conferências |
| GET | `/api/conferences/slug/:slug` | Público | Busca por slug |
| GET | `/api/conferences/:id` | Público | Busca por ID |
| POST | `/api/conferences` | 🔒 | Cria conferência |
| PUT | `/api/conferences/:id` | 🔒 | Atualiza conferência |

**Exemplo de criação:**
```json
POST /api/conferences
{
  "name": "Conferência 2026.1",
  "slug": "conferencia-2026-1",
  "aiesec": "AIESEC Brasil",
  "status": "open",
  "startDate": "2026-06-01",
  "endDate": "2026-06-05",
  "orderDeadline": "2026-05-20",
  "collaboratorIds": []
}
```

---

### Produtos — `/api/products`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/products?conferenceId=xxx` | Público | Lista produtos de uma conferência |
| GET | `/api/products/:id` | Público | Busca produto por ID |
| POST | `/api/products` | 🔒 | Cria produto |
| PUT | `/api/products/:id` | 🔒 | Atualiza produto |
| DELETE | `/api/products/:id` | 🔒 | Remove produto |

**Exemplo de criação:**
```json
POST /api/products
{
  "conferenceId": "conf1",
  "name": "Kit Delegado",
  "description": "Camiseta, crachá e materiais",
  "price": 89.90,
  "stock": 50,
  "imageUrl": "https://lh3.googleusercontent.com/d/SEU_FILE_ID",
  "active": true,
  "variants": [
    { "label": "Tamanho", "options": ["P", "M", "G", "GG"] }
  ]
}
```

---

### Pedidos — `/api/orders`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/orders?conferenceId=xxx` | 🔒 | Lista pedidos de uma conferência |
| GET | `/api/orders/buyer?email=xxx` | Público | Busca pedidos por e-mail do comprador |
| GET | `/api/orders/user/:userId` | 🔒 | Lista pedidos de um usuário |
| POST | `/api/orders` | Público | Cria pedido (checkout) |
| PUT | `/api/orders/:id/status` | 🔒 | Atualiza status do pedido |

**Exemplo de criação (checkout público):**
```json
POST /api/orders
{
  "conferenceId": "conf1",
  "userId": "u4",
  "userName": "Maria Silva",
  "buyerName": "Maria Silva",
  "buyerEmail": "maria@gmail.com",
  "buyerPhone": "(11) 99999-9999",
  "items": [
    {
      "productId": "p1",
      "productName": "Kit Delegado",
      "quantity": 1,
      "unitPrice": 89.90,
      "selectedVariants": {}
    }
  ],
  "total": 89.90
}
```

**Status válidos:** `pending` | `confirmed` | `cancelled`

---

### Usuários — `/api/users`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/users` | 🔒 | Lista todos os usuários |
| GET | `/api/users/:id` | 🔒 | Busca por ID |
| GET | `/api/users/email/:email` | 🔒 | Busca por e-mail |
| POST | `/api/users` | Público | Cria usuário |
| PUT | `/api/users/:id` | 🔒 | Atualiza usuário |

**Roles válidas:** `user` | `collaborator` | `admin` | `super_admin`

---

### Configuração do sistema — `/api/config`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/config` | Público | Retorna config do sistema |
| PUT | `/api/config` | 🔒 | Atualiza config |

**Exemplo:**
```json
PUT /api/config
{
  "mode": "open",
  "allowedAdminDomain": "aiesec.net",
  "setupCompleted": true
}
```

**Modos:** `open` (loja aberta) | `closed` (loja fechada)

---

## Criar objetos na planilha

Você pode criar registros de duas formas:

### Via API (recomendado para produção)

Use os endpoints POST acima com um client como Postman, Insomnia ou `curl`:

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"conferenceId":"conf1","buyerName":"João","buyerEmail":"joao@email.com",...}'
```

### Via script de seed (desenvolvimento)

O script `scripts/setup-sheets.js` apaga e recria todos os dados de teste:

```bash
cd backend
node scripts/setup-sheets.js
```

Edite o array `SEED` dentro do script para personalizar os dados antes de rodar.

### Diretamente na planilha

Você pode editar as células diretamente no Google Sheets. Atenção:
- Campos de array (`variants`, `items`, `collaboratorIds`, `conferenceIds`) devem estar em **JSON válido**: `["P","M","G"]`
- Booleanos como string: `true` ou `false`
- Números sem aspas: `89.9`
- IDs devem ser únicos — use o formato que quiser, mas não repita

---

## Scripts utilitários

| Script | Descrição |
|--------|-----------|
| `node scripts/setup-sheets.js` | Cria abas e popula com dados de teste |
| `node scripts/list-drive-files.js` | Lista arquivos da pasta do Google Drive com URLs prontas |

---

## Arquitetura resumida

```
server.js               → entry point, sobe o Express na porta 3001
src/app.js              → configura middlewares e monta as rotas
src/routes/             → define quais endpoints existem e quais precisam de auth
src/controllers/        → recebe a requisição, chama o service, devolve JSON
src/services/sheetsService.js → toda leitura/escrita no Google Sheets
src/middlewares/authMiddleware.js → valida token Firebase
src/validators/         → schemas Zod que validam o body das requisições
scripts/                → utilitários de setup e manutenção
```
