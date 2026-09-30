import { reasonText, withApiAuth } from "@/lib/server/api-route";
import { definitionRoutes } from "@/lib/server/definition-changes";

// Every administrative change is reviewed, recorded with its before/after values
// and refused when existing Container Profiles or their history rely on it.
const routes = definitionRoutes("CONTAINER_TYPE");

export const GET = withApiAuth(routes.GET);
export const POST = withApiAuth(routes.POST, { bodyObjects: ["values"], texts: reasonText });
export const PUT = withApiAuth(routes.PUT, { bodyObjects: ["values"], texts: reasonText });
export const PATCH = withApiAuth(routes.PATCH, { texts: reasonText });
export const DELETE = withApiAuth(routes.DELETE, { texts: reasonText });

export const dynamic = "force-dynamic";
