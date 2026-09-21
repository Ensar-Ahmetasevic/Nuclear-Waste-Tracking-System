import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
export const GET = withApiAuth(async () => {
  const receipts = await prisma.receiptAllocation.findMany({ orderBy: { id: "desc" } });
  const allocations = await prisma.transferSource.findMany({ where: { state: { in: ["reserved", "completed"] } } });
  const entries = await prisma.preStorageEntry.findMany({ select: { id: true } });
  const existing = new Set(entries.map(row => row.id));
  const used = new Map();
  for (const row of allocations) used.set(row.receiptAllocationId, (used.get(row.receiptAllocationId) || 0) + row.quantity);
  const sources = receipts.filter(row => existing.has(row.receiptId)).map(row => ({ id: row.id, receiptId: row.receiptId, shipmentId: row.shipmentId, containerProfileId: row.containerProfileId, locationId: row.locationId, quantity: row.quantity, available: row.quantity - (used.get(row.id) || 0) })).filter(row => row.available > 0);
  return Response.json({ sources });
});
export const dynamic = "force-dynamic";
