import { NextResponse } from "next/server";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Creating data

export async function POST(req, res) {
  const formData = await req.json();

  const {
    quantity,
    finalStorageLocationId,
    responsibleFinalStorageEmployeeId,
  } = formData;

  if (
    !quantity ||
    !finalStorageLocationId ||
    !responsibleFinalStorageEmployeeId
  ) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.finalStorageEntry.create({
      data: {
        quantity,
        finalStorageLocationId,
        responsibleFinalStorageEmployeeId,
      },
    });

    return NextResponse.json(
      { message: "New Final-Storage Waste add successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to creat Final-Storage Type:", error);
    return NextResponse.json(
      { message: "Faild to add Final-Storage Waste" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data

export async function GET() {
  try {
    const finalStorageOfCapacityData = await prisma.finalStorageEntry.findMany({
      orderBy: {
        id: "desc",
      },
    });

    if (finalStorageOfCapacityData.length === 0) {
      return NextResponse.json(
        {
          finalStorageOfCapacityData: null,
          message: "No Final Storage Of Waste data available.",
        },
        { status: 204 }, // No Content
      );
    }

    return NextResponse.json(
      { finalStorageOfCapacityData, message: "Data fetched successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch FinalStorage Of Waste Data.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
