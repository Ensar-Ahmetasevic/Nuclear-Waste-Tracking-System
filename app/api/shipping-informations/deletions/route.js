import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";

async function GETHandler(req) {
  const value = Number(new URL(req.url).searchParams.get("page") || 1);
  const total = await prisma.shipmentRemoval.count();
  const pages = Math.max(1, Math.ceil(total / 10));
  const page = Math.min(Number.isSafeInteger(value) && value > 0 ? value : 1, pages);
  const removals = await prisma.shipmentRemoval.findMany({ orderBy: { id: "desc" }, skip: (page - 1) * 10, take: 10,
    select: { id: true, shipmentId: true, actorId: true, reason: true, before: true, createdAt: true } });
  return NextResponse.json({ removals, total, page, pages });
}
export const GET = withApiAuth(GETHandler, { allowedRoles: ["ADMINISTRATOR", "SUPERVISION"] });
