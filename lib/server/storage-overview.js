import { prisma } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
import getConditionLevel from "../helpers/getConditionLevel";

export function measurement(row, prefix) {
  const fields = [
    ["temperature", "Temperature", "°C"],
    ["radiation", "RadiationLevel", "μSv/h"],
    ["humidity", "Humidity", "%"],
    ["pressure", "Pressure", "hPa"],
  ];
  const values = fields.map(([key, field, unit]) => ({
    key,
    value: row[`${prefix}${field}`],
    unit,
    level: Number.isFinite(row[`${prefix}${field}`])
      ? getConditionLevel(key, row[`${prefix}${field}`])
      : "unknown",
  }));
  const level = ["danger", "warning", "unknown", "optimal"].find((level) =>
    values.some((value) => value.level === level),
  );
  return { id: row.id, date: row.createdAt, values, level };
}

export async function storageOverview(request, area) {
  const pre = area === "PRE_STORAGE";
  const prefix = pre ? "preStorage" : "finalStorage";
  const href = pre ? "/pre-storage" : "/final-storage";
  const params = new URL(request.url).searchParams;
  const view = params.get("view") || "measurements";
  let page = Number(params.get("page") || 1);
  if (
    ![
      "measurements",
      "receipts",
      "transfers",
      "alerts",
      "incoming",
      "events",
    ].includes(view) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 2147483647
  )
    throw new HttpError(400, "Invalid view or page");
  if (view === "incoming" && !pre)
    throw new HttpError(400, "Incoming profiles belong to pre-storage");
  const status = params.get("status") || "";
  const statuses = pre
    ? ["pending", "accepted", "rejected", "completed"]
    : ["requestPending", "transportPending", "requestRejected", "accepted"];
  if (status && (view !== "transfers" || !statuses.includes(status)))
    throw new HttpError(400, "Invalid transfer status");
  const locationId = params.get("location");
  if (
    locationId &&
    (!/^[1-9]\d*$/.test(locationId) || Number(locationId) > 2147483647)
  )
    throw new HttpError(400, "Invalid location");
  const locationModel = pre
    ? prisma.preStorageLocation
    : prisma.finalStorageLocation;
  const locations = await locationModel.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (
    locationId &&
    !locations.some((location) => location.id === Number(locationId))
  )
    throw new HttpError(404, "Location not found");
  // Transfers have no pre-storage location relation in the current schema.
  if (pre && ["transfers", "events"].includes(view) && locationId)
    throw new HttpError(400, "Transfers cannot be filtered by hall");
  const where = locationId
    ? { [`${prefix}LocationId`]: Number(locationId) }
    : {};
  const conditionModel = pre
    ? prisma.preStorageConditions
    : prisma.finalStorageCondition;
  let total, rows;
  if (view === "events") {
    const filter = locationId
      ? { transfer: { finalStorageLocationId: Number(locationId) } }
      : {};
    // Actions are read through the organization-scoped delegate; never infer old events.
    total = await prisma.transferAction.count({ where: filter });
    page = Math.min(page, Math.max(1, Math.ceil(total / 10)));
    const actions = await prisma.transferAction.findMany({
      where: filter,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 10,
      take: 10,
      select: {
        id: true,
        transferId: true,
        action: true,
        quantity: true,
        actorId: true,
        reason: true,
        createdAt: true,
        transfer: {
          select: { requestedByRoom: true, finalStorageLocationId: true },
        },
      },
    });
    rows = actions.map((action) => ({
      id: action.id,
      transferId: action.transferId,
      date: action.createdAt,
      location: action.transfer.requestedByRoom,
      href:
        !pre && action.transfer.finalStorageLocationId
          ? `${href}/${action.transfer.finalStorageLocationId}`
          : null,
      quantity: action.quantity,
      actorId: action.actorId,
      reason: action.reason,
      status:
        {
          TRANSFER_REQUESTED: "Transfer requested",
          PRE_STORAGE_ACCEPT_REQUEST: "Approved by pre-storage",
          PRE_STORAGE_REJECT_REQUEST: "Rejected by pre-storage",
          FINAL_STORAGE_ACCEPT_RESPONSE: "Final receipt confirmed",
          FINAL_STORAGE_REJECT_RESPONSE: "Returned for revision",
        }[action.action] || action.action,
    }));
  } else if (view === "incoming") {
    if (locationId)
      throw new HttpError(400, "Incoming profiles cannot be filtered by hall");
    const filter = {
      containerStatus: "pending",
      shippingInformation: { truckStatus: "IN" },
    };
    total = await prisma.containerProfile.count({ where: filter });
    page = Math.min(page, Math.max(1, Math.ceil(total / 10)));
    const profiles = await prisma.containerProfile.findMany({
      where: filter,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * 10,
      take: 10,
      include: {
        wasteProfile: true,
        shippingInformation: { select: { id: true, companyName: true } },
        locationOrigin: { select: { name: true } },
      },
    });
    const halls = await locationModel.findMany({
      select: { id: true, wasteProfile: true, containerType: true },
    });
    rows = profiles.map((profile) => {
      const hall = halls.find(
        (hall) =>
          (hall.wasteProfile || hall.containerType) ===
          profile.wasteProfile.name,
      );
      return {
        id: profile.id,
        date: profile.createdAt,
        location: `${profile.wasteProfile.name} · ${profile.locationOrigin.name}`,
        quantity: profile.quantity,
        status: `Shipment #${profile.shippingInformation.id} · ${profile.shippingInformation.companyName}`,
        href: hall ? `${href}/${hall.id}` : null,
        note: hall
          ? "Open receiving hall to review and record receipt."
          : "No matching receiving hall configured. Contact your administrator.",
      };
    });
  } else if (view === "alerts") {
    const relation = pre ? "preStorageConditions" : "finalStorageConditions";
    const latest = await locationModel.findMany({
      where: locationId ? { id: Number(locationId) } : {},
      select: {
        id: true,
        name: true,
        [relation]: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
        },
      },
    });
    const alerts = latest
      .map((location) => ({
        location: location.name,
        href: `${href}/${location.id}`,
        ...(location[relation][0]
          ? measurement(location[relation][0], prefix)
          : { level: "unknown", date: null, values: [] }),
        id: location.id,
      }))
      .filter((row) => row.level !== "optimal");
    const rank = { danger: 0, warning: 1, unknown: 2 };
    alerts.sort(
      (a, b) =>
        rank[a.level] - rank[b.level] || a.location.localeCompare(b.location),
    );
    total = alerts.length;
    page = Math.min(page, Math.max(1, Math.ceil(total / 10)));
    rows = alerts.slice((page - 1) * 10, page * 10);
  } else {
    const model =
      view === "measurements"
        ? conditionModel
        : view === "receipts" && pre
          ? prisma.preStorageEntry
          : prisma.storageTransferRequest;
    const filter = view === "transfers" && pre ? {} : where;
    if (status)
      filter[pre ? "preStorageStatus" : "finalStorageStatus"] = status;
    if (view === "receipts" && !pre)
      Object.assign(filter, {
        preStorageStatus: "completed",
        finalStorageStatus: "accepted",
      });
    total = await model.count({ where: filter });
    page = Math.min(page, Math.max(1, Math.ceil(total / 10)));
    const finalReceipts = view === "receipts" && !pre;
    const records = await model.findMany({
      ...(finalReceipts
        ? {
            include: {
              actions: {
                where: { action: "FINAL_STORAGE_ACCEPT_RESPONSE" },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
                select: {
                  id: true,
                  createdAt: true,
                  actorId: true,
                  quantity: true,
                },
              },
            },
          }
        : {}),
      where: filter,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 10,
      take: 10,
    });
    rows = records.map((row) => {
      const loc = locations.find(
        (location) => location.id === row[`${prefix}LocationId`],
      );
      return {
        id: row.id,
        date: finalReceipts
          ? (row.actions[0]?.createdAt ?? null)
          : row.createdAt,
        ...(finalReceipts
          ? {
              dateLabel: "Receipt confirmed",
              missingDateLabel: "Receipt time not recorded",
              transferId: row.id,
              requestCreatedAt: row.createdAt,
              confirmationId: row.actions[0]?.id ?? null,
              actorId: row.actions[0]?.actorId ?? null,
              note: row.actions[0]
                ? "Time and quantity come from the saved receipt confirmation."
                : "Legacy record: marked received, but no receipt confirmation event was recorded. The request date is not a receipt date.",
            }
          : {}),
        location: loc?.name || row.requestedByRoom || "Location unavailable",
        href: loc ? `${href}/${loc.id}` : null,
        ...(view === "measurements"
          ? measurement(row, prefix)
          : {
              quantity: finalReceipts
                ? (row.actions[0]?.quantity ?? row.requestedQuantity)
                : (row.quantity ?? row.requestedQuantity),
              status:
                view === "receipts"
                  ? finalReceipts && !row.actions[0]
                    ? "Marked received · confirmation unavailable"
                    : "Recorded receipt"
                  : pre
                    ? row.preStorageStatus
                    : row.finalStorageStatus,
            }),
      };
    });
  }
  return Response.json({
    view,
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / 10)),
    locations,
    rows,
  });
}
