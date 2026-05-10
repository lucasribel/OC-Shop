const { z } = require('zod')

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  selectedVariants: z.record(z.string()).default({}),
})

const createOrderSchema = z.object({
  conferenceId: z.string().min(1),
  conferenceSlug: z.string().min(1),
  userId: z.string().default(''),
  userName: z.string().default(''),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().default(''),
  items: z.array(orderItemSchema).min(1),
  total: z.number().positive(),
})

const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
})

module.exports = { createOrderSchema, updateOrderStatusSchema }
