const { AppError } = require('./errors');

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.status).json({ ok: false, error: error.message, details: error.details });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      ok: false,
      error: 'Ya existe un registro con un campo que debe ser único.',
      details: error.keyValue
    });
  }

  if ([20, 251, 263].includes(error?.code) || /Transaction numbers are only allowed/i.test(error?.message || '')) {
    return res.status(503).json({
      ok: false,
      error: 'La eliminación auditada requiere MongoDB Atlas o un replica set con transacciones habilitadas.'
    });
  }

  console.error(error);
  return res.status(500).json({ ok: false, error: 'Error interno del servidor.' });
}

module.exports = { asyncHandler, notFound, errorHandler };
