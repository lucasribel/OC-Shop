const { z } = require('zod')

const createConferenceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug deve conter apenas letras minúsculas, números e hífens'),
  aiesec: z.string().min(1),
  active: z.boolean().default(true),
  status: z.enum(['draft', 'open', 'closed']).default('draft'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  orderDeadline: z.string().min(1),
  collaboratorIds: z.array(z.string()).default([]),
})

const updateConferenceSchema = createConferenceSchema.partial()

module.exports = { createConferenceSchema, updateConferenceSchema }
