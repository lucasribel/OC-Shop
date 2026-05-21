const { products } = require('../services/sheetsService')
const { createProductSchema, updateProductSchema } = require('../validators/productSchema')

module.exports = {
  async listByConference(req, res, next) {
    try {
      const { conferenceId } = req.query
      if (!conferenceId) return res.status(400).json({ error: 'conferenceId é obrigatório' })
      res.json(await products.findByConference(conferenceId))
    } catch (err) { next(err) }
  },

  async getById(req, res, next) {
    try {
      const product = await products.findById(req.params.id)
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' })
      res.json(product)
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const data = createProductSchema.parse(req.body)
      res.status(201).json(await products.create(data))
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const data = updateProductSchema.parse(req.body)
      res.json(await products.update(req.params.id, data))
    } catch (err) { next(err) }
  },

  async remove(req, res, next) {
    try {
      await products.delete(req.params.id)
      res.status(204).end()
    } catch (err) { next(err) }
  },
}
