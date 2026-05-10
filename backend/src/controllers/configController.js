const { config } = require('../services/sheetsService')
const { updateConfigSchema } = require('../validators/configSchema')

module.exports = {
  async getConfig(req, res, next) {
    try {
      res.json(await config.get())
    } catch (err) { next(err) }
  },

  async updateConfig(req, res, next) {
    try {
      const data = updateConfigSchema.parse(req.body)
      res.json(await config.update(data))
    } catch (err) { next(err) }
  },
}
