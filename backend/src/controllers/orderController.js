const { orders, products, conferences } = require('../services/sheetsService')
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/orderSchema')

module.exports = {
  async listByConference(req, res, next) {
    try {
      const { conferenceId } = req.query
      if (!conferenceId) return res.status(400).json({ error: 'conferenceId é obrigatório' })
      res.json(await orders.findByConference(conferenceId))
    } catch (err) { next(err) }
  },

  async listByUser(req, res, next) {
    try {
      res.json(await orders.findByUserId(req.params.userId))
    } catch (err) { next(err) }
  },

  async listByBuyer(req, res, next) {
    try {
      const { email, phone } = req.query
      if (!email && !phone) return res.status(400).json({ error: 'email ou phone é obrigatório' })
      res.json(await orders.findByBuyer(email, phone))
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const data = createOrderSchema.parse(req.body)

      const conference = await conferences.findById(data.conferenceId)
      if (!conference) return res.status(404).json({ error: 'Conferência não encontrada' })
      if (conference.status !== 'open') return res.status(400).json({ error: 'A loja está fechada para esta conferência' })

      const duplicate = await orders.findActiveByBuyerAndConference(data.buyerEmail, data.conferenceId)
      if (duplicate) return res.status(400).json({ error: 'Você já possui um pedido ativo para esta conferência' })

      for (const item of data.items) {
        const product = await products.findById(item.productId)
        if (!product) return res.status(404).json({ error: `Produto ${item.productName} não encontrado` })
        if (product.stock < item.quantity) return res.status(400).json({ error: `Estoque insuficiente para ${item.productName}` })
      }

      const order = await orders.create({ ...data, conferenceSlug: conference.slug, status: 'pending' })

      for (const item of data.items) {
        const product = await products.findById(item.productId)
        if (product) await products.update(item.productId, { stock: product.stock - item.quantity })
      }

      res.status(201).json(order)
    } catch (err) { next(err) }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = updateOrderStatusSchema.parse(req.body)
      res.json(await orders.updateStatus(req.params.id, status))
    } catch (err) { next(err) }
  },
}
