const admin = require('../config/firebase')
const { users } = require('./sheetsService')

async function verifyToken(token) {
  return admin.auth().verifyIdToken(token)
}

async function findOrCreateUser(decodedToken) {
  const { uid, email, name, picture } = decodedToken

  let user = await users.findByEmail(email)

  if (!user) {
    user = await users.create({
      email,
      name: name || email.split('@')[0],
      picture: picture || '',
      role: 'user',
      googleId: uid,
      conferenceIds: [],
    })
  }

  return user
}

module.exports = { verifyToken, findOrCreateUser }
