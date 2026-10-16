const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRouter = require('./routes/api');
const { notFound, errorHandler } = require('./middleware');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/api/salud', (req, res) => {
    res.status(200).json({ ok: true, servicio: 'Magic Film API', estado: 'disponible' });
  });

  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
