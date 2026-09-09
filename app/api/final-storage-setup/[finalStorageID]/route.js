import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// GET request to fetch Final Storage data by ID
async function GETHandler(req, { params }) {
  const { finalStorageID } = await params;

  {
    const finalStorageDataById = await prisma.finalStorageLocation.findUnique({
      where: { id: parseInt(finalStorageID) },
      include: {
        storageTransferRequests: {
          include: {
            requestedByEmployee: true,
          },
        },
        finalStorageConditions: {
          include: {
            finalStorageResponsibleEmployee: true,
          },
        },
      },
    });

    if (!finalStorageDataById) {
      return NextResponse.json(
        { message: "Final Storage Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ finalStorageDataById }, { status: 200 });
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
