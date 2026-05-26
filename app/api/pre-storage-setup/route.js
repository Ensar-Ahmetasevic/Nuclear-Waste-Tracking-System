import { NextResponse } from "next/server";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Creating data

export async function POST(req, res) {
  const formData = await req.json();

  const { quantity, preStorageLocationId, responsiblePreStorageEmployeeId } =
    formData;

  if (!quantity || !preStorageLocationId || !responsiblePreStorageEmployeeId) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.preStorageEntry.create({
      data: {
        quantity,
        preStorageLocationId,
        responsiblePreStorageEmployeeId,
      },
    });

    return NextResponse.json(
      { message: "New Pre-Storage Waste add successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to creat Pre-Storage Type:", error);
    return NextResponse.json(
      { message: "Faild to add Pre-Storage Waste" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data

export async function GET() {
  try {
    const preStorageOfCapacityData = await prisma.preStorageEntry.findMany({
      orderBy: {
        id: "desc",
      },
    });

    if (preStorageOfCapacityData.length === 0) {
      return NextResponse.json(
        {
          preStorageOfCapacityData: null,
          message: "No PreStorage Of Waste data available.",
        },
        { status: 204 }, // No Content
      );
    }

    return NextResponse.json(
      { preStorageOfCapacityData, message: "Data fetched successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch preStorage Of Waste Data.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
