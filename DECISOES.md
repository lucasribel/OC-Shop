# Decisões de Implementação — AIESEC Shop

Este documento registra decisões de design não cobertas explicitamente nas especificações.

## Repositórios HTTP vs JSON

O seletor em `src/repositories/index.ts` usa `import.meta.env.VITE_API_URL` para decidir:
- Se ausente ou `"mock"` → repositórios JSON locais (desenvolvimento offline)
- Se configurado com URL → repositórios HTTP (backend real)

Isso permite desenvolver sem backend, mas conectar instantaneamente quando configurado.

## Estrutura de pastas no Drive

Pastas são criadas sob demanda durante o primeiro upload:
- `{DRIVE_FOLDER_ID}/{conferenceSlug}/produtos/{productSlug}.jpg`
- `{DRIVE_FOLDER_ID}/{conferenceSlug}/banner/banner.jpg`

A pasta `_sistema/` (backups, exportações) não é criada no setup — apenas quando o primeiro arquivo de cada tipo é gerado.

## Upload de imagens

O componente `ImageUpload.tsx` suporta dois modos:
1. Upload nativo (`<input type="file">`) → envia para `POST /api/upload/product-image`
2. URL externa → input de texto como fallback (comportamento legado)

Em modo mock, o upload é desabilitado e apenas o campo de URL externa funciona.

## Wizard de configuração

O wizard em `SetupWizard.tsx` aparece automaticamente quando `config.setupCompleted === false`.
Após configurado, acessar `/admin/setup` manualmente entra em modo "revisão" com dados pré-preenchidos.

## Reset do sistema

Dois níveis de reset no `ConfigPanel.tsx`:
- **Suave**: reabre o wizard em modo revisão — nenhum dado é apagado
- **Forte**: fluxo de 3 etapas obrigatórias (aviso → checklist → digitar nome) — apenas super_admin

## Backend Drive Upload

O endpoint `POST /api/upload/product-image` aceita `multipart/form-data` com campos:
- `image` (arquivo)
- `conferenceSlug` (string)
- `productSlug` (string)

Cria a estrutura de pastas automaticamente se não existir e retorna `{ url, fileId }`.
