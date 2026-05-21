const router = require('express').Router()
const authMiddleware = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/userController')

router.get('/', authMiddleware, ctrl.listAll)
router.get('/email/:email', authMiddleware, ctrl.getByEmail)
router.get('/:id', authMiddleware, ctrl.getById)
router.post('/', ctrl.create)
router.put('/:id', authMiddleware, ctrl.update)

module.exports = router
