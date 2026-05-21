const router = require('express').Router()
const authMiddleware = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/conferenceController')

router.get('/', ctrl.listAll)
router.get('/slug/:slug', ctrl.getBySlug)
router.get('/:id', ctrl.getById)
router.post('/', authMiddleware, ctrl.create)
router.put('/:id', authMiddleware, ctrl.update)

module.exports = router
