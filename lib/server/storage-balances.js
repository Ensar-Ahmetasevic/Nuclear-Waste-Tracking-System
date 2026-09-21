import { prisma } from "./scoped-database.cjs";

// Linked completion moves a quantity once. Legacy stored counts are preserved,
// and unlinked transfer records are disclosed instead of added speculatively.
export async function storageBalances() {
  const pre = await prisma.preStorageLocation.findMany({ include: { preStorageEntry: true } });
  const final = await prisma.finalStorageLocation.findMany();
  const completed = await prisma.transferSource.findMany({ where: { state: "completed" } });
  const receipts = await prisma.receiptAllocation.findMany();
  const accepted = await prisma.storageTransferRequest.findMany({ where: { preStorageStatus: "completed", finalStorageStatus: "accepted" }, select: { id: true, finalStorageLocationId: true } });
  const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
  const completedIds = new Set(completed.map(row => row.transferId));
  return {
    pre: pre.map(location => {
      const received = sum(location.preStorageEntry, "quantity");
      const transferred = sum(completed.filter(row => row.locationId === location.id), "quantity");
      const entryIds = new Set(location.preStorageEntry.map(row => row.id));
      const linkedIntake = sum(receipts.filter(row => entryIds.has(row.receiptId)), "quantity");
      return { ...location, inventory: { quantity: Math.max(0, received - transferred), received, transferred, unlinkedQuantity: Math.max(0, received - linkedIntake), inconsistent: transferred > received } };
    }),
    final: final.map(location => {
      const linkedReceived = sum(completed.filter(row => row.destinationId === location.id), "quantity");
      return { ...location, inventory: { quantity: location.quantity + linkedReceived, storedQuantity: location.quantity, linkedReceived, unlinkedTransfers: accepted.filter(row => row.finalStorageLocationId === location.id && !completedIds.has(row.id)).length } };
    }),
  };
}
