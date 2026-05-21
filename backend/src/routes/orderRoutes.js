const router = require('express').Router()
const authMiddleware = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/orderController')

// Rotas estáticas antes das dinâmicas para evitar conflito com /:id
// GET /api/orders/buyer?email=xxx&phone=xxx  (público — buscador de pedidos)
router.get('/buyer', ctrl.listByBuyer)

// GET /api/orders?conferenceId=xxx  (admin)
router.get('/', authMiddleware, ctrl.listByConference)

// GET /api/orders/user/:userId  (autenticado)
router.get('/user/:userId', authMiddleware, ctrl.listByUser)

// POST /api/orders  (público — checkout)
router.post('/', ctrl.create)

// PUT /api/orders/:id/status  (admin)
router.put('/:id/status', authMiddleware, ctrl.updateStatus)

module.exports = router
