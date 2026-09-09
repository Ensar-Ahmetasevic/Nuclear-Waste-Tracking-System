import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// GET request to fetch Pre Storage data by ID
async function GETHandler(req, { params }) {
  const { preStorageID } = await params;

  {
    const preStorageDataById = await prisma.preStorageLocation.findUnique({
      where: { id: parseInt(preStorageID) },
      include: {
        preStorageEntry: true,
        preStorageConditions: {
          include: {
            preStorageResponsibleEmployee: true,
          },
        },
      },
    });

    if (!preStorageDataById) {
      return NextResponse.json(
        { message: "Pre Storage Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ preStorageDataById }, { status: 200 });
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
