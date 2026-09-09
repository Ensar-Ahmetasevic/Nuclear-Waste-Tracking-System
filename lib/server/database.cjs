const { PrismaClient } = require('@prisma/client');

const database = globalThis.__nwtsDatabase || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__nwtsDatabase = database;

module.exports = { database };
