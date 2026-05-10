function errorHandler(err, req, res, next) {
  console.error(err)

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Dados inválidos', issues: err.errors })
  }

  const status = err.status || 500
  const message = err.message || 'Erro interno do servidor'
  res.status(status).json({ error: message })
}

module.exports = errorHandler
