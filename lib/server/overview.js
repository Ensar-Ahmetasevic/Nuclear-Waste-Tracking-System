import { prisma } from "./scoped-database.cjs";
import { storageBalances } from "./storage-balances";
import { monitoringSummary } from "./monitoring";
import { MONITORING_PARAMETERS } from "../monitoring";
import { shipmentJourney } from "../shipment-journey";
import { reportsFor } from "./receipt-rejections";

const DAY = 24 * 3600 * 1000;
const sum = (rows, field) =>
  rows.reduce((total, row) => total + (row[field] || 0), 0);
// Free container slots follow the existing capacity rule: containers × footprint
// against the surface area of the hall or room.
const slots = (location) =>
  location.containerFootprint > 0
    ? Math.floor(location.surfaceArea / location.containerFootprint)
    : 0;
const percent = (used, total) => (total ? Math.round((100 * used) / total) : 0);

// Worst open alert per location and parameter. "clear" only means there is no
// open alert; it is not a statement that the location is safe.
export function conditionCells(open, noDataIds, locationId) {
  const cells = {};
  for (const { key } of MONITORING_PARAMETERS) {
    const alerts = open.filter(
      (row) => row.locationId === locationId && row.parameter === key,
    );
    cells[key] = alerts.some(
      (row) => row.kind === "OUT_OF_RANGE" && row.severity === "CRITICAL",
    )
      ? "critical"
      : alerts.some((row) => row.kind === "OUT_OF_RANGE")
        ? "warning"
        : alerts.length
          ? "overdue"
          : noDataIds.has(locationId)
            ? "nodata"
            : "clear";
  }
  return cells;
}

// Received into pre-storage and received in final storage per UTC day.
export async function movements(days) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (days - 1) * DAY);
  const receipts = await prisma.preStorageEntry.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, quantity: true },
  });
  const finals = await prisma.transferAction.findMany({
    where: {
      action: "FINAL_STORAGE_ACCEPT_RESPONSE",
      createdAt: { gte: start },
    },
    select: { createdAt: true, quantity: true },
  });
  const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
  const series = Array.from({ length: days }, (_, index) => {
    const date = dayKey(start.getTime() + index * DAY);
    return {
      date,
      received: sum(
        receipts.filter((row) => dayKey(row.createdAt) === date),
        "quantity",
      ),
      final: sum(
        finals.filter((row) => dayKey(row.createdAt) === date),
        "quantity",
      ),
    };
  });
  return {
    days,
    series,
    received: sum(series, "received"),
    final: sum(series, "final"),
  };
}

