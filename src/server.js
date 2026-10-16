const { createApp } = require('./app');
const { config, validateConfig } = require('./config');
const { connectDatabase, closeDatabase } = require('./db');

let server;

async function start() {
  validateConfig();
  await connectDatabase();
  server = createApp().listen(config.port, () => {
    console.log(`Magic Film API disponible en http://localhost:${config.port}`);
  });
}

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando Magic Film API...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error(`No fue posible iniciar la API: ${error.message}`);
  process.exit(1);
});
