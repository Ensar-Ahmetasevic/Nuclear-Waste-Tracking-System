import { storageBalances } from "@/lib/server/storage-balances";
import { createHash } from "node:crypto";
import { HttpError } from "@/lib/server/errors.cjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating new request to pre-storage

async function POSTHandler(req, { user }) {
  const {
    requestedQuantity,
    requestedByRoom,
    requestedByEmployeeId,
    finalStorageLocationId,
    actionKey,
  } = await req.json();
  if (
    !Number.isSafeInteger(requestedQuantity) ||
    requestedQuantity <= 0 ||
    !requestedByEmployeeId ||
    !finalStorageLocationId ||
    typeof requestedByRoom !== "string"
  )
    throw new HttpError(
      400,
      "A positive quantity, destination and responsible employee are required",
    );
  if (
    typeof actionKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      actionKey,
    )
  )
    throw new HttpError(400, "A valid request reference is required");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        requestedQuantity,
        requestedByRoom,
        requestedByEmployeeId,
        finalStorageLocationId,
        actorId: user.id,
        action: "TRANSFER_REQUESTED",
      }),
    )
    .digest("hex");
  const previous = await prisma.transferAction.findFirst({
    where: { actionKey },
  });
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new HttpError(
        409,
        "This request reference belongs to different data",
      );
    return NextResponse.json({
      transferId: previous.transferId,
      result: previous,
      replayed: true,
    });
  }
  const room = await prisma.finalStorageLocation.findUniqueOrThrow({
    where: { id: finalStorageLocationId },
  });
  if (room.name !== requestedByRoom)
    throw new HttpError(
      409,
      "Destination changed. Reload and review the room before sending.",
    );
  const created = await prisma.storageTransferRequest.create({
    data: {
      requestedQuantity,
      requestedByRoom: room.name,
      requestedByEmployeeId,
      finalStorageLocationId,
    },
  });
  const result = await prisma.transferAction.create({
    data: {
      transferId: created.id,
      action: "TRANSFER_REQUESTED",
      quantity: created.requestedQuantity,
      actorId: user.id,
      actionKey,
      fingerprint,
    },
  });
  return NextResponse.json({ transferId: created.id, result });
}

// Fetch data

async function GETHandler() {
  {
    const finalStorageTransverRequestData =
      await prisma.storageTransferRequest.findMany({
        orderBy: {
          id: "desc",
        },
      });

    if (finalStorageTransverRequestData.length === 0) {
      return NextResponse.json(
        {
          finalStorageTransverRequestData: [],
          message: "No requests to pre-storage data available.",
        },
        { status: 200 }, // No Content
      );
    }

    return NextResponse.json(
      {
        finalStorageTransverRequestData,
        message: "Requests to pre-storage data fetched successfully",
      },
      { status: 200 },
    );
  }
}

