import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { applyStockCorrection } from "@/lib/server/stock-reconciliation";

// Only an administrator approves a correction of recorded stock.
async function POSTHandler(request, { user }) {
  return NextResponse.json(await applyStockCorrection(await request.json(), user));
}

export const POST = withApiAuth(POSTHandler, {
  // The correction's reason is the start of what was found.
  texts: ({ report }) => [...Object.values(report || {}), typeof report?.incident === "string" && report.incident.trim().slice(0, 1000)],
});

export const dynamic = "force-dynamic";
