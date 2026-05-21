const { z } = require('zod')

const updateConfigSchema = z.object({
  mode: z.enum(['open', 'closed']).optional(),
  allowedAdminDomain: z.string().nullable().optional(),
  setupCompleted: z.boolean().optional(),
})

module.exports = { updateConfigSchema }
