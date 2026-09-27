import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { listDefinitionChanges } from "@/lib/server/definition-changes";

async function GETHandler(request) {
  return NextResponse.json(await listDefinitionChanges(new URL(request.url).searchParams));
}

export const GET = withApiAuth(GETHandler, { allowedRoles: ["ADMINISTRATOR"] });

export const dynamic = "force-dynamic";
