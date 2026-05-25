# Organização do Google Drive

---

## Estrutura de pastas

Crie esta estrutura no Google Drive do responsável:

```
📁 AIESEC Shop - Assets
├── 📁 imagens-produtos
│   ├── kit-delegado.jpg
│   ├── hoodie-oficial.jpg
│   ├── caneca.jpg
│   └── ...
└── 📁 config
    └── (backups e arquivos de referência)
```

---

## Como tornar imagens públicas

1. Faça upload da imagem para a pasta `imagens-produtos`
2. Clique com botão direito na imagem → **Compartilhar → Compartilhar**
3. Altere para **"Qualquer pessoa com o link"** pode **ver**
4. Copie o link
5. Converta para link direto:

| Tipo | Formato |
|---|---|
| Link normal | `https://drive.google.com/file/d/FILE_ID/view` |
| Link direto | `https://drive.google.com/uc?export=view&id=FILE_ID` |
| Link direto (alta qualidade) | `https://lh3.googleusercontent.com/d/FILE_ID` |

6. Cole o link direto no campo **imagem_url** do produto (via admin)

---

## ID da pasta para o backend

1. Abra a pasta `AIESEC Shop - Assets` no Google Drive
2. A URL será:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID
   ```
3. Copie o `FOLDER_ID`
4. Cole no `backend/.env` → `DRIVE_FOLDER_ID=FOLDER_ID`

---

## Script auxiliar

Liste arquivos de uma pasta do Drive:

```bash
cd backend
node scripts/list-drive-files.js
```

> Requer `DRIVE_FOLDER_ID` configurado no `.env` do backend.
