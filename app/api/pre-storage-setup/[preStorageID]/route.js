import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET request to fetch Pre Storage data by ID
export async function GET(req, { params }) {
  const { preStorageID } = params;

  try {
    const preStorageDataById = await prisma.preStorageLocation.findUnique({
      where: { id: parseInt(preStorageID) },
      include: {
        preStorageEntry: true,
        preStorageConditions: {
          include: {
            preStorageResponsibleEmployee: true,
          },
        },
      },
    });

    if (!preStorageDataById) {
      return NextResponse.json(
        { message: "Pre Storage Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ preStorageDataById }, { status: 200 });
  } catch (error) {
    console.error("Error fetching Pre Storage data by ID:", error);
    return NextResponse.json(
      { message: "Failed to fetch Pre Storage Loaction", error: error.message },
      { status: 500 },
    );
  }
}
