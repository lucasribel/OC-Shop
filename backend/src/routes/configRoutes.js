const router = require('express').Router()
const authMiddleware = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/configController')

router.get('/', ctrl.getConfig)
router.put('/', authMiddleware, ctrl.updateConfig)

module.exports = router
