import { prisma } from "./scoped-database.cjs";

// Linked completion moves a quantity once. Legacy stored counts are preserved,
// and unlinked transfer records are disclosed instead of added speculatively.
// Administrator-approved corrections to a recorded count are a separate part.
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);

export async function storageBalances() {
  const pre = await prisma.preStorageLocation.findMany({ include: { preStorageEntry: true } });
  const final = await prisma.finalStorageLocation.findMany();
  const completed = await prisma.transferSource.findMany({ where: { state: "completed" } });
  const receipts = await prisma.receiptAllocation.findMany();
  const corrections = await prisma.stockCorrection.findMany({ select: { area: true, locationId: true, delta: true } });
  const corrected = (area, id) => sum(corrections.filter(row => row.area === area && row.locationId === id), "delta");
  const accepted = await prisma.storageTransferRequest.findMany({ where: { preStorageStatus: "completed", finalStorageStatus: "accepted" }, select: { id: true, finalStorageLocationId: true } });
  const completedIds = new Set(completed.map(row => row.transferId));
  return {
    pre: pre.map(location => {
      const received = sum(location.preStorageEntry, "quantity");
      const transferred = sum(completed.filter(row => row.locationId === location.id), "quantity");
      const entryIds = new Set(location.preStorageEntry.map(row => row.id));
      const linkedIntake = sum(receipts.filter(row => entryIds.has(row.receiptId)), "quantity");
      const correction = corrected("PRE_STORAGE", location.id);
      return { ...location, inventory: { quantity: Math.max(0, received - transferred + correction), received, transferred, corrected: correction, unlinkedQuantity: Math.max(0, received - linkedIntake), inconsistent: transferred > received + correction } };
    }),
    final: final.map(location => {
      const linkedReceived = sum(completed.filter(row => row.destinationId === location.id), "quantity");
      const correction = corrected("FINAL_STORAGE", location.id);
      return { ...location, inventory: { quantity: Math.max(0, location.quantity + linkedReceived + correction), storedQuantity: location.quantity, linkedReceived, corrected: correction, unlinkedTransfers: accepted.filter(row => row.finalStorageLocationId === location.id && !completedIds.has(row.id)).length } };
    }),
  };
}

// What a pre-storage hall can still release to new transfer approvals: recorded
// stock (including administrator-approved corrections) minus quantities already
// reserved by approved transfers that final storage has not yet received.
export async function preStorageAvailability() {
  const { pre } = await storageBalances();
  const reserved = await prisma.transferSource.findMany({ where: { state: "reserved" }, select: { locationId: true, quantity: true } });
  return pre.map(location => {
    const held = sum(reserved.filter(row => row.locationId === location.id), "quantity");
    return {
      id: location.id, name: location.name, containerType: location.containerType,
      recorded: location.inventory.quantity, reserved: held, corrected: location.inventory.corrected,
      inconsistent: location.inventory.inconsistent,
      available: location.inventory.inconsistent ? 0 : Math.max(0, location.inventory.quantity - held),
    };
  });
}
