# Deploy no Cloudflare Pages (gratuito)

## Pré-requisitos

- Conta gratuita em [dash.cloudflare.com](https://dash.cloudflare.com)
- Repositório no GitHub com o projeto
- Backend Express em execução (Railway, Render, Fly.io ou VPS)

---

## 1. Configurar variáveis de ambiente no Cloudflare

Antes do deploy, configure a URL da API:

1. Cloudflare Dashboard → **Workers & Pages** → seu projeto
2. **Settings → Environment variables**
3. Adicione:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://seu-backend.up.railway.app` |

> Sem o protocolo `https://` a chamada de API falha em produção.

---

## 2. Deploy

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Selecione o repositório GitHub
3. Configure o build:

| Campo | Valor |
|---|---|
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | _(deixe em branco)_ |

4. Clique **Save and Deploy**

---

## 3. URL do projeto

Após o deploy (~2 minutos), o site estará disponível em:

```
https://oc-shop.pages.dev
```

---

## 4. Atualizações automáticas

Todo `git push` para a branch principal dispara um novo deploy automaticamente.

---

## 5. Domínio customizado (opcional, gratuito)

1. Pages → seu projeto → **Custom domains**
2. Clique **Set up a custom domain**
3. Siga as instruções de DNS

---

## Build manual (teste local)

```bash
npm run build    # gera pasta dist/
npm run preview  # preview local da build
```
