const { MongoClient } = require('mongodb');
const { config } = require('./config');

let client;
let database;

async function connectDatabase() {
  if (database) return database;
  client = new MongoClient(config.mongodbUri);
  await client.connect();
  database = client.db(config.mongodbDb);
  await database.command({ ping: 1 });
  return database;
}

function getDb() {
  if (!database) throw new Error('La base de datos aún no está conectada.');
  return database;
}

function getClient() {
  if (!client) throw new Error('El cliente de MongoDB aún no está conectado.');
  return client;
}

async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}

module.exports = { connectDatabase, getDb, getClient, closeDatabase };
