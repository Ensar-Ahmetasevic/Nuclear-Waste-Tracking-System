import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { local, readCredentials, conceptCredentials, writeCredentials, writeAccountsTable } from './local-accounts.mjs';
await mkdir(local, { recursive: true, mode: 0o700 });
const credentials = conceptCredentials(await readCredentials());
await writeCredentials(credentials);
const port = Number(process.env.NWTS_DEV_DB_PORT || 55438);
const appPort = Number(process.env.NWTS_DEV_PORT || process.env.PORT || 3000);
if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65535) throw new Error("Invalid NWTS_DEV_PORT");
const appUrl = `http://localhost:${appPort}`;
const directory = resolve(local, 'postgres');
const postgres = new EmbeddedPostgres({ databaseDir: directory, user: 'nwts_dev', password: credentials.secret, port, persistent: true, postgresFlags: ['-h','127.0.0.1','-k',local], onLog: message => { if (/FATAL|ERROR/.test(String(message))) console.error(message); } });
let child, started = false, stopping = false, cleanupPromise;
// A second dev server (another port or preview) reuses the demo database that is
// already running instead of starting, migrating and seeding it again.
async function databaseRunning() {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ host: '127.0.0.1', port, user: 'nwts_dev', password: credentials.secret, database: 'nwts_dev', connectionTimeoutMillis: 1500 });
  try { await client.connect(); return true; } catch { return false; } finally { await client.end().catch(() => {}); }
}
const shared = await databaseRunning();
function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  stopping = true;
  cleanupPromise = (async () => {
    if (child?.exitCode === null && !child.signalCode) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exited; }
    if (started) { started = false; await postgres.stop(); }
  })();
  return cleanupPromise;
}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await cleanup(); process.exit(0); });
try {
  if (!shared) {
    try { await access(resolve(directory,'PG_VERSION')); } catch { await postgres.initialise(); }
    await postgres.start(); started = true;
    const client = postgres.getPgClient();
    await client.connect();
    try { if (!(await client.query("SELECT 1 FROM pg_database WHERE datname='nwts_dev'")).rowCount) await postgres.createDatabase('nwts_dev'); }
    finally { await client.end(); }
  }
  const env = { ...process.env, ...(shared && { NWTS_DIST_DIR: ".next-shared" }), DATABASE_URL: `postgresql://nwts_dev:${credentials.secret}@127.0.0.1:${port}/nwts_dev`, NEXTAUTH_URL: appUrl, NEXTAUTH_SECRET: credentials.secret, SEED_ADMIN_EMAIL: credentials.email, SEED_ADMIN_PASSWORD: credentials.password, NWTS_ALLOW_DEMO_SEED: '1', SEED_DEMO_ACCOUNTS: JSON.stringify(credentials.accounts) };
  const run = args => new Promise((resolve,reject) => { child = spawn(process.execPath,args,{env,stdio:'inherit'}); child.once('error',reject); child.once('exit',code => code === 0 || stopping ? resolve() : reject(new Error(`Command failed (${code}): ${args[0]}`))); });
  if (shared) console.log(`Demo database already running; reusing it for ${appUrl}.`);
  else {
    await run(['node_modules/prisma/build/index.js','generate']);
    await run(['scripts/generate-schema-field-meta.cjs']);
    await run(['node_modules/prisma/build/index.js','migrate','deploy']);
    await run(['prisma/seed.js']);
    await writeAccountsTable(credentials, appUrl);
    console.log(`Demo app: ${appUrl} — local login details are in .local/demo-credentials.json`);
  }
  await run(['node_modules/next/dist/bin/next','dev','-H','127.0.0.1','-p',String(appPort)]);
} catch(error) { console.error('Demo startup failed:',error); process.exitCode=1; }
finally { await cleanup(); }
process.exit(process.exitCode || 0);
