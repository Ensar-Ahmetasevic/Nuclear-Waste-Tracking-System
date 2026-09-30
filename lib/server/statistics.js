import { prisma } from "./scoped-database.cjs";
import { storageBalances } from "./storage-balances";
import { movements } from "./overview";

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
// Waiting time from truck arrival to the recorded pre-storage receipt.
const WAIT_BUCKETS = [
  ["lt2h", 2],
  ["2to8h", 8],
  ["8to24h", 24],
  ["1to3d", 72],
  ["gt3d", Infinity],
];

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Monday of the UTC week of a date, as YYYY-MM-DD.
const weekKey = (date) => {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
};

// Organization-wide figures for the Statistics page. Days are UTC days.
export async function organizationStatistics({ days = 30 } = {}) {
  const flow = await movements(days);
  const start = new Date(`${flow.series[0].date}T00:00:00Z`);
  const arrivals = await prisma.shippingInformation.findMany({
    where: { entryDateTime: { gte: start } },
    select: { entryDateTime: true },
  });
  const arrivalsPerDay = new Map();
  for (const row of arrivals) {
    const key = new Date(row.entryDateTime).toISOString().slice(0, 10);
    arrivalsPerDay.set(key, (arrivalsPerDay.get(key) || 0) + 1);
  }

  // Linked receipts only: a receipt linked afterwards by an administrator has the
  // link time as createdAt, which would distort the waiting time.
  const receipts = await prisma.receiptAllocation.findMany({
    where: { createdAt: { gte: start }, legacyLinkId: null },
    select: { createdAt: true, shipmentId: true },
  });
  const shipmentIds = [...new Set(receipts.map((row) => row.shipmentId))];
  const shipments = shipmentIds.length
    ? await prisma.shippingInformation.findMany({
        where: { id: { in: shipmentIds } },
        select: { id: true, entryDateTime: true },
      })
    : [];
  const entry = new Map(
    shipments.map((row) => [row.id, new Date(row.entryDateTime).getTime()]),
  );
  const waits = receipts
    .filter((row) => entry.has(row.shipmentId))
    .map((row) =>
      Math.max(
        0,
        (new Date(row.createdAt).getTime() - entry.get(row.shipmentId)) / HOUR,
      ),
    );
  const buckets = WAIT_BUCKETS.map(([key, limit], index) => ({
    key,
    count: waits.filter(
      (hours) =>
        hours < limit && (index === 0 || hours >= WAIT_BUCKETS[index - 1][1]),
    ).length,
  }));

  const alerts = await prisma.hallAlert.findMany({
    where: { openedAt: { gte: start } },
    select: { openedAt: true, severity: true, problems: true },
  });
  const weeks = [];
  for (
    let time = new Date(`${weekKey(start)}T00:00:00Z`).getTime();
    time <= Date.now();
    time += 7 * DAY
  ) {
    const week = new Date(time).toISOString().slice(0, 10);
    const rows = alerts.filter((row) => weekKey(row.openedAt) === week);
    weeks.push({
      week,
      // Alerts opened in the week by severity; overdue when a missed measurement is among their problems.
      critical: rows.filter((row) => row.severity === "CRITICAL").length,
      warning: rows.filter(
        (row) =>
          row.severity === "WARNING" &&
          !row.problems.some((problem) => problem.key === "OVERDUE"),
      ).length,
      overdue: rows.filter(
        (row) =>
          row.severity === "WARNING" &&
          row.problems.some((problem) => problem.key === "OVERDUE"),
      ).length,
    });
  }

  const { pre, final } = await storageBalances();
  const location = (area) => (row) => {
    const slots =
      row.containerFootprint > 0
        ? Math.floor(row.surfaceArea / row.containerFootprint)
        : 0;
    return {
      area,
      id: row.id,
      name: row.name,
      used: row.inventory.quantity,
      slots,
      percent: slots ? Math.round((100 * row.inventory.quantity) / slots) : 0,
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    days,
    totals: {
      arrivals: arrivals.length,
      received: flow.received,
      final: flow.final,
      alerts: alerts.length,
    },
    daily: flow.series.map((row) => ({
      ...row,
      arrivals: arrivalsPerDay.get(row.date) || 0,
    })),
    waiting: {
      receipts: waits.length,
      medianHours: median(waits),
      averageHours: waits.length
        ? waits.reduce((sum, hours) => sum + hours, 0) / waits.length
        : null,
      buckets,
    },
    alertsPerWeek: weeks,
    capacity: [
      ...pre.map(location("PRE_STORAGE")),
      ...final.map(location("FINAL_STORAGE")),
    ],
  };
}
