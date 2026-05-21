const { users } = require('../services/sheetsService')
const { createUserSchema, updateUserSchema } = require('../validators/userSchema')

module.exports = {
  async listAll(req, res, next) {
    try {
      res.json(await users.findAll())
    } catch (err) { next(err) }
  },

  async getById(req, res, next) {
    try {
      const user = await users.findById(req.params.id)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      res.json(user)
    } catch (err) { next(err) }
  },

  async getByEmail(req, res, next) {
    try {
      const user = await users.findByEmail(req.params.email)
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      res.json(user)
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const data = createUserSchema.parse(req.body)
      const existing = await users.findByEmail(data.email)
      if (existing) return res.status(409).json({ error: 'Usuário já cadastrado com este e-mail' })
      res.status(201).json(await users.create(data))
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const data = updateUserSchema.parse(req.body)
      res.json(await users.update(req.params.id, data))
    } catch (err) { next(err) }
  },
}
