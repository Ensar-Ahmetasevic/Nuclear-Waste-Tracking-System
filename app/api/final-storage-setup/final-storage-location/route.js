import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Createing  data
export async function POST(req, res) {
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

  try {
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
  } catch (error) {
    console.error("Faild to create Final-Storage Location: ", error);
    return NextResponse.json(
      { message: "Failed to create Final-Storage Location" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data
export async function GET() {
  try {
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
          finalStorageLocationData: null,
          message: "No Final-Storage Location information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ finalStorageLocationData }, { status: 200 });
  } catch (error) {
    console.error("Faild to fetch Final-Storage Location: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Final-Storage Location.",
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
    await prisma.finalStorageLocation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Final-Storage Location deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to delete Final-Storage Location. ", error);
    return NextResponse.json(
      {
        message: "Faild to delete Final-Storage Location. ",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Update FinalStorage Location

export async function PUT(req, res) {
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

  try {
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
  } catch (error) {
    console.error("Faild to update Final-Storage Location.", error);
    return NextResponse.json(
      {
        message: "Faild to update Final-Storage Location.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
