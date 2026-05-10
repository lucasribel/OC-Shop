const { z } = require('zod')

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  picture: z.string().optional(),
  role: z.enum(['user', 'adm', 'super_adm', 'collaborator', 'admin', 'super_admin']).default('user'),
  aiesec: z.string().optional(),
  googleId: z.string().optional(),
  conferenceIds: z.array(z.string()).default([]),
})

const updateUserSchema = createUserSchema.partial()

module.exports = { createUserSchema, updateUserSchema }
