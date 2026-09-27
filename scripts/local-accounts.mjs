// Local login accounts for the embedded development database (.local/demo-credentials.json).
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import concept from '../prisma/concept-data.cjs';

export const local = resolve('.local');
export const credentialsFile = resolve(local, 'demo-credentials.json');
const slot = account => `${account.role}:${account.workArea || ''}`;

export async function readCredentials() {
  try { return JSON.parse(await readFile(credentialsFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Adds the Concept doc people that are missing. With replace, existing accounts take
// the Concept doc identities instead and keep the password of the same role and work area.
export function conceptCredentials(credentials, { replace = false } = {}) {
  const next = credentials
    ? { ...credentials, accounts: [...(credentials.accounts || [])] }
    : { email: concept.administrator.email, password: randomBytes(24).toString('base64url'), secret: randomBytes(32).toString('base64url'), accounts: [] };
  // Files from before work areas were assigned.
  for (const account of next.accounts) if (account.role === 'EMPLOYEE' && !account.workArea) account.workArea = 'SHIPPING';
  if (replace) next.email = concept.administrator.email;
  const previous = new Map(next.accounts.map(account => [slot(account), account]));
  const accounts = replace ? [] : next.accounts;
  for (const person of concept.accounts) {
    const current = previous.get(slot(person));
    if (current && !replace) continue;
    accounts.push({ ...person, password: current?.password || randomBytes(18).toString('base64url') });
  }
  next.accounts = accounts;
  return next;
}

export async function writeCredentials(credentials) {
  await writeFile(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
}

export async function writeAccountsTable(credentials, appUrl) {
  const rows = [
    ['Administrator', concept.administrator.displayName, credentials.email, credentials.password],
    ...credentials.accounts.map(account => [account.role === 'SUPERVISION' ? 'Supervision' : `Employee · ${account.workArea || 'Unassigned'}`, account.displayName || '', account.username, account.password]),
  ];
  await writeFile(resolve(local, 'demo-accounts.md'), '# Local accounts\n\nSign in at ' + appUrl + '/login.\n\n| Level | Name | Username or email | Initial password |\n|---|---|---|---|\n' + rows.map(row => '| ' + row.join(' | ') + ' |').join('\n') + '\n\nThese are initial passwords; changing a password in My account does not update this file. Restarting preserves existing accounts and passwords.\n', { mode: 0o600 });
}
