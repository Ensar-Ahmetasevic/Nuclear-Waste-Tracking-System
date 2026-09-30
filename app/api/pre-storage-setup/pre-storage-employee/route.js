import { reasonText, withApiAuth } from "@/lib/server/api-route";
import { definitionRoutes } from "@/lib/server/definition-changes";

// Changes are reviewed and recorded without copying personal details into the
// history; a person named on receipts, measurements or transfers cannot be deleted.
// A person who no longer works here is deactivated instead: history stays linked.
const routes = definitionRoutes("PRE_STORAGE_EMPLOYEE");

export const GET = withApiAuth(routes.GET);
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"], texts: reasonText });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"], texts: reasonText });
export const PATCH = withApiAuth(routes.PATCH, { texts: reasonText });
export const DELETE = withApiAuth(routes.DELETE, { texts: reasonText });

export const dynamic = "force-dynamic";
