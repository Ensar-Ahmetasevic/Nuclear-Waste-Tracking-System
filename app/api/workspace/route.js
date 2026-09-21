import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { areas, manages } from "@/lib/workspaces.cjs";
export const GET = withApiAuth(async (req, { user }) => {
  const result = [];
  for (const [key, area] of Object.entries(areas)) {
    if (!manages(user) && user.workArea !== key) continue;
    let metrics, tasks;
    if (key === "SHIPPING") {
      const rows = await prisma.shippingInformation.findMany({
        orderBy: { id: "desc" },
        select: {
          id: true,
          companyName: true,
          truckStatus: true,
          containerProfiles: { select: { id: true } },
        },
      });
      const missing = rows.filter(
        (row) => row.truckStatus === "IN" && !row.containerProfiles.length,
      );
      metrics = [
        [
          "IN · Content missing",
          missing.length,
          "/shipping-informations?view=missing",
        ],
        [
          "IN · Content recorded",
          rows.filter(
            (row) => row.truckStatus === "IN" && row.containerProfiles.length,
          ).length,
          "/shipping-informations?view=recorded",
        ],
        [
          "OUT · Departed",
          rows.filter((row) => row.truckStatus === "OUT").length,
          "/shipping-informations?view=out",
        ],
      ];
      tasks = missing.slice(0, 10).map((row) => ({
        id: row.id,
        label: row.companyName,
        detail: "Waiting for Container Profile · Supervision",
        href: `/shipping-informations/${row.id}`,
      }));
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
        ],
        [
          "Transfer requests",
          transfers,
          "/pre-storage/history?view=transfers&status=pending",
        ],
        ["Halls", locations.length],
      ];
      tasks = locations.slice(0, 10).map((row) => ({
        id: row.id,
        label: row.name,
        detail: "Open receipts, transfers and conditions",
        href: `/pre-storage/${row.id}`,
      }));
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
        ],
        [
          "Awaiting receipt",
          incoming,
          "/final-storage/history?view=transfers&status=transportPending",
        ],
        ["Rooms", locations.length],
      ];
      tasks = locations.slice(0, 10).map((row) => ({
        id: row.id,
        label: row.name,
        detail: "Open requests, receipts and conditions",
        href: `/final-storage/${row.id}`,
      }));
    }
    result.push({ key, ...area, metrics, tasks });
  }
  return Response.json({ workspaces: result });
});
