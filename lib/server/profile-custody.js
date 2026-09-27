import { prisma } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";

const sum = (rows) => rows.reduce((total, row) => total + row.quantity, 0);
const employee = (row) => (row ? `${row.name} ${row.surname}`.trim() : null);

// Chain of custody of one Container Profile (a batch of containers in one
// shipment), built only from recorded events: who, when, where, how many and
// in which state, each with a reference to its record. Steps that have no
// record stay open; nothing is inferred from creation dates.
export async function profileCustody(profileId, { corrections = false } = {}) {
  const profile = await prisma.containerProfile.findUnique({
    where: { id: profileId },
    include: {
      locationOrigin: { select: { name: true } },
      wasteProfile: {
        select: { name: true, containerType: { select: { name: true } } },
      },
      shippingInformation: {
        select: {
          id: true,
          companyName: true,
          registrationPlates: true,
          truckStatus: true,
          entryDateTime: true,
          exitDateTime: true,
        },
      },
    },
  });
  if (!profile) throw new HttpError(404, "Container Profile not found");
  const shipment = profile.shippingInformation;
  const arrival = await prisma.shipmentArrival.findFirst({
    where: { shipmentId: shipment.id },
    orderBy: { id: "asc" },
  });
  // One preparation per profile; the scoped client looks up by id only.
  const preparation = await prisma.containerPreparation.findFirst({
    where: { containerProfileId: profile.id },
  });
  const receipts = await prisma.receiptAllocation.findMany({
    where: { containerProfileId: profile.id },
    orderBy: { id: "asc" },
  });
  const sources = await prisma.transferSource.findMany({
    where: { containerProfileId: profile.id },
    orderBy: { id: "asc" },
  });
  const transferIds = [...new Set(sources.map((row) => row.transferId))];
  const transfers = transferIds.length
    ? await prisma.storageTransferRequest.findMany({
        where: { id: { in: transferIds } },
        include: { requestedByEmployee: true, approvedByEmployee: true },
      })
    : [];
  const actions = transferIds.length
    ? await prisma.transferAction.findMany({
        where: { transferId: { in: transferIds } },
        orderBy: { id: "asc" },
      })
    : [];
  const hallIds = [...new Set(receipts.map((row) => row.locationId))];
  const halls = hallIds.length
    ? await prisma.preStorageLocation.findMany({
        where: { id: { in: hallIds } },
        select: { id: true, name: true },
      })
    : [];
  const roomIds = [...new Set(sources.map((row) => row.destinationId))];
  const rooms = roomIds.length
    ? await prisma.finalStorageLocation.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, name: true },
      })
    : [];
  const employeeIds = [
    ...new Set(
      receipts.map((row) => row.responsibleEmployeeId).filter(Boolean),
    ),
  ];
  const employees = employeeIds.length
    ? await prisma.preStorageResponsibleEmployee.findMany({
        where: { id: { in: employeeIds } },
      })
    : [];
  const legacyIds = [
    ...new Set(receipts.map((row) => row.legacyLinkId).filter(Boolean)),
  ];
  const legacy = legacyIds.length
    ? await prisma.legacyReceiptLink.findMany({
        where: { id: { in: legacyIds } },
      })
    : [];
  const edits = corrections
    ? await prisma.containerCorrection.findMany({
        where: { containerProfileId: profile.id },
        orderBy: { id: "asc" },
      })
    : [];

  const hallName = (id) => halls.find((row) => row.id === id)?.name ?? `#${id}`;
  const roomName = (id) => rooms.find((row) => row.id === id)?.name ?? `#${id}`;
  const rows = [];
  if (arrival)
    rows.push({
      key: `arrival-${arrival.id}`,
      kind: "arrival",
      at: arrival.createdAt,
      actorId: arrival.actorId,
      responsible: null,
      place: { kind: "site", plates: shipment.registrationPlates },
      quantity: null,
      status: "arrived",
      ref: { kind: "arrival", id: arrival.id },
    });
  if (preparation)
    rows.push({
      key: `preparation-${preparation.id}`,
      kind: "prepared",
      at: preparation.createdAt,
      actorId: preparation.actorId,
      responsible: null,
      place: { kind: "site", plates: shipment.registrationPlates },
      quantity: preparation.snapshot?.quantity ?? profile.quantity,
      status: "prepared",
      ref: { kind: "profile", id: profile.id },
    });
  for (const receipt of receipts) {
    const link = legacy.find((row) => row.id === receipt.legacyLinkId);
    rows.push({
      key: `receipt-${receipt.id}`,
      kind: link ? "receiptLinked" : "receipt",
      // A receipt linked afterwards keeps the time of the original receipt.
      at: link ? link.receiptCreatedAt : receipt.createdAt,
      actorId: link ? null : receipt.actorId,
      responsible: employee(
        employees.find((row) => row.id === receipt.responsibleEmployeeId),
      ),
      place: {
        kind: "hall",
        id: receipt.locationId,
        name: hallName(receipt.locationId),
      },
      quantity: receipt.quantity,
      status: "received",
      ref: { kind: "receipt", id: receipt.receiptId },
    });
  }
  for (const source of sources) {
    const transfer = transfers.find((row) => row.id === source.transferId);
    const approval = actions.find((row) => row.id === source.approvalActionId);
    const resolution = actions.find(
      (row) => row.id === source.resolutionActionId,
    );
    const request = actions.find(
      (row) =>
        row.transferId === source.transferId &&
        row.action === "TRANSFER_REQUESTED",
    );
    const route = {
      kind: "route",
      from: hallName(source.locationId),
      to: roomName(source.destinationId),
    };
    if (request && !rows.some((row) => row.key === `request-${request.id}`))
      rows.push({
        key: `request-${request.id}`,
        kind: "transferRequested",
        at: request.createdAt,
        actorId: request.actorId,
        responsible: employee(transfer?.requestedByEmployee),
        place: {
          kind: "room",
          id: source.destinationId,
          name: roomName(source.destinationId),
        },
        quantity: null,
        status: "requested",
        ref: { kind: "transfer", id: source.transferId },
      });
    if (approval)
      rows.push({
        key: `approval-${source.id}`,
        kind: "transferApproved",
        at: approval.createdAt,
        actorId: approval.actorId,
        responsible: employee(transfer?.approvedByEmployee),
        place: route,
        quantity: source.quantity,
        status: "reserved",
        ref: { kind: "transfer", id: source.transferId },
      });
    if (resolution)
      rows.push({
        key: `resolution-${source.id}`,
        kind:
          resolution.action === "FINAL_STORAGE_ACCEPT_RESPONSE"
            ? "finalReceipt"
            : "transferReturned",
        at: resolution.createdAt,
        actorId: resolution.actorId,
        responsible: null,
        place:
          resolution.action === "FINAL_STORAGE_ACCEPT_RESPONSE"
            ? {
                kind: "room",
                id: source.destinationId,
                name: roomName(source.destinationId),
              }
            : route,
        quantity: source.quantity,
        status:
          resolution.action === "FINAL_STORAGE_ACCEPT_RESPONSE"
            ? "final"
            : "returned",
        reason: resolution.reason,
        ref: { kind: "transfer", id: source.transferId },
      });
  }
  for (const edit of edits)
    rows.push({
      key: `correction-${edit.id}`,
      kind: "corrected",
      at: edit.createdAt,
      actorId: edit.actorId,
      responsible: null,
      place: null,
      quantity: edit.after?.quantity ?? null,
      previousQuantity: edit.before?.quantity ?? null,
      status: "corrected",
      reason: edit.reason,
      ref: { kind: "profile", id: profile.id },
    });
  rows.sort(
    (a, b) => new Date(a.at) - new Date(b.at) || a.key.localeCompare(b.key),
  );

  // Where the containers are now, from linked receipts and transfer sources.
  // Hall stock corrections are not assigned to a profile and are not included.
  const received = sum(receipts);
  const byState = (state) => sources.filter((row) => row.state === state);
  const inHall = new Map();
  for (const receipt of receipts)
    inHall.set(
      receipt.locationId,
      (inHall.get(receipt.locationId) || 0) + receipt.quantity,
    );
  for (const source of [...byState("reserved"), ...byState("completed")])
    inHall.set(
      source.locationId,
      (inHall.get(source.locationId) || 0) - source.quantity,
    );
  const group = (rowsIn, keyOf, nameOf) => {
    const map = new Map();
    for (const row of rowsIn)
      map.set(keyOf(row), (map.get(keyOf(row)) || 0) + row.quantity);
    return [...map].map(([id, quantity]) => ({
      id,
      name: nameOf(id),
      quantity,
    }));
  };
  const final = group(
    byState("completed"),
    (row) => row.destinationId,
    roomName,
  );
  const reserved = group(
    byState("reserved"),
    (row) => row.transferId,
    (id) => `#${id}`,
  );
  const location = {
    notReceived: Math.max(0, profile.quantity - received),
    halls: [...inHall]
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ id, name: hallName(id), quantity })),
    reserved,
    final,
  };
  const finalTotal = sum(byState("completed"));
  const reservedTotal = sum(byState("reserved"));
  const stage = (done, active, blocked = false) =>
    blocked ? "blocked" : done ? "done" : active ? "current" : "upcoming";
  const rejected = profile.containerStatus === "rejected" && !received;
  const stages = [
    {
      key: "arrival",
      state: "done",
      at: arrival?.createdAt ?? shipment.entryDateTime,
    },
    { key: "content", state: "done", at: preparation?.createdAt ?? null },
    {
      key: "receipt",
      state: stage(
        received >= profile.quantity && received > 0,
        true,
        rejected,
      ),
      at: receipts.at(-1)?.createdAt ?? null,
      progress: { done: received, total: profile.quantity },
    },
    {
      key: "transfer",
      state: stage(
        received > 0 && finalTotal >= received,
        reservedTotal > 0 || (received >= profile.quantity && received > 0),
      ),
      progress: { done: reservedTotal + finalTotal, total: received },
    },
    {
      key: "final",
      state: stage(received > 0 && finalTotal >= received, finalTotal > 0),
      progress: { done: finalTotal, total: received },
    },
  ];
  // Only the first open stage is current; later ones wait.
  let open = false;
  for (const row of stages) {
    if (row.state === "done") continue;
    if (open && row.state === "current") row.state = "upcoming";
    open = true;
  }
  return {
    profile: {
      id: profile.id,
      quantity: profile.quantity,
      status: profile.containerStatus,
      createdAt: profile.createdAt,
      wasteProfile: profile.wasteProfile?.name ?? null,
      containerType: profile.wasteProfile?.containerType?.name ?? null,
      origin: profile.locationOrigin?.name ?? null,
    },
    shipment: {
      id: shipment.id,
      company: shipment.companyName,
      plates: shipment.registrationPlates,
      truckStatus: shipment.truckStatus,
      arrivedAt: shipment.entryDateTime,
    },
    stages,
    location,
    rows,
    open: {
      receipt: received < profile.quantity && !rejected,
      final: received === 0 || finalTotal < received,
    },
    notes: {
      arrivalMissing: !arrival,
      preparationMissing: !preparation,
      legacyReceipts: legacy.length,
    },
  };
}
