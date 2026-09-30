import { storageBalances } from "@/lib/server/storage-balances";
import { reasonText, withApiAuth } from "@/lib/server/api-route";
import { definitionRoutes } from "@/lib/server/definition-changes";

// Hall changes are reviewed and recorded; a hall with transfers, measurements or
// recorded stock cannot be deleted, so its history is never removed.
const routes = definitionRoutes("FINAL_STORAGE_LOCATION", {
  include: {
    storageTransferRequests: { include: { requestedByEmployee: true } },
    finalStorageConditions: { include: { finalStorageResponsibleEmployee: true } },
  },
  decorate: async rows => {
    const balances = (await storageBalances()).final;
    for (const location of rows) location.inventory = balances.find(row => row.id === location.id)?.inventory;
  },
});

export const GET = withApiAuth(routes.GET);
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"], texts: reasonText });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"], texts: reasonText });
export const DELETE = withApiAuth(routes.DELETE, { texts: reasonText });

export const dynamic = "force-dynamic";