async function PUTHandler(req, { user }) {
  const { operationType, data } = await req.json();
  const finalAction = [
    "FINAL_STORAGE_ACCEPT_RESPONSE",
    "FINAL_STORAGE_REJECT_RESPONSE",
  ].includes(operationType);
  const preAction = [
    "PRE_STORAGE_ACCEPT_REQUEST",
    "PRE_STORAGE_REJECT_REQUEST",
  ].includes(operationType);
  if (!finalAction && !preAction)
    throw new HttpError(400, "Invalid operation type");
  let fingerprint;
  let selectedSources;
  if (operationType === "PRE_STORAGE_ACCEPT_REQUEST" && data.sources !== undefined) {
    if (data.receiptAllocationId !== undefined || !Array.isArray(data.sources) || !data.sources.length || data.sources.length > 100)
      throw new HttpError(400, "Select between 1 and 100 source receipts using one source format");
    selectedSources = data.sources.map(row => {
      if (!row || !Number.isSafeInteger(row.receiptAllocationId) || row.receiptAllocationId <= 0 || !Number.isSafeInteger(row.quantity) || row.quantity <= 0 || row.quantity > 2147483647)
        throw new HttpError(400, "Each source requires a receipt and a positive whole quantity");
      return { receiptAllocationId: row.receiptAllocationId, quantity: row.quantity };
    }).sort((a, b) => a.receiptAllocationId - b.receiptAllocationId);
    const total = selectedSources.reduce((sum, row) => sum + row.quantity, 0);
    if (new Set(selectedSources.map(row => row.receiptAllocationId)).size !== selectedSources.length)
      throw new HttpError(400, "Select each source receipt only once");
    if (total > 2147483647 || total !== data.requestedQuantity)
      throw new HttpError(400, "Approved quantity must equal the sum of the source quantities");
  }
  const reason =
    ["FINAL_STORAGE_REJECT_RESPONSE", "PRE_STORAGE_REJECT_REQUEST"].includes(
      operationType,
    ) && typeof data.reason === "string"
      ? data.reason.trim()
      : null;
  if (finalAction || preAction) {
    if (
      typeof data.actionKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        data.actionKey,
      ) ||
      !Number.isSafeInteger(data.expectedVersion) ||
      data.expectedVersion < 0
    )
      throw new HttpError(
        400,
        "A valid action reference and reviewed version are required",
      );
    if (
      ["FINAL_STORAGE_REJECT_RESPONSE", "PRE_STORAGE_REJECT_REQUEST"].includes(
        operationType,
      ) &&
      (!reason || reason.length < 3 || reason.length > 1000)
    )
      throw new HttpError(400, "Enter a revision reason (3–1000 characters)");
    fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          id: data.id,
          operationType,
          expectedVersion: data.expectedVersion,
          reason,
          requestedQuantity: preAction ? data.requestedQuantity : undefined,
          approvedByEmployeeId: preAction
            ? data.approvedByEmployeeId
            : undefined,
          receiptAllocationId: preAction && operationType === "PRE_STORAGE_ACCEPT_REQUEST" ? data.receiptAllocationId : undefined,
          sources: selectedSources,
          actorId: user.id,
        }),
      )
      .digest("hex");
    const previous = await prisma.transferAction.findFirst({
      where: { actionKey: data.actionKey },
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "This action reference belongs to different data",
        );
      return NextResponse.json({ result: previous, replayed: true });
    }
  }
  const current = await prisma.storageTransferRequest.findUniqueOrThrow({
    where: { id: Number(data.id) },
  });
  if (current.version !== data.expectedVersion)
    throw new HttpError(
      409,
      "This transfer has changed. Reload and review it before confirming.",
    );
  const fromPre = [
    "PRE_STORAGE_ACCEPT_REQUEST",
    "PRE_STORAGE_REJECT_REQUEST",
  ].includes(operationType);
  const fromFinal = [
    "FINAL_STORAGE_ACCEPT_RESPONSE",
    "FINAL_STORAGE_REJECT_RESPONSE",
  ].includes(operationType);
  if (!fromPre && !fromFinal)
    throw new HttpError(400, "Invalid operation type");
  if (
    fromPre
      ? current.preStorageStatus !== "pending"
      : current.finalStorageStatus !== "transportPending"
  )
    throw new HttpError(
      409,
      "This transfer is no longer awaiting this action. Refresh and retry.",
    );
  const accept = [
    "FINAL_STORAGE_ACCEPT_RESPONSE",
    "PRE_STORAGE_ACCEPT_REQUEST",
  ].includes(operationType);
  if (
    preAction &&
    accept &&
    (!Number.isSafeInteger(data.requestedQuantity) ||
      data.requestedQuantity <= 0 ||
      !data.approvedByEmployeeId)
  )
    throw new HttpError(
      400,
      "A positive quantity and responsible employee are required",
    );
  const sourceRows = [];
  if (preAction && accept) {
    // Keep old confirmations replayable; new clients send the explicit list.
    if (!selectedSources) {
      if (!Number.isSafeInteger(data.receiptAllocationId) || data.receiptAllocationId <= 0)
        throw new HttpError(400, "Select a linked pre-storage receipt as the source");
      selectedSources = [{ receiptAllocationId: data.receiptAllocationId, quantity: data.requestedQuantity }];
    }
    for (const selection of selectedSources) {
      const source = await prisma.receiptAllocation.findUniqueOrThrow({ where: { id: selection.receiptAllocationId } });
      await prisma.preStorageEntry.findUniqueOrThrow({ where: { id: source.receiptId } });
      const allocations = await prisma.transferSource.findMany({ where: { receiptAllocationId: source.id, state: { in: ["reserved", "completed"] } } });
      if (allocations.reduce((sum, row) => sum + row.quantity, 0) + selection.quantity > source.quantity)
        throw new HttpError(409, `Receipt #${source.receiptId}, Profile #${source.containerProfileId} no longer has enough unallocated containers. Reload the source list.`);
      sourceRows.push({ source, quantity: selection.quantity });
    }
    if (!current.finalStorageLocationId) throw new HttpError(409, "Transfer destination is missing");
    await prisma.finalStorageLocation.findUniqueOrThrow({ where: { id: current.finalStorageLocationId } });
  }
  if (finalAction && accept) {
    const reservations = await prisma.transferSource.findMany({ where: { transferId: current.id, state: "reserved" } });
    if (reservations.length) {
      const balances = await storageBalances();
      const destination = balances.final.find(row => row.id === current.finalStorageLocationId);
      const incoming = reservations.reduce((sum, row) => sum + row.quantity, 0);
      if (!destination || (destination.inventory.quantity + incoming) * destination.containerFootprint > destination.surfaceArea)
        throw new HttpError(409, "The destination no longer has enough recorded free capacity");
      if (incoming !== current.requestedQuantity || reservations.some(row => row.destinationId !== current.finalStorageLocationId))
        throw new HttpError(409, "Source quantities or destination no longer match the reviewed transfer");
      const quantitiesByLocation = new Map();
      for (const reservation of reservations) quantitiesByLocation.set(reservation.locationId, (quantitiesByLocation.get(reservation.locationId) || 0) + reservation.quantity);
      for (const [locationId, quantity] of quantitiesByLocation) {
        const origin = balances.pre.find(row => row.id === locationId);
        if (!origin || origin.inventory.inconsistent || origin.inventory.quantity < quantity)
          throw new HttpError(409, "Review source stock before confirming receipt");
      }
    }
  }
  const updated = await prisma.storageTransferRequest.update({
    where: { id: current.id },
    data: {
      version: current.version + 1,
      finalStorageStatus: preAction
        ? accept
          ? "transportPending"
          : "requestRejected"
        : accept
          ? "accepted"
          : "requestPending",
      preStorageStatus: preAction
        ? accept
          ? "accepted"
          : "rejected"
        : accept
          ? "completed"
          : "pending",
      ...(preAction && accept
        ? {
            requestedQuantity: data.requestedQuantity,
            approvedByEmployeeId: data.approvedByEmployeeId,
          }
        : {}),
    },
  });
  const result = await prisma.transferAction.create({
    data: {
      transferId: current.id,
      actionKey: data.actionKey,
      fingerprint,
      action: operationType,
      quantity: updated.requestedQuantity,
      actorId: user.id,
      reason,
    },
  });
  for (const { source, quantity } of sourceRows) await prisma.transferSource.create({ data: {
    transferId: current.id, receiptAllocationId: source.id, shipmentId: source.shipmentId,
    containerProfileId: source.containerProfileId, locationId: source.locationId,
    destinationId: current.finalStorageLocationId, quantity,
    approvalActionId: result.id, state: "reserved",
  } });
  if (finalAction) {
    const reservations = await prisma.transferSource.findMany({ where: { transferId: current.id, state: "reserved" } });
    for (const reservation of reservations) await prisma.transferSource.update({ where: { id: reservation.id }, data: { state: accept ? "completed" : "released", resolutionActionId: result.id } });
  }
  return NextResponse.json({ result });
}

export const POST = withApiAuth(POSTHandler, { access: "member" });
export const GET = withApiAuth(GETHandler);
export const PUT = withApiAuth(PUTHandler, {
  access: "member",
  bodyObjects: ["data"],
});

export const dynamic = "force-dynamic";
