import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { alertAction, alertDetail, listAlerts } from "@/lib/server/monitoring";

// Condition alerts of this work area. Reading also records overdue measurements
// and passed escalation deadlines, because there is no background job.
async function GETHandler(request) {
  const params = new URL(request.url).searchParams;
  if (params.has("alertId")) return NextResponse.json(await alertDetail("PRE_STORAGE", Number(params.get("alertId"))));
  return NextResponse.json(await listAlerts("PRE_STORAGE", params));
}

async function POSTHandler(request, { user }) {
  return NextResponse.json(await alertAction("PRE_STORAGE", await request.json(), user));
}

export const GET = withApiAuth(GETHandler);
export const POST = withApiAuth(POSTHandler, { access: "member" });

export const dynamic = "force-dynamic";
