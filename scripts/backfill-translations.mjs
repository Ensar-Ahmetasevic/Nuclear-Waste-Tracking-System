// Adds the German translation to everything people wrote that does not have one
// yet: records from before AI translation existed, and saves made while the AI
// service was unavailable. Safe to run again; translated texts are skipped.
// Usage: npm run texts:backfill (needs DATABASE_URL and XAI_API_KEY).
import dbModule from "../lib/server/database.cjs";
import { aiConfigured } from "../lib/server/ai-text.js";
import { ensureTranslations } from "../lib/server/text-translations.js";

const { database } = dbModule;
// Every free-text field: model → fields (StockCorrection.report holds sections).
const SOURCES = {
  receiptRejection: ["note"],
  returnAction: ["note"],
  hallAlert: ["resolveNote"],
  hallAlertEntry: ["text"],
  transferAction: ["reason"],
  containerPreparation: ["reason"],
  containerCorrection: ["reason"],
  containerRemoval: ["reason"],
  shipmentRemoval: ["reason"],
  shippingCorrection: ["reason"],
  accountChange: ["reason"],
  definitionChange: ["reason"],
  monitoringRule: ["reason", "approvalReference"],
  stockVerification: ["reason"],
  legacyReceiptLink: ["reason"],
  stockCorrection: ["reason", "report"],
};
const CHUNK = 200;

if (!aiConfigured()) {
  console.error("XAI_API_KEY is not set; nothing was translated.");
  process.exit(1);
}
try {
  const byOrganization = new Map();
  for (const [model, fields] of Object.entries(SOURCES)) {
    const rows = await database[model].findMany({
      select: { organizationId: true, ...Object.fromEntries(fields.map((field) => [field, true])) },
    });
    for (const row of rows) {
      const texts = byOrganization.get(row.organizationId) || new Set();
      for (const field of fields) {
        const value = row[field];
        for (const text of value && typeof value === "object" ? Object.values(value) : [value])
          if (typeof text === "string" && text.trim()) texts.add(text.trim());
      }
      byOrganization.set(row.organizationId, texts);
    }
  }
  for (const [organizationId, texts] of byOrganization) {
    const all = [...texts];
    let done = 0;
    for (let start = 0; start < all.length; start += CHUNK)
      done += (await ensureTranslations(organizationId, all.slice(start, start + CHUNK), "de")).size;
    console.log(`Organization ${organizationId}: ${done} of ${all.length} texts have German.`);
  }
} finally {
  await database.$disconnect();
}
