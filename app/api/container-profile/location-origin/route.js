import { withApiAuth } from "@/lib/server/api-route";
import { definitionRoutes } from "@/lib/server/definition-changes";

// Every administrative change is reviewed, recorded with its before/after values
// and refused when existing Container Profiles or their history rely on it.
const routes = definitionRoutes("LOCATION_ORIGIN");

export const GET = withApiAuth(routes.GET);
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"] });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"] });
export const PATCH = withApiAuth(routes.PATCH);
export const DELETE = withApiAuth(routes.DELETE);

export const dynamic = "force-dynamic";
