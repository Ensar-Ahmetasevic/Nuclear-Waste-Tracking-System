const bcrypt = require('bcryptjs');
const { seedConcept, seedStorage } = require('./seed-concept.cjs');
const concept = require('./concept-data.cjs');
const { createPrismaClient } = require('../lib/server/database.cjs');

const prisma = createPrismaClient();

// Accounts come from SEED_DEMO_ACCOUNTS (scripts/dev-demo.mjs); the people are in concept-data.cjs.
async function localAccounts(admin) {
  for (const account of JSON.parse(process.env.SEED_DEMO_ACCOUNTS || '[]')) {
    const existing = await prisma.userProfile.findUnique({ where: { email: account.email } });
    if (existing) {
      if (existing.organizationId !== admin.organizationId || existing.role !== account.role) throw new Error('Local account conflict; existing account was preserved');
      continue;
    }
    await prisma.userProfile.create({ data: { username: account.username, email: account.email, role: account.role, workArea: account.workArea || null, displayName: account.displayName, password: await bcrypt.hash(account.password, 12), organizationId: admin.organizationId, companyId: admin.companyId, companyName: admin.companyName, address: account.address, administrator: false, active: true } });
  }
}

async function seedRecords(admin) {
  await localAccounts(admin);
  // The shipping employee records the arrival; Supervision adds the Container Profiles.
  const member = where => prisma.userProfile.findFirst({ where: { organizationId: admin.organizationId, active: true, ...where }, orderBy: { id: 'asc' } });
  const shipping = await member({ role: 'EMPLOYEE', workArea: 'SHIPPING' });
  const supervision = await member({ role: 'SUPERVISION' });
  await seedConcept(prisma, admin.organizationId, { arrivalActorId: (shipping || admin).id, preparationActorId: (supervision || admin).id });
  // Each area's employee records the measurements of its halls and rooms.
  const pre = await member({ role: 'EMPLOYEE', workArea: 'PRE_STORAGE' });
  const final = await member({ role: 'EMPLOYEE', workArea: 'FINAL_STORAGE' });
  await seedStorage(prisma, admin.organizationId, { preStorageActorId: (pre || admin).id, finalStorageActorId: (final || admin).id });
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (process.env.NWTS_ALLOW_DEMO_SEED !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['/nwts_dev', '/nwts_test'].includes(url.pathname)) {
    throw new Error('Local seed requires NWTS_ALLOW_DEMO_SEED=1 and a local nwts_dev/nwts_test database.');
  }
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of 12 characters or more (at most 72 UTF-8 bytes).');
  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) {
    if (!existing.organizationId || !existing.active || !existing.administrator) throw new Error('Existing account is not an active local administrator. No data was changed.');
    await seedRecords(existing);
    console.log('Local administrator already exists; existing data and password were preserved.');
    return;
  }
  const { organization, administrator } = concept;
  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.$transaction(async tx => {
    const { id: organizationId } = await tx.organization.create({ data: { name: organization.name } });
    return tx.userProfile.create({ data: { organizationId, email, username: administrator.username, displayName: administrator.displayName, password: hashed, companyId: organization.companyId, companyName: organization.name, address: administrator.address, administrator: true, role: 'ADMINISTRATOR', active: true } });
  });
  await seedRecords(admin);
  console.log('Organization, accounts and Concept doc records created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
