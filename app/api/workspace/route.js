import { returnStates } from "@/lib/server/receipt-rejections";
import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { areas, manages } from "@/lib/workspaces.cjs";
import { monitoringSummary } from "@/lib/server/monitoring";
import { storageBalances } from "@/lib/server/storage-balances";
import { conditionCells } from "@/lib/server/overview";

// Unresolved hall alerts of an area: counts for the bell and the navigation.
// Unread ones are new for Supervision.
async function alertOverview(area) {
  const { open, noData } = await monitoringSummary(area);
  return {
    summary: { open, noData },
    alerts: {
      open: open.length,
      unread: open.filter((row) => !row.readAt).length,
      critical: open.filter((row) => row.severity === "CRITICAL").length,
    },
  };
}
export const GET = withApiAuth(async (req, { user }) => {
  const result = [];
  let balances;
  // Occupancy per hall or room (containers against surface area / footprint) and
  // the worst open alert per parameter.
  const occupancy = async (field, href, { open, noData }) => {
    balances ??= await storageBalances();
    const noDataIds = new Set(noData.map((item) => item.locationId));
    return balances[field].map((row) => {
      const slots =
        row.containerFootprint > 0
          ? Math.floor(row.surfaceArea / row.containerFootprint)
          : 0;
      return {
        id: row.id,
        name: row.name,
        used: row.inventory.quantity,
        slots,
        percent: slots ? Math.round((100 * row.inventory.quantity) / slots) : 0,
        detail:
          field === "pre"
            ? row.wasteProfile || row.containerType
            : row.containerType,
        depth: row.depth ?? null,
        surfaceArea: row.surfaceArea,
        containerFootprint: row.containerFootprint,
        cells: conditionCells(open, noDataIds, row.id),
        href: `${href}/${row.id}`,
      };
    });
  };
  for (const [key, area] of Object.entries(areas)) {
    if (!manages(user) && user.workArea !== key) continue;
    // badge: open work for the navigation; alerts: its unresolved hall alert.
    let metrics, tasks, badge, alerts, occupied;
    if (key === "SHIPPING") {
      const rows = await prisma.shippingInformation.findMany({
        orderBy: { id: "desc" },
        select: {
          id: true,
          companyName: true,
          truckStatus: true,
          registrationPlates: true,
          containerProfiles: { select: { id: true, containerStatus: true } },
        },
      });
      const missing = rows.filter(
        (row) => row.truckStatus === "IN" && !row.containerProfiles.length,
      );
      // Pre-storage returned profiles of these trucks: Step 1 checks the delivery
      // again, or waits while Supervision decides an escalated return.
      const states = await returnStates(rows.filter((row) => row.truckStatus === "IN"));
      const returned = rows.filter((row) => states.get(row.id) === "open");
      const onHold = rows.filter((row) => states.get(row.id) === "escalated");
      metrics = [
        [
          "IN · Content missing",
          missing.length,
          "/shipping-informations?view=missing",
          "missing",
        ],
        [
          "IN · Content recorded",
          rows.filter(
            (row) => row.truckStatus === "IN" && row.containerProfiles.length,
          ).length,
          "/shipping-informations?view=recorded",
          "recorded",
        ],
        [
          "OUT · Departed",
          rows.filter((row) => row.truckStatus === "OUT").length,
          "/shipping-informations?view=out",
          "departed",
        ],
      ];
      badge = missing.length + returned.length;
      tasks = [
        ...returned.map((row) => ({
          id: row.id,
          kind: "returned",
          label: row.companyName,
          plates: row.registrationPlates,
          detail: "Returned from Pre-storage · check the delivery",
          href: `/shipping-informations/${row.id}`,
        })),
        ...missing.map((row) => ({
          id: row.id,
          kind: "shipment",
          label: row.companyName,
          detail: "Waiting for Container Profile · Supervision",
          href: `/shipping-informations/${row.id}`,
        })),
        ...onHold.map((row) => ({
          id: row.id,
          kind: "onHold",
          label: row.companyName,
          plates: row.registrationPlates,
          detail: "Waiting for Supervision",
          href: `/shipping-informations/${row.id}`,
        })),
      ].slice(0, 10);
    } else if (key === "PRE_STORAGE") {
      const [incoming, transfers, locations] = await Promise.all([
        prisma.containerProfile.count({
          where: {
            containerStatus: "pending",
            shippingInformation: { truckStatus: "IN" },
          },
        }),
        prisma.storageTransferRequest.count({
          where: { preStorageStatus: "pending" },
        }),
        prisma.preStorageLocation.findMany({
          orderBy: { id: "desc" },
          select: { id: true, name: true },
        }),
      ]);
      metrics = [
        [
          "Profiles awaiting receipt",
          incoming,
          "/pre-storage/history?view=incoming",
          "incoming",
        ],
        [
          "Transfer requests",
          transfers,
          "/pre-storage/history?view=transfers&status=pending",
          "transfers",
        ],
        ["Halls", locations.length, undefined, "halls"],
      ];
      tasks = locations.slice(0, 10).map((row) => ({
        id: row.id,
        kind: "location",
        label: row.name,
        detail: "Open receipts, transfers and conditions",
        href: `/pre-storage/${row.id}`,
      }));
      const overview = await alertOverview("PRE_STORAGE");
      badge = incoming + transfers;
      alerts = overview.alerts;
      occupied = await occupancy("pre", "/pre-storage", overview.summary);
      // What waits in each hall: deliveries offered to it (matched by Waste
      // Profile, as the hall page does), transfer requests for its container
      // type and its unresolved alert.
      const [halls, profiles, requests] = await Promise.all([
        prisma.preStorageLocation.findMany({ select: { id: true, wasteProfile: true, containerType: true } }),
        prisma.containerProfile.findMany({
          where: { containerStatus: "pending", shippingInformation: { truckStatus: "IN", status: "pending" } },
          select: { quantity: true, shippingInformationId: true, wasteProfile: { select: { name: true } } },
        }),
        prisma.storageTransferRequest.findMany({
          where: { preStorageStatus: "pending" },
          select: { finalStorageLocation: { select: { containerType: true } } },
        }),
      ]);
      for (const row of occupied) {
        const hall = halls.find((item) => item.id === row.id);
        const offered = profiles.filter((profile) => profile.wasteProfile.name === (hall?.wasteProfile || hall?.containerType));
        row.signals = {
          deliveries: new Set(offered.map((profile) => profile.shippingInformationId)).size,
          containers: offered.reduce((sum, profile) => sum + profile.quantity, 0),
          transfers: requests.filter((request) => request.finalStorageLocation?.containerType === hall?.containerType).length,
          alerts: overview.summary.open.filter((alert) => alert.locationId === row.id).length,
        };
      }
    } else {
      const [pending, incoming, locations] = await Promise.all([
        prisma.storageTransferRequest.count({
          where: { finalStorageStatus: "requestPending" },
        }),
        prisma.storageTransferRequest.count({
          where: { finalStorageStatus: "transportPending" },
        }),
        prisma.finalStorageLocation.findMany({
          orderBy: { id: "desc" },
          select: { id: true, name: true },
        }),
      ]);
      metrics = [
        [
          "Requests in progress",
          pending,
          "/final-storage/history?view=transfers&status=requestPending",
          "requestsInProgress",
        ],
        [
          "Awaiting receipt",
          incoming,
          "/final-storage/history?view=transfers&status=transportPending",
          "awaitingReceipt",
        ],
        ["Rooms", locations.length, undefined, "rooms"],
      ];
      tasks = locations.slice(0, 10).map((row) => ({
        id: row.id,
        kind: "location",
        label: row.name,
        detail: "Open requests, receipts and conditions",
        href: `/final-storage/${row.id}`,
      }));
      const overview = await alertOverview("FINAL_STORAGE");
      badge = pending + incoming;
      alerts = overview.alerts;
      occupied = await occupancy("final", "/final-storage", overview.summary);
      // What waits in each room: its requests still with Pre-storage, transfers
      // on their way to be received, and its unresolved alert.
      const requests = await prisma.storageTransferRequest.findMany({
        where: { finalStorageStatus: { in: ["requestPending", "transportPending"] } },
        select: { finalStorageLocationId: true, finalStorageStatus: true },
      });
      for (const row of occupied) {
        const own = requests.filter((request) => request.finalStorageLocationId === row.id);
        row.signals = {
          requested: own.filter((request) => request.finalStorageStatus === "requestPending").length,
          arriving: own.filter((request) => request.finalStorageStatus === "transportPending").length,
          alerts: overview.summary.open.filter((alert) => alert.locationId === row.id).length,
        };
      }
    }
    result.push({
      key,
      ...area,
      metrics,
      tasks,
      badge,
      alerts,
      locations: occupied,
    });
  }
  return Response.json({ workspaces: result });
});
