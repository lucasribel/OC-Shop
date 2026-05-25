const express = require('express')
const multer = require('multer')
const path = require('path')
const { drive, DRIVE_FOLDER_ID } = require('../config/googleDrive')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// Multer em memória (sem salvar em disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.'), false)
    }
  },
})

const DRIVE_ENABLED = !!(DRIVE_FOLDER_ID &&
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
  process.env.GOOGLE_SHEETS_PRIVATE_KEY)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureProductFolder(productSlug, conferenceSlug) {
  if (!DRIVE_ENABLED || !DRIVE_FOLDER_ID) return DRIVE_FOLDER_ID // fallback to root

  // Procura pasta da conferência
  let confFolderId = null
  const confQuery = `'${DRIVE_FOLDER_ID}' in parents and name = '${conferenceSlug}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const confRes = await drive.files.list({ q: confQuery, fields: 'files(id)' })
  if (confRes.data.files?.length) {
    confFolderId = confRes.data.files[0].id
  } else {
    const confFolder = await drive.files.create({
      requestBody: { name: conferenceSlug, mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_FOLDER_ID] },
      fields: 'id',
    })
    confFolderId = confFolder.data.id
  }

  // Procura ou cria pasta 'produtos' dentro da conferência
  const prodQuery = `'${confFolderId}' in parents and name = 'produtos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const prodRes = await drive.files.list({ q: prodQuery, fields: 'files(id)' })
  if (prodRes.data.files?.length) {
    return prodRes.data.files[0].id
  }

  const prodFolder = await drive.files.create({
    requestBody: { name: 'produtos', mimeType: 'application/vnd.google-apps.folder', parents: [confFolderId] },
    fields: 'id',
  })
  return prodFolder.data.id
}

async function ensureBannerFolder(conferenceSlug) {
  if (!DRIVE_ENABLED || !DRIVE_FOLDER_ID) return DRIVE_FOLDER_ID

  let confFolderId = null
  const confQuery = `'${DRIVE_FOLDER_ID}' in parents and name = '${conferenceSlug}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const confRes = await drive.files.list({ q: confQuery, fields: 'files(id)' })
  if (confRes.data.files?.length) {
    confFolderId = confRes.data.files[0].id
  } else {
    const confFolder = await drive.files.create({
      requestBody: { name: conferenceSlug, mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_FOLDER_ID] },
      fields: 'id',
    })
    confFolderId = confFolder.data.id
  }

  const bannerQuery = `'${confFolderId}' in parents and name = 'banner' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const bannerRes = await drive.files.list({ q: bannerQuery, fields: 'files(id)' })
  if (bannerRes.data.files?.length) {
    return bannerRes.data.files[0].id
  }

  const bannerFolder = await drive.files.create({
    requestBody: { name: 'banner', mimeType: 'application/vnd.google-apps.folder', parents: [confFolderId] },
    fields: 'id',
  })
  return bannerFolder.data.id
}

// ---------------------------------------------------------------------------
// POST /upload/product-image
// ---------------------------------------------------------------------------
router.post('/product-image', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    if (!DRIVE_ENABLED) return res.status(503).json({ error: 'Google Drive não configurado no servidor' })

    const { conferenceSlug, productSlug } = req.body
    if (!conferenceSlug || !productSlug) {
      return res.status(400).json({ error: 'conferenceSlug e productSlug são obrigatórios' })
    }

    const ext = path.extname(req.file.originalname) || '.jpg'
    const fileName = `${productSlug}${ext}`

    const folderId = await ensureProductFolder(productSlug, conferenceSlug)

    // Faz upload do arquivo
    const driveFile = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: req.file.mimetype, body: require('stream').Readable.from(req.file.buffer) },
      fields: 'id, webContentLink',
    })

    // Torna público
    await drive.permissions.create({
      fileId: driveFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    const url = `https://drive.google.com/uc?export=view&id=${driveFile.data.id}`

    res.json({ url, fileId: driveFile.data.id })
  } catch (err) { next(err) }
})

// ---------------------------------------------------------------------------
// POST /upload/conference-banner
// ---------------------------------------------------------------------------
router.post('/conference-banner', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    if (!DRIVE_ENABLED) return res.status(503).json({ error: 'Google Drive não configurado no servidor' })

    const { conferenceSlug } = req.body
    if (!conferenceSlug) {
      return res.status(400).json({ error: 'conferenceSlug é obrigatório' })
    }

    const ext = path.extname(req.file.originalname) || '.jpg'
    const folderId = await ensureBannerFolder(conferenceSlug)

    const driveFile = await drive.files.create({
      requestBody: { name: `banner${ext}`, parents: [folderId] },
      media: { mimeType: req.file.mimetype, body: require('stream').Readable.from(req.file.buffer) },
      fields: 'id',
    })

    await drive.permissions.create({
      fileId: driveFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    const url = `https://drive.google.com/uc?export=view&id=${driveFile.data.id}`

    res.json({ url, fileId: driveFile.data.id })
  } catch (err) { next(err) }
})

// ---------------------------------------------------------------------------
// DELETE /upload/:fileId
// ---------------------------------------------------------------------------
router.delete('/:fileId', authMiddleware, async (req, res, next) => {
  try {
    if (!DRIVE_ENABLED) return res.status(503).json({ error: 'Google Drive não configurado' })
    await drive.files.delete({ fileId: req.params.fileId })
    res.status(204).end()
  } catch (err) { next(err) }
})

module.exports = router
