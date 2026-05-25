# Setup do Google Sheets + Backend

O backend usa **Google Sheets API** via Service Account (não Google Apps Script).

---

## 1. Criar projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto (ex: "AIESEC Shop")
3. **APIs & Services → Enable APIs and Services**
4. Habilite: **Google Sheets API** e **Google Drive API**

---

## 2. Criar Service Account

1. **APIs & Services → Credentials → Create Credentials → Service Account**
2. Nome: `aiesec-shop-sheets`
3. Role: **Editor** (ou Basic → Editor)
4. Clique **Done**
5. Clique na service account → **Keys → Add Key → Create New Key → JSON**
6. O arquivo `.json` será baixado. Extraia:
   - `client_email` → use como `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → use como `GOOGLE_SHEETS_PRIVATE_KEY`

---

## 3. Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) → **Nova planilha**
2. Dê o nome: `AIESEC Shop - Produção`
3. Compartilhe com o e-mail da Service Account como **Editor**
4. Copie o ID da URL:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXX/edit
                                 ^^^^^^^^^^^^^^^
   ```
5. Use como `SPREADSHEET_ID`

---

## 4. Configurar Firebase Admin (para rotas admin)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie ou abra seu projeto Firebase
3. **Project Settings → Service Accounts → Generate new private key**
4. Do JSON baixado extraia:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

---

## 5. Configurar `.env` do backend

Edite `backend/.env`:

```env
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com

# Google Sheets (Service Account)
GOOGLE_SHEETS_CLIENT_EMAIL=aiesec-shop-sheets@seu-projeto.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
SPREADSHEET_ID=XXXXXXXXXXXXXXX

# Google Drive (para imagens)
DRIVE_FOLDER_ID=
```

---

## 6. Criar abas e popular dados

```bash
cd backend
npm install
node scripts/setup-sheets.js
```

O script cria 5 abas com cabeçalhos e dados de teste:

| Aba | Colunas |
|---|---|
| **Config** | mode, allowedAdminDomain, setupCompleted |
| **Users** | id, email, name, picture, role, aiesec, googleId, conferenceIds |
| **Conferences** | id, name, slug, aiesec, active, status, startDate, endDate, orderDeadline, ownerId, collaboratorIds |
| **Products** | id, conferenceId, name, description, price, stock, image, imageUrl, active, variants |
| **Orders** | id, conferenceId, conferenceSlug, userId, userName, buyerName, buyerEmail, buyerPhone, items, total, status, createdAt |

---

## 7. Rodar o backend

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm start
```

API sobe em `http://localhost:3001`.

---

## Estrutura de dados no Sheets

Para editar células diretamente na planilha:
- Arrays/JSON (`variants`, `items`, `collaboratorIds`, `conferenceIds`): usar JSON válido → `[{"label":"Tamanho","options":["P","M","G"]}]`
- Booleanos: `true` ou `false` (string)
- Números: sem aspas → `89.9`
- IDs únicos obrigatórios
