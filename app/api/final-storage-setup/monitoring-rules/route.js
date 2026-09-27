import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { monitoringRules, saveMonitoringRule } from "@/lib/server/monitoring";

// Everyone in the area reads the ranges that classify measurements; only an
// administrator adds a new version, with the reference of who confirmed it.
async function GETHandler(request) {
  return NextResponse.json(await monitoringRules("FINAL_STORAGE", new URL(request.url).searchParams));
}

async function POSTHandler(request, { user }) {
  return NextResponse.json(await saveMonitoringRule("FINAL_STORAGE", await request.json(), user));
}

export const GET = withApiAuth(GETHandler);
export const POST = withApiAuth(POSTHandler);

export const dynamic = "force-dynamic";
