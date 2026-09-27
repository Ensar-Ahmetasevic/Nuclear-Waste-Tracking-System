import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { applyStockCorrection } from "@/lib/server/stock-reconciliation";

// Only an administrator approves a correction of recorded stock.
async function POSTHandler(request, { user }) {
  return NextResponse.json(await applyStockCorrection(await request.json(), user));
}

export const POST = withApiAuth(POSTHandler);

export const dynamic = "force-dynamic";
