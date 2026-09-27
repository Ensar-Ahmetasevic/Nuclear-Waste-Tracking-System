import { prisma } from "./scoped-database.cjs";
import { storageBalances } from "./storage-balances";
import { HttpError } from "./errors.cjs";

const slots = (row) =>
  row.containerFootprint > 0
    ? Math.floor(row.surfaceArea / row.containerFootprint)
    : 0;
const person = (row) =>
  row ? { id: row.id, name: `${row.name} ${row.surname}`.trim() } : null;

// The four steps of a transfer from its recorded actions and statuses:
// request (Endlager) → approval (Zwischenlager, reserves source receipts) →
// transport (between approval and receipt; no separate dispatch record) →
// receipt (Endlager). Older transfers without actions only have their statuses,
// so their steps carry no time or person.
export function transferSteps(transfer, actions) {
  const last = (names) =>
    [...actions].reverse().find((row) => names.includes(row.action)) || null;
  const requested = last(["TRANSFER_REQUESTED"]);
  const approved = last(["PRE_STORAGE_ACCEPT_REQUEST"]);
  const rejected = last(["PRE_STORAGE_REJECT_REQUEST"]);
  const received = last(["FINAL_STORAGE_ACCEPT_RESPONSE"]);
  const returned = last(["FINAL_STORAGE_REJECT_RESPONSE"]);
  const approvedNow = ["accepted", "completed"].includes(
    transfer.preStorageStatus,
  );
  const done = transfer.finalStorageStatus === "accepted";
  const record = (action) =>
    action
      ? { at: action.createdAt, actorId: action.actorId, actionId: action.id }
      : { at: null, actorId: null, actionId: null };
  const steps = [
    { key: "request", state: "done", ...record(requested) },
    {
      key: "approval",
      state:
        transfer.preStorageStatus === "rejected"
          ? "blocked"
          : approvedNow
            ? "done"
            : "current",
      ...record(
        transfer.preStorageStatus === "rejected"
          ? rejected
          : approvedNow
            ? approved
            : null,
      ),
      reason:
        transfer.preStorageStatus === "rejected"
          ? rejected?.reason || null
          : null,
      // Returned by final storage: approval is open again, with its reason.
      returnedReason:
        transfer.preStorageStatus === "pending" && returned
          ? returned.reason
          : null,
    },
    {
      key: "transport",
      state: done
        ? "done"
        : transfer.finalStorageStatus === "transportPending"
          ? "current"
          : "upcoming",
      at: null,
      actorId: null,
      actionId: null,
    },
    {
      key: "receipt",
      state: done ? "done" : "upcoming",
      ...record(done ? received : null),
    },
  ];
  return {
    steps,
    current: steps.find((step) => step.state !== "done")?.key ?? null,
  };
}

export async function transferDetail(id) {
  const transfer = await prisma.storageTransferRequest.findUnique({
    where: { id },
    include: {
      requestedByEmployee: true,
      approvedByEmployee: true,
      acceptedByEmployee: true,
      finalStorageLocation: true,
    },
  });
  if (!transfer) throw new HttpError(404, "Transfer not found");
  const actions = await prisma.transferAction.findMany({
    where: { transferId: id },
    orderBy: { id: "asc" },
  });
  const sources = await prisma.transferSource.findMany({
    where: { transferId: id },
    orderBy: { id: "asc" },
  });
  const hallIds = [...new Set(sources.map((row) => row.locationId))];
  const halls = hallIds.length
    ? await prisma.preStorageLocation.findMany({
        where: { id: { in: hallIds } },
        select: { id: true, name: true },
      })
    : [];
  const shipmentIds = [...new Set(sources.map((row) => row.shipmentId))];
  const shipments = shipmentIds.length
    ? await prisma.shippingInformation.findMany({
        where: { id: { in: shipmentIds } },
        select: { id: true, companyName: true },
      })
    : [];
  const profileIds = [...new Set(sources.map((row) => row.containerProfileId))];
  const profiles = profileIds.length
    ? await prisma.containerProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, wasteProfile: { select: { name: true } } },
      })
    : [];
  const receipts = sources.length
    ? await prisma.receiptAllocation.findMany({
        where: { id: { in: sources.map((row) => row.receiptAllocationId) } },
        select: { id: true, receiptId: true },
      })
    : [];
  const balances = await storageBalances();
  const room = transfer.finalStorageLocationId
    ? balances.final.find((row) => row.id === transfer.finalStorageLocationId)
    : null;
  const { steps, current } = transferSteps(transfer, actions);
  return {
    transfer: {
      id: transfer.id,
      version: transfer.version,
      createdAt: transfer.createdAt,
      requestedQuantity: transfer.requestedQuantity,
      requestedByRoom: transfer.requestedByRoom,
      finalStorageStatus: transfer.finalStorageStatus,
      preStorageStatus: transfer.preStorageStatus,
      requestedByEmployee: person(transfer.requestedByEmployee),
      approvedByEmployee: person(transfer.approvedByEmployee),
      acceptedByEmployee: person(transfer.acceptedByEmployee),
    },
    destination: transfer.finalStorageLocation
      ? {
          id: transfer.finalStorageLocation.id,
          name: transfer.finalStorageLocation.name,
          containerType: transfer.finalStorageLocation.containerType,
          used: room?.inventory.quantity ?? null,
          slots: slots(transfer.finalStorageLocation),
        }
      : null,
    steps,
    current,
    sources: sources.map((row) => ({
      id: row.id,
      receiptAllocationId: row.receiptAllocationId,
      receiptId:
        receipts.find((item) => item.id === row.receiptAllocationId)
          ?.receiptId ?? null,
      shipmentId: row.shipmentId,
      company:
        shipments.find((item) => item.id === row.shipmentId)?.companyName ??
        null,
      containerProfileId: row.containerProfileId,
      wasteProfile:
        profiles.find((item) => item.id === row.containerProfileId)
          ?.wasteProfile?.name ?? null,
      locationId: row.locationId,
      hall:
        halls.find((item) => item.id === row.locationId)?.name ??
        `#${row.locationId}`,
      quantity: row.quantity,
      state: row.state,
    })),
    events: actions.map((row) => ({
      id: row.id,
      action: row.action,
      at: row.createdAt,
      actorId: row.actorId,
      quantity: row.quantity,
      reason: row.reason,
    })),
  };
}
