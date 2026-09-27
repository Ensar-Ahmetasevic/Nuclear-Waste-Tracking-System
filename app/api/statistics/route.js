import { withApiAuth } from "@/lib/server/api-route";
import { organizationStatistics } from "@/lib/server/statistics";

// Aggregated figures of the organization; `days` is 30 or 90.
export const GET = withApiAuth(async (req) => {
  const days = new URL(req.url).searchParams.get("days") === "90" ? 90 : 30;
  return Response.json(await organizationStatistics({ days }));
});
export const dynamic = "force-dynamic";
