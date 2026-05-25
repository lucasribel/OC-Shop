const admin = require('../config/firebase')

const FIREBASE_ENABLED = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL
)

async function authMiddleware(req, res, next) {
  // Em desenvolvimento sem Firebase, permite todas as requisições
  if (!FIREBASE_ENABLED) {
    req.uid = 'dev-user'
    req.email = 'dev@localhost'
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.uid = decoded.uid
    req.email = decoded.email
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

module.exports = authMiddleware
