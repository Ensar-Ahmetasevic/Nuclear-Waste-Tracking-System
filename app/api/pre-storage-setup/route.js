import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating data

async function POSTHandler(req, res) {
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

  {
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
  }
}

// Fetch data

async function GETHandler() {
  {
    const preStorageOfCapacityData = await prisma.preStorageEntry.findMany({
      orderBy: {
        id: "desc",
      },
    });

    if (preStorageOfCapacityData.length === 0) {
      return NextResponse.json(
        {
          preStorageOfCapacityData: [],
          message: "No PreStorage Of Waste data available.",
        },
        { status: 200 }, // No Content
      );
    }

    return NextResponse.json(
      { preStorageOfCapacityData, message: "Data fetched successfully" },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
