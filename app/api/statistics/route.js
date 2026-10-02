import { withApiAuth } from "@/lib/server/api-route";
import { organizationStatistics } from "@/lib/server/statistics";
import { manages } from "@/lib/workspaces.cjs";

// Aggregated figures of the organization; `days` is 30 or 90.
// Employees get the totals only; trends are for Supervision and Administrators.
export const GET = withApiAuth(async (req, { user }) => {
  const days = new URL(req.url).searchParams.get("days") === "90" ? 90 : 30;
  const stats = await organizationStatistics({ days });
  if (manages(user)) return Response.json(stats);
  const { generatedAt, totals } = stats;
  return Response.json({ generatedAt, days, totals });
});
export const dynamic = "force-dynamic";
