import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Creating  data
export async function POST(req, res) {
  const formData = await req.json();

  const { quantity, locationOriginId, wasteProfileId, shippingInformationId } =
    formData;

  if (
    !quantity ||
    !locationOriginId ||
    !wasteProfileId ||
    !shippingInformationId
  ) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  // Parse data from string to integer
  const parsedQuantity = parseInt(quantity);
  const parsedLocationOriginId = parseInt(locationOriginId);
  const parsedWasteProfileId = parseInt(wasteProfileId);
  const parsedShippingInformationId = parseInt(shippingInformationId);

  try {
    await prisma.containerProfile.create({
      data: {
        quantity: parsedQuantity,
        containerStatus: "pending",
        locationOriginId: parsedLocationOriginId,
        wasteProfileId: parsedWasteProfileId,
        shippingInformationId: parsedShippingInformationId,
      },
    });

    return NextResponse.json(
      {
        message: "New Container Profile added successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating Container Profile:", error);
    return NextResponse.json(
      { message: "Failed to create Container Profile", error: error.message },
      { status: 500 },
    );
  }
}

// Fetch data
export async function GET() {
  try {
    const containerProfileData = await prisma.containerProfile.findMany({
      orderBy: { id: "desc" },
    });

    if (!containerProfileData) {
      return NextResponse.json(
        {
          containerProfileData: null,
          message: "No container information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ containerProfileData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch Shipping Information Data.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

//  Delete data

export async function DELETE(req) {
  const { id } = await req.json();

  try {
    await prisma.containerProfile.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json(
      { message: "Container Profile deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to delete Container Profile data.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Update container profile on the Entry Form

export async function PUT(req) {
  const { preparedData } = await req.json();

  const { id, quantity, locationOrigin, wasteProfile } = preparedData;

  if (!id || !quantity || !locationOrigin || !wasteProfile) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  try {
    const updatedProfile = await prisma.containerProfile.update({
      where: { id: parseInt(id) },
      data: {
        quantity: parseInt(quantity),
        locationOriginId: parseInt(locationOrigin),
        wasteProfileId: parseInt(wasteProfile),
        containerStatus: "pending",
      },
    });

    return NextResponse.json(
      { message: "Container Profile updated successfully.", updatedProfile },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating Container Profile:", error);
    return NextResponse.json(
      { message: "Failed to update Container Profile", error: error.message },
      { status: 500 },
    );
  }
}

// Update container profile STATUS in the hall

export async function PATCH(request) {
  try {
    const { containerStatusUpdateData } = await request.json();

    const { containerProfileId, containerStatus } = containerStatusUpdateData;

    // Step 1: Update container status for specific container in a hall
    // and we are using this when we are updating the container status in the hall

    const updatedContainer = await prisma.containerProfile.update({
      where: { id: containerProfileId },
      data: { containerStatus: containerStatus },
    });

    // Step 2: Check if all containers for the same shipping information are accepted
    const relatedContainers = await prisma.containerProfile.findMany({
      where: { shippingInformationId: updatedContainer.shippingInformationId },
    });

    const allAccepted = relatedContainers.every(
      (container) => container.containerStatus === "accepted",
    );

    // Step 3: If all are accepted, update ShippingInformation status
    if (allAccepted) {
      await prisma.shippingInformation.update({
        where: { id: updatedContainer.shippingInformationId },
        data: { status: "accepted" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating container status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