export async function managementOverview({ days = 7 } = {}) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // Sequential on purpose: one scoped transaction, and the monitoring sweep writes.
  const trucks = await prisma.shippingInformation.findMany({
    where: { truckStatus: "IN" },
    orderBy: { entryDateTime: "asc" },
    select: {
      id: true,
      companyName: true,
      registrationPlates: true,
      entryDateTime: true,
      containerProfiles: { select: { id: true, containerStatus: true } },
    },
  });
  // Returns that Step 1 handed to Supervision; other returns stay with Step 1.
  const escalated = (await reportsFor(trucks)).filter((row) => row.state === "escalated");
  const arrivedToday = await prisma.shippingInformation.count({
    where: { entryDateTime: { gte: startOfDay } },
  });
  const profiles = await prisma.containerProfile.findMany({
    where: { shippingInformation: { truckStatus: "IN" } },
    select: { quantity: true, containerStatus: true },
  });
  const transfers = await prisma.storageTransferRequest.findMany({
    where: {
      finalStorageStatus: { in: ["requestPending", "transportPending"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      requestedQuantity: true,
      requestedByRoom: true,
      finalStorageStatus: true,
      preStorageStatus: true,
    },
  });
  const balances = await storageBalances();
  const preMonitoring = await monitoringSummary("PRE_STORAGE");
  const finalMonitoring = await monitoringSummary("FINAL_STORAGE");
  const series = await movements(days);
  const recent = await recentShipments();

  const location = (area, row) => ({
    area,
    id: row.id,
    name: row.name,
    detail:
      area === "PRE_STORAGE"
        ? row.containerType
        : `${row.containerType} · ${row.depth} m`,
    used: row.inventory.quantity,
    slots: slots(row),
    percent: percent(row.inventory.quantity, slots(row)),
    href: `${area === "PRE_STORAGE" ? "/pre-storage" : "/final-storage"}/${row.id}`,
  });
  const capacity = [
    ...balances.pre.map((row) => location("PRE_STORAGE", row)),
    ...balances.final.map((row) => location("FINAL_STORAGE", row)),
  ];
  const monitoring = {
    PRE_STORAGE: preMonitoring,
    FINAL_STORAGE: finalMonitoring,
  };
  const conditions = capacity.map((row) => ({
    area: row.area,
    id: row.id,
    name: row.name,
    href: `${row.area === "PRE_STORAGE" ? "/pre-storage" : "/final-storage"}/${row.id}`,
    cells: conditionCells(
      monitoring[row.area].open,
      new Set(monitoring[row.area].noData.map((item) => item.locationId)),
      row.id,
    ),
  }));
  const alertCounts = (rows) => ({
    open: rows.length,
    critical: rows.filter((row) => row.severity === "CRITICAL").length,
    escalated: rows.filter((row) => row.escalatedAt).length,
  });
  const allAlerts = [
    ...preMonitoring.open.map((row) => ({ ...row, area: "PRE_STORAGE" })),
    ...finalMonitoring.open.map((row) => ({ ...row, area: "FINAL_STORAGE" })),
  ];
  const containersIn = (area) =>
    sum(
      capacity.filter((row) => row.area === area),
      "used",
    );
  const slotsIn = (area) =>
    sum(
      capacity.filter((row) => row.area === area),
      "slots",
    );
  const withoutContent = trucks.filter((row) => !row.containerProfiles.length);
  const awaitingPre = transfers.filter(
    (row) =>
      row.finalStorageStatus === "requestPending" &&
      row.preStorageStatus === "pending",
  );
  const awaitingReceipt = transfers.filter(
    (row) => row.finalStorageStatus === "transportPending",
  );
  const usedTotal = sum(capacity, "used");
  const slotTotal = sum(capacity, "slots");

  const locationName = (area, id) =>
    capacity.find((row) => row.area === area && row.id === id)?.name ||
    `#${id}`;
  const attention = [
    ...escalated.map((row) => {
      const truck = trucks.find((item) => item.id === row.shipmentId);
      const handover = row.actions.findLast((item) => item.action === "ESCALATED");
      return {
        type: "return",
        id: `return-${row.id}`,
        shipmentId: row.shipmentId,
        company: truck.companyName,
        plates: truck.registrationPlates,
        hall: row.hall,
        note: handover.note,
        at: handover.createdAt,
        href: `/shipping-informations/${row.shipmentId}`,
        rank: -1,
      };
    }),
    ...allAlerts
      .filter(
        (row) =>
          row.severity === "CRITICAL" ||
          row.escalatedAt ||
          row.kind === "MISSING",
      )
      .map((row) => ({
        type: "alert",
        id: `alert-${row.area}-${row.id}`,
        severity: row.severity,
        kind: row.kind,
        escalated: Boolean(row.escalatedAt),
        parameter: row.parameter,
        location: locationName(row.area, row.locationId),
        at: row.escalatedAt || row.openedAt,
        href: `${row.area === "PRE_STORAGE" ? "/pre-storage" : "/final-storage"}/alerts/${row.id}`,
        rank: row.severity === "CRITICAL" ? 0 : row.escalatedAt ? 1 : 2,
      })),
    ...withoutContent.map((row) => ({
      type: "shipment",
      id: `shipment-${row.id}`,
      shipmentId: row.id,
      company: row.companyName,
      at: row.entryDateTime,
      href: `/shipping-informations/${row.id}`,
      rank: 3,
    })),
    ...transfers.map((row) => ({
      type: "transfer",
      id: `transfer-${row.id}`,
      transferId: row.id,
      room: row.requestedByRoom,
      quantity: row.requestedQuantity,
      status:
        row.finalStorageStatus === "transportPending"
          ? "awaitingReceipt"
          : "awaitingPreStorage",
      at: row.createdAt,
      href: `/transfers/${row.id}`,
      rank: 4,
    })),
  ]
    .sort((a, b) => a.rank - b.rank || new Date(a.at) - new Date(b.at))
    .map(({ rank: _rank, ...row }) => row);

  return {
    generatedAt: new Date().toISOString(),
    pipeline: {
      arrived: { trucks: trucks.length, withoutContent: withoutContent.length },
      content: {
        profiles: profiles.length,
        containers: sum(profiles, "quantity"),
        awaitingReceipt: profiles.filter(
          (row) => row.containerStatus === "pending",
        ).length,
      },
      pre: {
        containers: containersIn("PRE_STORAGE"),
        locations: balances.pre.length,
        ...alertCounts(preMonitoring.open),
      },
      transfer: {
        requests: transfers.length,
        containers: sum(transfers, "requestedQuantity"),
        awaitingPreStorage: awaitingPre.length,
        awaitingReceipt: awaitingReceipt.length,
      },
      final: {
        containers: containersIn("FINAL_STORAGE"),
        locations: balances.final.length,
        ...alertCounts(finalMonitoring.open),
      },
    },
    kpis: {
      trucksOnSite: trucks.length,
      arrivedToday,
      capacity: {
        used: usedTotal,
        slots: slotTotal,
        percent: percent(usedTotal, slotTotal),
      },
      capacityByArea: {
        PRE_STORAGE: percent(
          containersIn("PRE_STORAGE"),
          slotsIn("PRE_STORAGE"),
        ),
        FINAL_STORAGE: percent(
          containersIn("FINAL_STORAGE"),
          slotsIn("FINAL_STORAGE"),
        ),
      },
      alerts: {
        ...alertCounts(allAlerts),
        locations: new Set(
          allAlerts.map((row) => `${row.area}-${row.locationId}`),
        ).size,
      },
      transfers: {
        requests: transfers.length,
        containers: sum(transfers, "requestedQuantity"),
        oldestAt: transfers[0]?.createdAt || null,
      },
    },
    capacity,
    conditions,
    movements: series,
    attention: attention.slice(0, 8),
    attentionTotal: attention.length,
    recent,
  };
}

// Latest shipments with the same five-step journey as the shipment list.
export async function recentShipments(take = 5) {
  const rows = await prisma.shippingInformation.findMany({
    orderBy: { id: "desc" },
    take,
    select: {
      id: true,
      companyName: true,
      registrationPlates: true,
      truckStatus: true,
      entryDateTime: true,
      exitDateTime: true,
      containerProfiles: {
        select: { id: true, quantity: true, containerStatus: true },
      },
    },
  });
  const ids = rows.map((row) => row.id);
  const receipts = new Set(
    (
      await prisma.receiptAllocation.findMany({
        where: { shipmentId: { in: ids } },
        select: { containerProfileId: true },
      })
    ).map((row) => row.containerProfileId),
  );
  const completed = await prisma.transferSource.findMany({
    where: { shipmentId: { in: ids }, state: "completed" },
    select: { shipmentId: true, quantity: true },
  });
  return rows.map((row) => {
    const containerProfiles = row.containerProfiles.map((profile) => ({
      ...profile,
      receiptRecorded: receipts.has(profile.id),
    }));
    const journey = shipmentJourney({
      ...row,
      containerProfiles,
      finalContainers: sum(
        completed.filter((item) => item.shipmentId === row.id),
        "quantity",
      ),
    });
    return {
      id: row.id,
      company: row.companyName,
      plates: row.registrationPlates,
      truckStatus: row.truckStatus,
      arrivedAt: row.entryDateTime,
      containers: sum(containerProfiles, "quantity"),
      journey,
    };
  });
}
