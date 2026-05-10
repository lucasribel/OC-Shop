const { conferences } = require('../services/sheetsService')
const { createConferenceSchema, updateConferenceSchema } = require('../validators/conferenceSchema')

module.exports = {
  async listAll(req, res, next) {
    try {
      res.json(await conferences.findAll())
    } catch (err) { next(err) }
  },

  async getBySlug(req, res, next) {
    try {
      const conference = await conferences.findBySlug(req.params.slug)
      if (!conference) return res.status(404).json({ error: 'Conferência não encontrada' })
      res.json(conference)
    } catch (err) { next(err) }
  },

  async getById(req, res, next) {
    try {
      const conference = await conferences.findById(req.params.id)
      if (!conference) return res.status(404).json({ error: 'Conferência não encontrada' })
      res.json(conference)
    } catch (err) { next(err) }
  },

  async create(req, res, next) {
    try {
      const data = createConferenceSchema.parse(req.body)
      data.ownerId = req.uid
      res.status(201).json(await conferences.create(data))
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const data = updateConferenceSchema.parse(req.body)
      res.json(await conferences.update(req.params.id, data))
    } catch (err) { next(err) }
  },
}
