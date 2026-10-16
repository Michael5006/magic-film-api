const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  port: Number(process.env.PORT || 3000),
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || 'magic_film'
};

function validateConfig() {
  if (!config.mongodbUri) {
    throw new Error('Falta MONGODB_URI. Copia .env.example como .env y configura la conexión.');
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT debe ser un número entre 1 y 65535.');
  }
}

module.exports = { config, validateConfig };
