import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { shipmentTimeline } from "@/lib/server/shipment-timeline";
import { rejectionReports } from "@/lib/server/receipt-rejections";

async function GETHandler(req, { params, user }) {
  const { removalID } = await params;
  const removal = await prisma.shipmentRemoval.findUniqueOrThrow({ where: { id: Number(removalID) },
    select: { id: true, shipmentId: true, actorId: true, reason: true, before: true, createdAt: true } });
  return NextResponse.json({ removal, timeline: await shipmentTimeline(removal.before, user.role === "ADMINISTRATOR", true, await rejectionReports(removal.before)) });
}
export const GET = withApiAuth(GETHandler, { allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] });
