import { withApiAuth } from "@/lib/server/api-route";
import { managementOverview } from "@/lib/server/overview";

// Management dashboard: all three steps in one request. `days` is 7 or 30.
export const GET = withApiAuth(async (req) => {
  const days = new URL(req.url).searchParams.get("days") === "30" ? 30 : 7;
  return Response.json(await managementOverview({ days }));
}, { allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] });
export const dynamic = "force-dynamic";
