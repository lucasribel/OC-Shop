# OC-Shop — Guia de Configuração Completo

> **Tudo pelo navegador.** Zero terminal para configurar.
> O wizard em `/admin/setup` te guia visualmente.

---

## Pré-requisitos

- Uma conta Google (pessoal ou da sua AIESEC)
- 20 minutos

---

## PASSO 1 — Criar projeto no Google Cloud

1. Abra **[console.cloud.google.com](https://console.cloud.google.com)**
2. No topo, clique no seletor de projeto → **NOVO PROJETO**
3. Nome: `AIESEC Shop`. Clique **CRIAR**.

---

## PASSO 2 — Ativar as APIs

1. Menu lateral: **APIs e serviços** → **Biblioteca**
2. Pesquise, clique e **ATIVE** cada uma:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**

---

## PASSO 3 — Service Account (acesso às planilhas)

1. Menu lateral: **APIs e serviços** → **Credenciais**
2. Clique **+ CRIAR CREDENCIAIS** → **Conta de serviço**
3. Nome: `aiesec-shop-sheets`. Clique **CRIAR E CONCLUIR**.
4. Clique na conta criada. Aba **Chaves** → **ADICIONAR CHAVE** → **Criar nova chave** → **JSON**.
5. Um arquivo será baixado. **Abra no Bloco de Notas**.
6. Copie estes dois valores:
   - `"client_email"` → parece `aiesec-shop@...iam.gserviceaccount.com`
   - `"private_key"` → começa com `-----BEGIN PRIVATE KEY-----`

---

## PASSO 4 — Criar a planilha

1. Abra **[sheets.google.com](https://sheets.google.com)** → **+ Em branco**
2. Nome: `AIESEC Shop - Produção`
3. **Compartilhar** → cole o e-mail da Service Account → **Editor** → Enviar
4. Copie o ID da URL: `docs.google.com/spreadsheets/d/`**`XXXXXXX`**`/edit`

---

## PASSO 5 — Login Google (OAuth)

> É ISSO que faz o botão "Entrar com Google" funcionar de verdade.

1. Menu lateral: **APIs e serviços** → **Tela de consentimento OAuth**
2. Tipo de usuário: **Externo** → **CRIAR**
3. Preencha:
   - Nome do app: `AIESEC Shop`
   - E-mail de suporte: seu e-mail
   - (O resto pode deixar em branco)
   - Clique **SALVAR E CONTINUAR** até finalizar
4. Menu lateral: **APIs e serviços** → **Credenciais**
5. **+ CRIAR CREDENCIAIS** → **ID do cliente OAuth**
6. Tipo: **Aplicativo da Web**
7. Nome: `AIESEC Shop Frontend`
8. **Origens JavaScript autorizadas** — adicione:
   - `http://localhost:5173`
9. **URIs de redirecionamento autorizados** — adicione:
   - `http://localhost:5173`
10. Clique **CRIAR**
11. Copie o **ID do cliente** (ex: `123456789-xxxxx.apps.googleusercontent.com`)

---

## PASSO 6 — Colar as credenciais no wizard

1. Rode o sistema: `npm run dev` + `cd backend && npm run dev`
2. Acesse **`http://localhost:5173/admin/setup`**
3. O wizard vai pedir cada valor nos passos certos. Cole e salve.

---

## PASSO 7 — Reiniciar

```bash
# Mate os dois terminais (Ctrl+C) e rode de novo:
cd backend && npm run dev
npm run dev
```

---

## Resumo: o que você precisa ter em mãos

| Campo | Vem de | Exemplo |
|---|---|---|
| Planilha ID | URL da planilha | `1a2b3c4d5e6f...` |
| Service Account E-mail | JSON baixado, campo `client_email` | `...@...iam.gserviceaccount.com` |
| Service Account Chave | JSON baixado, campo `private_key` | `-----BEGIN PRIVATE KEY-----\n...` |
| OAuth Client ID | Credenciais → ID do cliente OAuth | `123456789-xxxxx.apps.googleusercontent.com` |
| Drive Folder ID | URL da pasta no Drive | (opcional) |

---

## O que cada credencial faz

| Credencial | Função |
|---|---|
| Service Account | O backend usa para **ler e escrever** na planilha |
| OAuth Client ID | O frontend usa para o botão **"Entrar com Google"** |
| Planilha ID | **Onde** os dados ficam salvos |
| Drive Folder ID | **Onde** as imagens de produtos são salvas |
