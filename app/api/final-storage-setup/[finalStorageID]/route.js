import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET request to fetch Final Storage data by ID
export async function GET(req, { params }) {
  const { finalStorageID } = params;

  try {
    const finalStorageDataById = await prisma.finalStorageLocation.findUnique({
      where: { id: parseInt(finalStorageID) },
      include: {
        storageTransferRequests: {
          include: {
            requestedByEmployee: true,
          },
        },
        finalStorageConditions: {
          include: {
            finalStorageResponsibleEmployee: true,
          },
        },
      },
    });

    if (!finalStorageDataById) {
      return NextResponse.json(
        { message: "Final Storage Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ finalStorageDataById }, { status: 200 });
  } catch (error) {
    console.error("Error fetching Final Storage data by ID:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Final Storage Loaction",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
