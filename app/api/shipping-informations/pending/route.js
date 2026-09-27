import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { reportsFor } from "@/lib/server/receipt-rejections";

// GET request to fetch pending ShippingInformation filtered by hall ID (preStorageID)
async function GETHandler() {
  {
    const pendingShippingInformations =
      await prisma.shippingInformation.findMany({
        where: {
          status: "pending",
          truckStatus: "IN",
          containerProfiles: {
            some: {
              containerStatus: "pending",
              // Only include if at least one container is pending
            },
          },
        },
        select: {
          id: true, companyName: true, registrationPlates: true, status: true,
          containerProfiles: {
            where: {
              containerStatus: "pending",
              // Only include pending containers
            },
            include: {
              wasteProfile: {include:{containerType:true}},
              locationOrigin: {select:{name:true}},
            },
          },
        },
      });

    // Earlier returns of a profile that Step 1 or Supervision resent, for the new review.
    const reports = await reportsFor(pendingShippingInformations);
    for (const shipment of pendingShippingInformations)
      for (const profile of shipment.containerProfiles)
        profile.returnHistory = reports.filter((report) => report.profiles.some((row) => row.containerProfileId === profile.id));
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
export const PATCH = withApiAuth(PATCHHandler, { access: "member", bodyObjects: ["shippingStatusData"] });

export const dynamic = "force-dynamic";
