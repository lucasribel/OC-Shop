# OC-Shop — Guia de Configuração

> **Tudo pelo navegador. Zero terminal.**
> Entre em `http://localhost:5173/admin/setup` e siga os passos.

---

## Pré-requisitos

- Uma conta Google
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

## PASSO 3 — Service Account

1. Menu lateral: **APIs e serviços** → **Credenciais**
2. **+ CRIAR CREDENCIAIS** → **Conta de serviço**
3. Nome: `aiesec-shop-sheets`. **CRIAR E CONCLUIR**.
4. Clique na conta criada → aba **Chaves** → **ADICIONAR CHAVE** → **JSON**
5. Abra o arquivo baixado no Bloco de Notas. Copie:
   - `"client_email"`
   - `"private_key"` (tudo, incluindo as linhas BEGIN/END)

---

## PASSO 4 — Criar a planilha

1. Abra **[sheets.google.com](https://sheets.google.com)** → **+ Em branco**
2. Nome: `AIESEC Shop - Produção`
3. **Compartilhar** → cole o e-mail da Service Account → **Editor** → Enviar
4. Copie o ID da planilha: da URL `.../d/`**`XXXXXXX`**`/edit`

---

## PASSO 5 — Login Google (OAuth)

1. Menu lateral: **APIs e serviços** → **Tela de consentimento OAuth**
2. Tipo: **Externo** → **CRIAR**
3. Preencha só os campos obrigatórios (nome, e-mail) → **SALVAR E CONTINUAR** até finalizar
4. ⚠️ Após criar, clique em **PUBLICAR APP** (embaixo do nome do app). Se estiver como "Teste", adicione seu e-mail em **Test users**.
5. Menu lateral: **Credenciais** → **+ CRIAR** → **ID do cliente OAuth**
6. Tipo: **Aplicativo da Web**
7. ⚠️ **Origens JavaScript autorizadas** — adicione:
   - `http://localhost:5173`
8. ⚠️ **URIs de redirecionamento autorizados** — adicione:
   - `http://localhost:5173`
9. **CRIAR** → copie o **ID do cliente**
---

## PASSO 6 — Colar no wizard

```
Terminal 1: cd backend && npm run dev
Terminal 2: npm run dev
```

Acesse **`http://localhost:5173/admin/setup`**

O wizard tem 5 passos. Preencha os campos e clique **Salvar** nos passos 2, 3 e 4.

---

## ⚠️ DEPOIS DE SALVAR — FAÇA ISSO

O wizard salvou as credenciais mas elas só entram em vigor depois que você **reiniciar os dois servidores**:

1. Pressione **Ctrl+C** no terminal do backend
2. Pressione **Ctrl+C** no terminal do frontend
3. Rode de novo:
   ```
   cd backend && npm run dev
   npm run dev
   ```
4. Acesse `http://localhost:5173`
5. Clique em **Entrar** — o login Google agora é REAL 🎉

### Como saber se funcionou?

- Se o banner no topo do wizard estava **🟢 verde**: login real ativo
- Se você clicar "Entrar com Google" e aparecer o popup do Google pedindo sua conta → funcionou
- Se ainda estiver no mock, verifique se `VITE_OAUTH_CLIENT_ID` aparece no arquivo `.env` da raiz do projeto

---

## Resumo das credenciais

| Credencial | Vem de | Vai para |
|---|---|---|
| Service Account E-mail | JSON baixado → `client_email` | Backend `.env` |
| Service Account Chave | JSON baixado → `private_key` | Backend `.env` |
| ID da Planilha | URL da planilha | Backend `.env` |
| OAuth Client ID | Google Cloud → Credenciais | **Frontend `.env`** |
| Drive Folder ID | URL da pasta no Drive | Backend `.env` |
