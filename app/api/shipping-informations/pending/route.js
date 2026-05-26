import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET request to fetch pending ShippingInformation filtered by hall ID (preStorageID)
export async function GET() {
  try {
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
  } catch (error) {
    console.error("Error fetching Pending Shipping Informations:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Pending Shipping Informations",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Update the status of the shipping information
export async function PATCH(request) {
  try {
    const { shippingStatusData } = await request.json();

    const { status, id } = shippingStatusData;

    const updatedShippingInformation = await prisma.shippingInformation.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedShippingInformation, { status: 200 });
  } catch (error) {
    console.error("Error updating shipping information status:", error);
    return NextResponse.json(
      {
        message: "Failed to update shipping information status",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
