const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create PrismaClient');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  // Keep the pool reachable for shutdown; disconnect closes Prisma, then the pool.
  client.$pool = pool;
  const disconnect = client.$disconnect.bind(client);
  client.$disconnect = async () => {
    await disconnect();
    await pool.end().catch(() => {});
  };
  return client;
}

function getDatabase() {
  if (!globalThis.__nwtsDatabase) {
    globalThis.__nwtsDatabase = createPrismaClient();
  }
  return globalThis.__nwtsDatabase;
}

module.exports = {
  get database() {
    return getDatabase();
  },
  createPrismaClient,
};
