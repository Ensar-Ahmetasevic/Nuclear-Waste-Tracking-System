import { storageBalances } from "@/lib/server/storage-balances";
import { withApiAuth } from "@/lib/server/api-route";
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
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"] });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"] });
export const DELETE = withApiAuth(routes.DELETE);

export const dynamic = "force-dynamic";
