import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating  data
async function POSTHandler(req, res) {
  const formData = await req.json();

  const { companyName, driverName, registrationPlates } = formData;

  if (!companyName || !driverName || !registrationPlates) {
    return NextResponse.json(
      {
        message:
          "All fields are required: companyName, driverName, registrationPlates",
      },
      { status: 400 },
    );
  }

  {
    await prisma.shippingInformation.create({
      data: { companyName, driverName, registrationPlates, truckStatus: "IN" },
    });

    return NextResponse.json(
      { message: "New Shipping Information added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data

async function GETHandler(req, res) {
  {
    const shippingData = await prisma.shippingInformation.findMany({
      orderBy: {
        entryDateTime: "desc",
      },
      include: {
        containerProfiles: {
          include: {
            locationOrigin: true,
            wasteProfile: {
              include: {
                containerType: true,
              },
            },
          },
        },
      },
    });

    if (!shippingData) {
      return NextResponse.json(
        { shippingData: [], message: "No shipping information available" },
        { status: 200 },
      );
    }

    return NextResponse.json({ shippingData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.shippingInformation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Shipping Information deleted successfully." },
      { status: 200 },
    );
  }
}

// Update truck data profile

async function PUTHandler(req) {
  const { updatedTruckData } = await req.json();

  const { id, companyName, driverName, registrationPlates } = updatedTruckData;

  if (!id || !companyName || !driverName || !registrationPlates) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  {
    const updateTruckData = await prisma.shippingInformation.update({
      where: { id: parseInt(id) },
      data: {
        companyName,
        driverName,
        registrationPlates,
      },
    });

    return NextResponse.json(
      { message: "Truck Data updated successfully.", updateTruckData },
      { status: 200 },
    );
  }
}

// Update Shipping STATUS

async function PATCHHandler(req) {
  const { shippingStatusData } = await req.json();

  const { id, truckStatus, exitDateTime } = shippingStatusData;

  if (!id || !truckStatus) {
    return NextResponse.json({ message: "ID and status are required" }, { status: 400 });
  }

  {
    const updateTruckData = await prisma.shippingInformation.update({
      where: { id: parseInt(id) },
      data: {
        truckStatus,
        exitDateTime,
      },
    });

    return NextResponse.json(
      { message: "Shipping Status updated successfully.", updateTruckData },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["updatedTruckData"] });
export const PATCH = withApiAuth(PATCHHandler, { bodyObjects: ["shippingStatusData"] });

export const dynamic = "force-dynamic";
