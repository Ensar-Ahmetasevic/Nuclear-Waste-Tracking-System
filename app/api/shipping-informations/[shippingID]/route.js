import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET request to fetch shipping information by ID
export async function GET(req, { params }) {
  const { shippingID } = params;

  try {
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
  } catch (error) {
    console.error("Error fetching Shipping data by id:", error);
    return NextResponse.json(
      { message: "Failed to fetch Shipping Information", error: error.message },
      { status: 500 },
    );
  }
}
