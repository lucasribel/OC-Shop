const router = require('express').Router()
const authMiddleware = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/productController')

// GET /api/products?conferenceId=xxx
router.get('/', ctrl.listByConference)
router.get('/:id', ctrl.getById)
router.post('/', authMiddleware, ctrl.create)
router.put('/:id', authMiddleware, ctrl.update)
router.delete('/:id', authMiddleware, ctrl.remove)

module.exports = router
