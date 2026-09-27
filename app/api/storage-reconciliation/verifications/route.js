import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { listStockVerifications, recordStockVerification } from "@/lib/server/stock-reconciliation";

async function GETHandler(request) {
  return NextResponse.json(await listStockVerifications(new URL(request.url).searchParams));
}

async function POSTHandler(request, { user }) {
  return NextResponse.json(await recordStockVerification(await request.json(), user));
}

const managers = { access: "member", allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] };
export const GET = withApiAuth(GETHandler, managers);
export const POST = withApiAuth(POSTHandler, managers);

export const dynamic = "force-dynamic";
