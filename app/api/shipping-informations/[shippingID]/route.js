import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// GET request to fetch shipping information by ID
async function GETHandler(req, { params }) {
  const { shippingID } = await params;

  {
    const shippingData = await prisma.shippingInformation.findUnique({
      where: { id: parseInt(shippingID) },
      include: {
        containerProfiles: {
          include: {
            locationOrigin: true,
            wasteProfile: true,
          },
        },
      },
    });

    if (!shippingData) {
      return NextResponse.json(
        { message: "Shipping Information not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ shippingData }, { status: 200 });
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
