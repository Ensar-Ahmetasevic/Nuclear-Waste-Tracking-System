import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'nwts-test-'));
const port = Number(process.env.NWTS_TEST_DB_PORT || 55439);
const postgres = new EmbeddedPostgres({ databaseDir: join(directory, 'postgres'), user: 'nwts_test', password: 'local-test-only', port, persistent: false, postgresFlags: ['-h', '127.0.0.1', '-k', directory], onLog: message => { if (/FATAL|ERROR|could not/i.test(String(message))) console.error(message); }, onError: message => { if (/FATAL|ERROR/.test(String(message))) console.error(message); } });
let child;
let started = false;
const cleanup = async () => { child?.kill('SIGTERM'); if (started) { started = false; await postgres.stop(); } };
process.once('SIGTERM', async () => { await cleanup(); process.exit(143); });
process.once('SIGINT', async () => { await cleanup(); process.exit(130); });
try {
  await postgres.initialise();
  await postgres.start();
  started = true;
  await postgres.createDatabase('nwts_test');
  const env = { ...process.env, DATABASE_URL: `postgresql://nwts_test:local-test-only@127.0.0.1:${port}/nwts_test`, NWTS_ISOLATED_TEST: '1', NEXTAUTH_URL: 'http://127.0.0.1:3109', NEXTAUTH_SECRET: 'isolated-test-secret-not-for-deployment' };
  const run = (command, args) => new Promise((resolve, reject) => {
    child = spawn(command, args, { env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'generate']);
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  await run(process.execPath, ['--test', '--test-isolation=none', '--test-concurrency=1', 'tests/integration.test.cjs']);
} catch (error) { console.error('Integration test setup failed:', error || 'PostgreSQL could not start'); process.exitCode = 1; } finally { await cleanup(); }

process.exit(process.exitCode || 0);
