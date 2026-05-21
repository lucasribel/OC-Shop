const { z } = require('zod')

const variantSchema = z.object({
  label: z.string().min(1),
  options: z.array(z.string().min(1)).min(1),
})

const createProductSchema = z.object({
  conferenceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  image: z.string().optional(),
  imageUrl: z.string().default(''),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).default([]),
})

const updateProductSchema = createProductSchema.omit({ conferenceId: true }).partial()

module.exports = { createProductSchema, updateProductSchema }
