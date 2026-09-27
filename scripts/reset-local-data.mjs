// Replaces all records of the local development database with the Concept doc data.
// Run while `npm run dev` is running: npm run db:reset-local -- --yes
// A JSON copy of every table is written to .local/backups first.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { local, readCredentials, conceptCredentials, writeCredentials, writeAccountsTable } from './local-accounts.mjs';

if (!process.argv.includes('--yes')) {
  console.error('This deletes every record in the local nwts_dev database and seeds the Concept doc data. Run again with --yes to continue.');
  process.exit(1);
}
const previous = await readCredentials();
if (!previous) throw new Error('No local database credentials found. Start the local database once with `npm run dev`.');
const port = Number(process.env.NWTS_DEV_DB_PORT || 55438);
const appPort = Number(process.env.NWTS_DEV_PORT || process.env.PORT || 3000);
const databaseUrl = `postgresql://nwts_dev:${encodeURIComponent(previous.secret)}@127.0.0.1:${port}/nwts_dev`;

const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
try { await client.connect(); }
catch { throw new Error(`The local database is not reachable on port ${port}. Start it with \`npm run dev\` first.`); }
try {
  const { rows } = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`);
  const tables = rows.map(row => row.tablename);
  const backup = {};
  for (const table of tables) backup[table] = (await client.query(`SELECT * FROM "${table}" ORDER BY 1`)).rows;
  const backups = resolve(local, 'backups');
  await mkdir(backups, { recursive: true, mode: 0o700 });
  const backupFile = resolve(backups, `nwts_dev-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(backupFile, JSON.stringify(backup, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(`Backup written to ${backupFile}`);
  await client.query(`TRUNCATE ${tables.map(table => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`);
} finally { await client.end(); }

const credentials = conceptCredentials(previous, { replace: true });
await writeCredentials(credentials);
const env = { ...process.env, DATABASE_URL: databaseUrl, NWTS_ALLOW_DEMO_SEED: '1', SEED_ADMIN_EMAIL: credentials.email, SEED_ADMIN_PASSWORD: credentials.password, SEED_DEMO_ACCOUNTS: JSON.stringify(credentials.accounts) };
await new Promise((done, fail) => {
  const child = spawn(process.execPath, ['prisma/seed.js'], { env, stdio: 'inherit' });
  child.once('error', fail);
  child.once('exit', code => code === 0 ? done() : fail(new Error(`Seed failed (${code})`)));
});
await writeAccountsTable(credentials, `http://localhost:${appPort}`);
// Receipts of the former Step 1 import refer to deleted records.
for (const file of await readdir(local)) if (/^step1-import-.*\.json$/.test(file)) await rm(resolve(local, file));
console.log('Local data replaced. Accounts and initial passwords: .local/demo-accounts.md (sign in again).');
