import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Createing  data
export async function POST(req, res) {
  const formData = await req.json();

  const {
    name,
    typeOfWaste,
    wasteDescription,
    risksAndHazards,
    processingMethods,
    physicalProperties,
    chemicalProperties,
    biologicalProperties,
    collectionProcedures,
    recommendationsForTransport,
  } = formData;

  if (!formData) {
    return NextResponse.json(
      { message: "Backend: `Did not receive data from Waste Profile form`" },
      { status: 200 },
    );
  }

  try {
    await prisma.wasteProfile.create({
      data: {
        name,
        typeOfWaste,
        wasteDescription,
        risksAndHazards,
        processingMethods,
        physicalProperties,
        chemicalProperties,
        biologicalProperties,
        collectionProcedures,
        containerTypeId: parseInt(recommendationsForTransport),
      },
    });

    return NextResponse.json(
      { message: "New Waste Profile added successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to create Waste Profile: ", error);
    return NextResponse.json(
      { message: "Failed to create Waste Profile" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data
export async function GET() {
  try {
    const wasteProfileData = await prisma.wasteProfile.findMany({
      orderBy: { id: "desc" },
      include: { containerType: true },
    });

    return NextResponse.json({ wasteProfileData }, { status: 200 });
  } catch (error) {
    console.error("Failed to catch Waste Profile Data: ", error);
    return NextResponse.json(
      { message: "Failed to catch Waste Profile Data." },
      { status: 500 },
      { error: error.message },
    );
  }
}

//  Delete data

export async function DELETE(req) {
  const { id } = await req.json();

  try {
    await prisma.wasteProfile.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Waste Profile deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete Waste Profile: ", error);
    return NextResponse.json(
      { message: "Failed to delete Waste Profile data." },
      { status: 500 },
      { error: error.message },
    );
  }
}

// Update container type

export async function PUT(req, res) {
  const { dataForUpdate } = await req.json();

  const {
    name,
    typeOfWaste,
    wasteDescription,
    risksAndHazards,
    processingMethods,
    physicalProperties,
    chemicalProperties,
    biologicalProperties,
    collectionProcedures,
    containerTypeId,
    id,
  } = dataForUpdate;

  if (
    (!name,
    !typeOfWaste,
    !wasteDescription,
    !risksAndHazards,
    !processingMethods,
    !chemicalProperties,
    !physicalProperties,
    !biologicalProperties,
    !collectionProcedures,
    !containerTypeId,
    !id)
  ) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  try {
    const updateWasteProfile = await prisma.wasteProfile.update({
      where: { id: parseInt(id) },
      data: {
        name,
        typeOfWaste,
        wasteDescription,
        risksAndHazards,
        processingMethods,
        physicalProperties,
        chemicalProperties,
        biologicalProperties,
        collectionProcedures,
        containerTypeId: parseInt(containerTypeId),
      },
    });

    return NextResponse.json(
      { message: "Waste Profile updated successfully", updateWasteProfile },
      { status: 200 },
    );
  } catch (error) {
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("containerTypeId")
    ) {
      return NextResponse.json(
        {
          message:
            "The selected container type is already assigned to another waste profile. Please select a different container type.",
          error:
            "The selected container type is already assigned to another waste profile. Please select a different container type.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Error updating waste profile", error: error.message },
      { status: 500 },
    );
  }
}
