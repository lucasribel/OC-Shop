const { z } = require('zod')

const updateConfigSchema = z.object({
  mode: z.enum(['open', 'closed']).optional(),
  allowedAdminDomain: z.string().nullable().optional(),
  setupCompleted: z.boolean().optional(),
  aiesecName: z.string().optional(),
  pixKey: z.string().optional(),
  pixName: z.string().optional(),
  pixInstructions: z.string().optional(),
  spreadsheetId: z.string().optional(),
  spreadsheetUrl: z.string().optional(),
  driveFolderId: z.string().optional(),
  driveFolderUrl: z.string().optional(),
})

module.exports = { updateConfigSchema }
