import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const local = resolve('.local');
await mkdir(local, { recursive: true, mode: 0o700 });
const credentialsFile = resolve(local, 'demo-credentials.json');
let credentials;
try { credentials = JSON.parse(await readFile(credentialsFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  credentials = { email: 'admin@nwts.example', password: randomBytes(24).toString('base64url'), secret: randomBytes(32).toString('base64url') };
  await writeFile(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
const port = Number(process.env.NWTS_DEV_DB_PORT || 55438);
const directory = resolve(local, 'postgres');
const postgres = new EmbeddedPostgres({ databaseDir: directory, user: 'nwts_dev', password: credentials.secret, port, persistent: true, postgresFlags: ['-h','127.0.0.1','-k',local], onLog: message => { if (/FATAL|ERROR/.test(String(message))) console.error(message); } });
let child, started = false, stopping = false, cleanupPromise;
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
  try { await access(resolve(directory,'PG_VERSION')); } catch { await postgres.initialise(); }
  await postgres.start(); started = true;
  const client = postgres.getPgClient();
  await client.connect();
  try { if (!(await client.query("SELECT 1 FROM pg_database WHERE datname='nwts_dev'")).rowCount) await postgres.createDatabase('nwts_dev'); }
  finally { await client.end(); }
  const env = { ...process.env, DATABASE_URL: `postgresql://nwts_dev:${credentials.secret}@127.0.0.1:${port}/nwts_dev`, NEXTAUTH_URL: 'http://localhost:3000', NEXTAUTH_SECRET: credentials.secret, SEED_ADMIN_EMAIL: credentials.email, SEED_ADMIN_PASSWORD: credentials.password, NWTS_ALLOW_DEMO_SEED: '1' };
  const run = args => new Promise((resolve,reject) => { child = spawn(process.execPath,args,{env,stdio:'inherit'}); child.once('error',reject); child.once('exit',code => code === 0 || stopping ? resolve() : reject(new Error(`Command failed (${code}): ${args[0]}`))); });
  await run(['node_modules/prisma/build/index.js','generate']);
  await run(['node_modules/prisma/build/index.js','migrate','deploy']);
  await run(['prisma/seed.js']);
  console.log('Demo app: http://localhost:3000 — local login details are in .local/demo-credentials.json');
  await run(['node_modules/next/dist/bin/next','dev','-H','127.0.0.1']);
} catch(error) { console.error('Demo startup failed:',error); process.exitCode=1; }
finally { await cleanup(); }
process.exit(process.exitCode || 0);
