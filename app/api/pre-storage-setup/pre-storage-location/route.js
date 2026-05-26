import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Createing  data
export async function POST(req, res) {
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

  try {
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
  } catch (error) {
    console.error("Faild to create Pre-Storage Location: ", error);
    return NextResponse.json(
      { message: "Failed to create Pre-Storage Location" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data
export async function GET() {
  try {
    const preStorageLocationData = await prisma.preStorageLocation.findMany({
      orderBy: { id: "desc" },
      include: {
        preStorageEntry: true,
      },
    });

    if (!preStorageLocationData) {
      return NextResponse.json(
        {
          preStorageLocationData: null,
          message: "No Pre-Storage Location information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ preStorageLocationData }, { status: 200 });
  } catch (error) {
    console.error("Faild to fetch Pre-Storage Location: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Pre-Storage Location.",
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
    await prisma.preStorageLocation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Pre-Storage Location deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to delete Pre-Storage Location. ", error);
    return NextResponse.json(
      {
        message: "Faild to delete Pre-Storage Location. ",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Update preStorage Location

export async function PUT(req, res) {
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

  try {
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
  } catch (error) {
    console.error("Faild to update Pre-Storage Location.", error);
    return NextResponse.json(
      {
        message: "Faild to update Pre-Storage Location.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
