import { storageBalances } from "@/lib/server/storage-balances";
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

    const sources = await prisma.transferSource.findMany({
      where: { destinationId: finalStorageDataById.id, state: { in: ["reserved", "completed"] } },
      orderBy: { id: "asc" },
      select: { id: true, transferId: true, receiptAllocationId: true, containerProfileId: true, shipmentId: true, locationId: true, quantity: true, state: true },
    });
    finalStorageDataById.storageTransferRequests = finalStorageDataById.storageTransferRequests.map(request => {
      const linkedSources = sources.filter(source => source.transferId === request.id);
      return { ...request, sources: linkedSources, source: linkedSources.length === 1 ? linkedSources[0] : null };
    });
    finalStorageDataById.inventory = (await storageBalances()).final.find(row => row.id === finalStorageDataById.id)?.inventory;
    return NextResponse.json({ finalStorageDataById }, { status: 200 });
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
