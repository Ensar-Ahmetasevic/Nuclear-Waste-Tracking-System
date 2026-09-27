import { NextResponse } from "next/server";
import { database } from "@/lib/server/database.cjs";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Names of the people of this organization, so records show who did something
// instead of an account number. Former accounts stay listed for their history.
async function GETHandler() {
  const rows = await database.userProfile.findMany({
    where: { organizationId: prisma.$organizationId },
    select: { id: true, displayName: true, username: true, email: true },
  });
  return NextResponse.json({
    people: Object.fromEntries(rows.map((row) => [row.id, row.displayName || row.username || row.email])),
  });
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
