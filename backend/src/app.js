const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const errorHandler = require('./middlewares/errorHandler')
const healthRoutes = require('./routes/healthRoutes')
const conferenceRoutes = require('./routes/conferenceRoutes')
const productRoutes = require('./routes/productRoutes')
const orderRoutes = require('./routes/orderRoutes')
const userRoutes = require('./routes/userRoutes')
const configRoutes = require('./routes/configRoutes')
const uploadRoutes = require('./routes/upload')
const setupRoutes = require('./routes/setupRoutes')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.use('/api/health', healthRoutes)
app.use('/api/conferences', conferenceRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)
app.use('/api/config', configRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/setup', setupRoutes)

app.use(errorHandler)

module.exports = app
