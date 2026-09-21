import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { storageBalances } from "@/lib/server/storage-balances";
export const GET = withApiAuth(async () => {
  const { pre, final } = await storageBalances();
  const locations = [...pre, ...final];
  const activeContainers = locations.reduce((sum, row) => sum + row.inventory.quantity, 0);
  const usedSurface = locations.reduce((sum, row) => sum + row.inventory.quantity * row.containerFootprint, 0);
  const totalSurface = locations.reduce((sum, row) => sum + row.surfaceArea, 0);
  return Response.json({ activeContainers, capacityUsedPercentage: totalSurface ? Math.round(100 * usedSurface / totalSurface) : 0,
    activeShipments: await prisma.shippingInformation.count({ where: { truckStatus: "IN" } }), preStorageLocations: pre.length, finalStorageLocations: final.length,
    inventoryNote: "Recorded balances include existing stored counts and linked completed transfers. Older unlinked transfers are not added again.",
    unlinkedFinalTransfers: final.reduce((sum,row)=>sum+row.inventory.unlinkedTransfers,0),
    inconsistentLocations: pre.filter(row=>row.inventory.inconsistent).length,
  });
});
export const dynamic = "force-dynamic";
