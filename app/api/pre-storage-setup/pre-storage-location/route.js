import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Createing  data
async function POSTHandler(req, res) {
  const formData = await req.json();

  const {
    name,
    surfaceArea,
    containerFootprint,
    preStorageFor,
    containerType,
    wasteProfile,
  } = formData;

  if (
    !name ||
    !surfaceArea ||
    !containerFootprint ||
    !containerType ||
    !wasteProfile ||
    !preStorageFor
  ) {
    return NextResponse.json(
      {
        message:
          "Backend: All fields are required and surface area must be a valid number",
      },
      { status: 400 },
    );
  }

  // Ensure surfaceArea is a valid number
  const surfaceAreaNumber = surfaceArea.toFixed(2);
  const containerFootprintNumber = containerFootprint.toFixed(2);
  // Store up to two decimal places but it returns a string so befor seding to the database we need to convert it to a number again

  {
    await prisma.preStorageLocation.create({
      data: {
        name,
        surfaceArea: parseInt(surfaceAreaNumber),
        containerFootprint: parseInt(containerFootprintNumber),
        preStorageFor,
        containerType,
        wasteProfile,
      },
    });

    return NextResponse.json(
      { message: "New Pre-Storage Location added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const preStorageLocationData = await prisma.preStorageLocation.findMany({
      orderBy: { id: "desc" },
      include: {
        preStorageEntry: true,
      },
    });

    if (!preStorageLocationData) {
      return NextResponse.json(
        {
          preStorageLocationData: [],
          message: "No Pre-Storage Location information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ preStorageLocationData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.preStorageLocation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Pre-Storage Location deleted successfully." },
      { status: 200 },
    );
  }
}

// Update preStorage Location

async function PUTHandler(req, res) {
  const { dataForUpdate } = await req.json();

  const {
    name,
    surfaceArea,
    containerFootprint,
    preStorageFor,
    containerType,
    wasteProfile,
    id,
  } = dataForUpdate;

  // Ensure surfaceArea is a valid number
  const surfaceAreaNumber = parseFloat(parseFloat(surfaceArea).toFixed(2));
  const containerFootprintNumber = parseFloat(
    parseFloat(containerFootprint).toFixed(2),
  );
  // Store up to two decimal places but it returns a string so befor seding to the database we need to convert it to a number again

  if (
    !name ||
    !surfaceAreaNumber ||
    !containerFootprint ||
    !preStorageFor ||
    !containerType ||
    !wasteProfile ||
    isNaN(surfaceAreaNumber)
  ) {
    return NextResponse.json(
      {
        message:
          "Backend: All fields are required and surface area must be a valid number",
      },
      { status: 400 },
    );
  }

  {
    const updatePreStorageLocation = await prisma.preStorageLocation.update({
      where: { id: parseInt(id) },
      data: {
        name,
        containerType,
        wasteProfile,
        preStorageFor,
        surfaceArea: surfaceAreaNumber,
        containerFootprint: containerFootprintNumber,
      },
    });

    return NextResponse.json(
      {
        message: "Pre-Storage Location updated successfully",
        updatePreStorageLocation,
      },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["dataForUpdate"] });

export const dynamic = "force-dynamic";
