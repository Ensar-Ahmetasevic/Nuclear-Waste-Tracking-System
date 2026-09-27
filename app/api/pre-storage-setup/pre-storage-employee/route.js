import { withApiAuth } from "@/lib/server/api-route";
import { definitionRoutes } from "@/lib/server/definition-changes";

// Changes are reviewed and recorded without copying personal details into the
// history; a person named on receipts, measurements or transfers cannot be deleted.
// A person who no longer works here is deactivated instead: history stays linked.
const routes = definitionRoutes("PRE_STORAGE_EMPLOYEE");

export const GET = withApiAuth(routes.GET);
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"] });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"] });
export const PATCH = withApiAuth(routes.PATCH);
export const DELETE = withApiAuth(routes.DELETE);

export const dynamic = "force-dynamic";
