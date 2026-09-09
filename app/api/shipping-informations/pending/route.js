import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// GET request to fetch pending ShippingInformation filtered by hall ID (preStorageID)
async function GETHandler() {
  {
    const pendingShippingInformations =
      await prisma.shippingInformation.findMany({
        where: {
          status: "pending",
          containerProfiles: {
            some: {
              containerStatus: "pending",
              // Only include if at least one container is pending
            },
          },
        },
        include: {
          containerProfiles: {
            where: {
              containerStatus: "pending",
              // Only include pending containers
            },
            include: {
              wasteProfile: true,
            },
          },
        },
      });

    return NextResponse.json({ pendingShippingInformations }, { status: 200 });
  }
}

// Update the status of the shipping information
async function PATCHHandler(request) {
  {
    const { shippingStatusData } = await request.json();

    const { status, id } = shippingStatusData;

    const updatedShippingInformation = await prisma.shippingInformation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedShippingInformation, { status: 200 });
  }
}

export const GET = withApiAuth(GETHandler);
export const PATCH = withApiAuth(PATCHHandler, { bodyObjects: ["shippingStatusData"] });

export const dynamic = "force-dynamic";
