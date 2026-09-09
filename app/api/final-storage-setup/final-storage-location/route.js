import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Createing  data
async function POSTHandler(req, res) {
  const formData = await req.json();

  const { name, surfaceArea, containerFootprint, depth, containerType } =
    formData;

  if (
    !name ||
    !surfaceArea ||
    !containerFootprint ||
    !depth ||
    !containerType
  ) {
    return NextResponse.json(
      {
        message: "All fields are required",
      },
      { status: 400 },
    );
  }

  // Ensure surfaceArea is a valid number
  const surfaceAreaNumber = surfaceArea.toFixed(2);
  const containerFootprintNumber = containerFootprint.toFixed(2);
  const depthNumber = depth.toFixed(2);
  // Store up to two decimal places but it returns a string so befor seding
  // to the database we need to convert it to a number again

  {
    await prisma.finalStorageLocation.create({
      data: {
        name,
        surfaceArea: parseInt(surfaceAreaNumber),
        containerFootprint: parseInt(containerFootprintNumber),
        depth: parseInt(depthNumber),
        containerType,
      },
    });

    return NextResponse.json(
      { message: "New Final-Storage Location added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const finalStorageLocationData = await prisma.finalStorageLocation.findMany(
      {
        orderBy: { id: "desc" },
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
      },
    );

    if (!finalStorageLocationData) {
      return NextResponse.json(
        {
          finalStorageLocationData: [],
          message: "No Final-Storage Location information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ finalStorageLocationData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.finalStorageLocation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Final-Storage Location deleted successfully." },
      { status: 200 },
    );
  }
}

// Update FinalStorage Location

async function PUTHandler(req, res) {
  const { dataForUpdate } = await req.json();

  const { id, name, surfaceArea, containerFootprint, depth, containerType } =
    dataForUpdate;

  // Ensure surfaceArea is a valid number
  const surfaceAreaNumber = parseFloat(parseFloat(surfaceArea).toFixed(2));
  const containerFootprintNumber = parseFloat(
    parseFloat(containerFootprint).toFixed(2),
  );
  const depthNumber = parseFloat(parseFloat(depth).toFixed(2));
  // Store up to two decimal places but it returns a string so befor seding to the database we need to convert it to a number again

  if (
    !name ||
    !surfaceAreaNumber ||
    !containerFootprintNumber ||
    !depthNumber ||
    !containerType ||
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
    const updateFinalStorageLocation = await prisma.finalStorageLocation.update(
      {
        where: { id: parseInt(id) },
        data: {
          name,
          containerType,
          depth: depthNumber,
          surfaceArea: surfaceAreaNumber,
          containerFootprint: containerFootprintNumber,
        },
      },
    );

    return NextResponse.json(
      {
        message: "Final-Storage Location updated successfully",
        updateFinalStorageLocation,
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
