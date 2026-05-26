import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Creating  data
export async function POST(req, res) {
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

  try {
    await prisma.shippingInformation.create({
      data: { companyName, driverName, registrationPlates, truckStatus: "IN" },
    });

    return NextResponse.json(
      { message: "New Shipping Information added successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create Shipping Information." },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data

export async function GET(req, res) {
  try {
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
        { shippingData: null, message: "No shipping information available" },
        { status: 200 },
      );
    }

    return NextResponse.json({ shippingData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch Shipping Information Data.222",
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
    await prisma.shippingInformation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Shipping Information deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to to catch Shipping Informations data." },
      { status: 500 },
      { error: error.message },
    );
  }
}

// Update truck data profile

export async function PUT(req) {
  const { updatedTruckData } = await req.json();

  const { id, companyName, driverName, registrationPlates } = updatedTruckData;

  if (!id || !companyName || !driverName || !registrationPlates) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  try {
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
  } catch (error) {
    console.error("Error updating Truck Data:", error);
    return NextResponse.json(
      { message: "Failed to update Truck Data", error: error.message },
      { status: 500 },
    );
  }
}

// Update Shipping STATUS

export async function PATCH(req) {
  const { shippingStatusData } = await req.json();

  const { id, truckStatus, exitDateTime } = shippingStatusData;

  if (!id || !truckStatus) {
    return res.status(400).json({ message: "ID and status are required" });
  }

  try {
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
  } catch (error) {
    console.error("Error updating Shipping Status:", error);
    return NextResponse.json(
      { message: "Failed to update Shipping Status", error: error.message },
      { status: 500 },
    );
  }
}
