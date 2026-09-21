// Explicit import into the local demo database only; never run during startup.
const { readFile, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { shipment, groups } = require('../prisma/step1-example.cjs');

async function main() {
  const credentials = JSON.parse(await readFile(resolve('.local/demo-credentials.json'), 'utf8'));
  const port = Number(process.env.NWTS_DEV_DB_PORT || 55438);
  process.env.DATABASE_URL = `postgresql://nwts_dev:${encodeURIComponent(credentials.secret)}@127.0.0.1:${port}/nwts_dev`;
  const { createPrismaClient } = require('../lib/server/database.cjs');
  const db = createPrismaClient();
  try {
    const admin = await db.userProfile.findUniqueOrThrow({ where: { email: credentials.email } });
    if (!admin.organizationId || admin.role !== 'ADMINISTRATOR') throw new Error('Local demo administrator is required.');
    const organizationId = admin.organizationId;
    const receiptPath = resolve(`.local/step1-import-${port}-${organizationId}.json`);
    const result = await db.$transaction(async tx => {
      // Serialize imports, including the receipt write, to avoid duplicate runs.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(11092026, ${organizationId}::int)`;
      let receipt;
      try { receipt = JSON.parse(await readFile(receiptPath, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (receipt) {
        const existing = await tx.shippingInformation.findFirst({ where: { id: receipt.shipmentId, organizationId } });
        if (!existing) throw new Error('Previously imported shipment is missing; inspect the local Step 1 receipt before importing again.');
        return { ...receipt, created: false };
      }
      const existing = await tx.shippingInformation.findFirst({ where: { organizationId, ...shipment } });
      if (existing) throw new Error('Matching Step 1 shipment already exists; inspect it before importing again.');
      const createdShipment = await tx.shippingInformation.create({ data: { organizationId, ...shipment } });
      const importedGroups = [];
      for (const group of groups) {
        const container = await tx.containerType.create({ data: { organizationId, ...group.container } });
        const waste = await tx.wasteProfile.create({ data: { organizationId, ...group.waste, containerTypeId: container.id } });
        const location = await tx.locationOrigin.create({ data: { organizationId, ...group.location } });
        const profile = await tx.containerProfile.create({ data: {
          organizationId, shippingInformationId: createdShipment.id,
          quantity: group.quantity, locationOriginId: location.id, wasteProfileId: waste.id,
        } });
        importedGroups.push({ sourceProfileId: group.sourceProfileId, profileId: profile.id, containerTypeId: container.id, wasteProfileId: waste.id, locationOriginId: location.id });
      }
      const receiptData = { organizationId, shipmentId: createdShipment.id, sourceShipmentId: '000025', groups: importedGroups };
      // On a failed DB commit this receipt deliberately stops another import for inspection.
      await writeFile(receiptPath, JSON.stringify(receiptData, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      return { ...receiptData, created: true };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
