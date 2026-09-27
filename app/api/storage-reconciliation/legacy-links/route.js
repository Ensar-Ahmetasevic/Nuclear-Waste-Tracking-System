import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { legacyLinkCandidates, linkLegacyReceipt } from "@/lib/server/stock-reconciliation";

async function GETHandler() {
  return NextResponse.json(await legacyLinkCandidates());
}

// Linking changes which receipts can be transfer sources, so only administrators confirm it.
async function POSTHandler(request, { user }) {
  return NextResponse.json(await linkLegacyReceipt(await request.json(), user));
}

export const GET = withApiAuth(GETHandler, { allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] });
export const POST = withApiAuth(POSTHandler);

export const dynamic = "force-dynamic";
