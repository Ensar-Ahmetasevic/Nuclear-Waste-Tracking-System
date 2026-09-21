const bcrypt = require('bcryptjs');
const { seedConcept } = require('./seed-concept.cjs');
const { createPrismaClient } = require('../lib/server/database.cjs');

const prisma = createPrismaClient();

async function demoAccounts(admin) {
  for (const account of JSON.parse(process.env.SEED_DEMO_ACCOUNTS || '[]')) {
    const existing = await prisma.userProfile.findUnique({ where: { email: account.email } });
    if (existing) {
      if (existing.organizationId !== admin.organizationId || existing.role !== account.role) throw new Error('Demo account conflict; existing account was preserved');
      continue;
    }
    await prisma.userProfile.create({ data: { username: account.username, email: account.email, role: account.role, workArea: account.workArea || null, displayName: account.role === 'SUPERVISION' ? 'Demo Supervisor' : 'Demo Employee', password: await bcrypt.hash(account.password, 12), organizationId: admin.organizationId, companyId: admin.companyId, companyName: admin.companyName, address: 'Demo address', administrator: false, active: true } });
  }
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (process.env.NWTS_ALLOW_DEMO_SEED !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['/nwts_dev', '/nwts_test'].includes(url.pathname)) {
    throw new Error('Demo seed requires NWTS_ALLOW_DEMO_SEED=1 and a local nwts_dev/nwts_test database.');
  }
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password) > 72) throw new Error('Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of 12 characters or more (at most 72 UTF-8 bytes).');
  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) {
    if (!existing.organizationId || !existing.active || !existing.administrator) throw new Error('Existing account is not an active demo administrator. No data was changed.');
    await demoAccounts(existing);
    await seedConcept(prisma, existing.organizationId);
    console.log('Demo account already exists; existing data and password were preserved.');
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    const organization = await tx.organization.create({ data: { name: 'NWTS Demo' } });
    const organizationId = organization.id;
    const admin = await tx.userProfile.create({ data: { organizationId, email, password: hashed, companyId: 1001, companyName: 'NWTS Demo', address: 'Demo address', administrator: true, role: 'ADMINISTRATOR', active: true } });
    const type = await tx.containerType.create({ data: { organizationId, name: 'Demo container', material: 'Demo material', volume: 1, carryingCapacity: 100, radioactivityLevel: 'Demo', physicalProperties: 'Demo only', footprint: 1, description: 'Synthetic test data; not an operational specification.' } });
    const waste = await tx.wasteProfile.create({ data: { organizationId, containerTypeId: type.id, name: 'Demo waste', ...Object.fromEntries(['typeOfWaste','wasteDescription','risksAndHazards','processingMethods','physicalProperties','chemicalProperties','biologicalProperties','collectionProcedures'].map(key => [key,'Synthetic demo data'])) } });
    const origin = await tx.locationOrigin.create({ data: { organizationId, name: 'Demo origin', address: 'Demo address', origin: 'Demo location' } });
    const shipment = await tx.shippingInformation.create({ data: { organizationId, companyName: 'NWTS Demo', driverName: 'Demo driver', registrationPlates: 'DEMO-001', userProfileId: admin.id } });
    await tx.containerProfile.create({ data: { organizationId, quantity: 2, locationOriginId: origin.id, shippingInformationId: shipment.id, wasteProfileId: waste.id } });
    await tx.preStorageLocation.create({ data: { organizationId, name: 'Demo pre-storage', surfaceArea: 100, containerFootprint: 1, preStorageFor: 'Demo', containerType: type.name, wasteProfile: waste.name } });
    await tx.finalStorageLocation.create({ data: { organizationId, name: 'Demo final storage', containerType: type.name, surfaceArea: 100, containerFootprint: 1, depth: 10 } });
    const employee = { organizationId, name: 'Demo', surname: 'Employee', dateOfBirth: new Date('1990-01-01T00:00:00Z'), qualifications: 'Demo only', address: 'Demo address', safetyTraining: false };
    await tx.preStorageResponsibleEmployee.create({ data: employee });
    await tx.finalStorageResponsibleEmployee.create({ data: employee });
  });
  const admin = await prisma.userProfile.findUniqueOrThrow({ where: { email } });
  await demoAccounts(admin);
  await seedConcept(prisma, admin.organizationId);
  console.log('Isolated demo organization and sample records created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
