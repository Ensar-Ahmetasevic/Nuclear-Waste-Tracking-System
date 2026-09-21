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
if (!credentials.accounts) {
  credentials.accounts = [
    { username: 'supervision', email: 'supervision@nwts.example', role: 'SUPERVISION', password: randomBytes(18).toString('base64url') },
    { username: 'employee', email: 'employee@nwts.example', role: 'EMPLOYEE', password: randomBytes(18).toString('base64url') },
  ];
  await writeFile(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
}
for (const [username, workArea] of [['employee-pre-storage','PRE_STORAGE'],['employee-final-storage','FINAL_STORAGE']]) {
  if (!credentials.accounts.some(account => account.username === username)) credentials.accounts.push({ username, email: `${username}@nwts.example`, role: 'EMPLOYEE', workArea, password: randomBytes(18).toString('base64url') });
}
const shippingEmployee = credentials.accounts.find(account => account.username === 'employee');
if (shippingEmployee && !shippingEmployee.workArea) shippingEmployee.workArea = 'SHIPPING';
await writeFile(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
const port = Number(process.env.NWTS_DEV_DB_PORT || 55438);
const appPort = Number(process.env.NWTS_DEV_PORT || 3000);
if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65535) throw new Error("Invalid NWTS_DEV_PORT");
const appUrl = `http://localhost:${appPort}`;
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
  const env = { ...process.env, DATABASE_URL: `postgresql://nwts_dev:${credentials.secret}@127.0.0.1:${port}/nwts_dev`, NEXTAUTH_URL: appUrl, NEXTAUTH_SECRET: credentials.secret, SEED_ADMIN_EMAIL: credentials.email, SEED_ADMIN_PASSWORD: credentials.password, NWTS_ALLOW_DEMO_SEED: '1', SEED_DEMO_ACCOUNTS: JSON.stringify(credentials.accounts) };
  const run = args => new Promise((resolve,reject) => { child = spawn(process.execPath,args,{env,stdio:'inherit'}); child.once('error',reject); child.once('exit',code => code === 0 || stopping ? resolve() : reject(new Error(`Command failed (${code}): ${args[0]}`))); });
  await run(['node_modules/prisma/build/index.js','generate']);
  await run(['node_modules/prisma/build/index.js','migrate','deploy']);
  await run(['prisma/seed.js']);
  const demoRows = [
    ['Administrator', credentials.email, credentials.password],
    ...credentials.accounts.map(account => [account.role === 'SUPERVISION' ? 'Supervision' : `Employee · ${account.workArea || 'Unassigned'}`, account.username, account.password]),
  ];
  await writeFile(resolve(local, 'demo-accounts.md'), '# Local demo accounts\n\nSign in at ' + appUrl + '/login.\n\n| Level | Username or email | Initial password |\n|---|---|---|\n' + demoRows.map(row => '| ' + row.join(' | ') + ' |').join('\n') + '\n\nThese are initial passwords; changing a password in My account does not update this file. Restarting preserves existing accounts and passwords.\n', { mode: 0o600 });
  console.log(`Demo app: ${appUrl} — local login details are in .local/demo-credentials.json`);
  await run(['node_modules/next/dist/bin/next','dev','-H','127.0.0.1','-p',String(appPort)]);
} catch(error) { console.error('Demo startup failed:',error); process.exitCode=1; }
finally { await cleanup(); }
process.exit(process.exitCode || 0);
