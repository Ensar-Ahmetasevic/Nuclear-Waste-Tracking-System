import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { reconciliationOverview } from "@/lib/server/stock-reconciliation";

async function GETHandler() {
  return NextResponse.json(await reconciliationOverview());
}

export const GET = withApiAuth(GETHandler, { allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] });

export const dynamic = "force-dynamic";
