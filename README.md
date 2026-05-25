# OC-Shop — Guia de Configuração Completo

> **Não precisa de terminal.** Tudo é feito pelo navegador e pela interface do Google Cloud.
> O wizard de configuração (`/admin/setup`) vai te guiar passo a passo.

---

## Pré-requisitos

- Uma conta Google (pessoal ou da sua AIESEC)
- 20 minutos

---

## PASSO 1 — Criar projeto no Google Cloud

1. Abra **[console.cloud.google.com](https://console.cloud.google.com)** no navegador
2. No topo, clique no seletor de projeto (ao lado de "Google Cloud") → **NOVO PROJETO**
3. Nome: `AIESEC Shop`
4. Clique **CRIAR**. Aguarde 5 segundos.

---

## PASSO 2 — Ativar as APIs necessárias

1. No menu lateral esquerdo: **APIs e serviços** → **Biblioteca**
2. Pesquise e clique em cada uma destas APIs, depois clique **ATIVAR**:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**
   - ⚠️ **Google OAuth API** (se quiser login Google real)

---

## PASSO 3 — Criar credenciais (Service Account)

> A Service Account é um "robô" que o backend usa para ler/escrever na planilha.

1. Menu lateral: **APIs e serviços** → **Credenciais**
2. Clique **+ CRIAR CREDENCIAIS** → **Conta de serviço**
3. Nome: `aiesec-shop-sheets`
4. Clique **CRIAR E CONCLUIR** (ignorar permissões por enquanto)
5. Clique na conta criada na lista
6. Aba **Chaves** → **ADICIONAR CHAVE** → **Criar nova chave** → **JSON**
7. Um arquivo `.json` será baixado. **Abra ele** no Bloco de Notas.
8. Copie estes dois valores:
   - `"client_email"` — parece um e-mail terminado em `iam.gserviceaccount.com`
   - `"private_key"` — começa com `-----BEGIN PRIVATE KEY-----`

---

## PASSO 4 — Criar a planilha

1. Abra **[sheets.google.com](https://sheets.google.com)**
2. Clique **+ Em branco** para criar uma nova planilha
3. Dê o nome: `AIESEC Shop - Produção`
4. Clique em **Compartilhar** (canto superior direito)
5. Cole o e-mail da Service Account (o `client_email` do passo 3)
6. Mude de "Leitor" para **Editor**
7. Clique **Enviar**
8. Olhe a URL do navegador: `https://docs.google.com/spreadsheets/d/XXXXXXX/edit`
   - Copie o `XXXXXXX` — esse é o **ID da planilha**

---

## PASSO 5 — Criar credenciais OAuth (login Google)

> Isso é necessário para o botão "Entrar com Google" funcionar de verdade.

1. Menu lateral: **APIs e serviços** → **Credenciais**
2. Clique **+ CRIAR CREDENCIAIS** → **ID do cliente OAuth**
3. Se pedir para configurar a tela de consentimento:
   - Tipo: **Externo**
   - Preencha: Nome do app = `AIESEC Shop`, E-mail de suporte = seu e-mail
   - Domínios autorizados: deixe vazio
   - Salve e continue
4. Tipo de aplicativo: **Aplicativo da Web**
5. Nome: `AIESEC Shop Frontend`
6. Origens JavaScript autorizadas:
   - `http://localhost:5173` (desenvolvimento)
   - `https://oc-shop.pages.dev` (produção, depois de fazer deploy)
7. URIs de redirecionamento: deixe vazio
8. Clique **CRIAR**
9. Copie o **ID do cliente** (parece `123456789-xxxxx.apps.googleusercontent.com`)

---

## PASSO 6 — Abrir o wizard de configuração

1. Rode o sistema: `npm run dev` e `cd backend && npm run dev`
2. Acesse `http://localhost:5173/admin/setup`
3. O wizard vai pedir cada valor nos passos certos.
4. Cole as credenciais nos campos e clique **Salvar** em cada etapa.

---

## Resumo do que você precisa ter em mãos

| Campo | Onde encontrar | Exemplo |
|---|---|---|
| Planilha ID | URL da planilha | `1a2b3c4d5e6f...` |
| Service Account E-mail | Arquivo JSON, campo `client_email` | `aiesec-shop-sheets@...iam.gserviceaccount.com` |
| Service Account Chave | Arquivo JSON, campo `private_key` | `-----BEGIN PRIVATE KEY-----\n...` |
| OAuth Client ID | Google Cloud → Credenciais | `123456789-xxxxx.apps.googleusercontent.com` |
