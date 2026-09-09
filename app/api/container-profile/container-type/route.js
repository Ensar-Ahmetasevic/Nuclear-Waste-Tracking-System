import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Createing  data
async function POSTHandler(req, res) {
  const formData = await req.json();
  const {
    name,
    material,
    volume,
    carryingCapacity,
    radioactivityLevel,
    physicalProperties,
    footprint,
    description,
  } = formData;

  if (!formData) {
    return NextResponse.json(
      { message: "Backend: `Did not receive data from Container Type form`" },
      { status: 200 },
    );
  }

  // Parse data from string to float
  const parsedVolume = parseFloat(volume);
  const parsedCarryingCapacity = parseFloat(carryingCapacity);
  const parsedFootprint = parseFloat(footprint);

  {
    await prisma.containerType.create({
      data: {
        name,
        material,
        volume: parsedVolume,
        carryingCapacity: parsedCarryingCapacity,
        radioactivityLevel,
        physicalProperties,
        footprint: parsedFootprint,
        description,
      },
    });

    return NextResponse.json(
      { message: "New Container Type added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const containerTypeData = await prisma.containerType.findMany({
      orderBy: { id: "desc" },
    });

    if (!containerTypeData) {
      return NextResponse.json(
        {
          containerProfileData: [],
          message: "No Container Type information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ containerTypeData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.containerType.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Container Type deleted successfully." },
      { status: 200 },
    );
  }
}

// Update container type

async function PUTHandler(req, res) {
  const { preparedData } = await req.json();

  const {
    name,
    material,
    volume,
    carryingCapacity,
    radioactivityLevel,
    physicalProperties,
    footprint,
    description,
    id,
  } = preparedData;

  if (!name || 
    !material || 
    !volume || 
    !carryingCapacity || 
    !radioactivityLevel || 
    !physicalProperties || 
    !footprint || 
    !description || 
    !id) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  {
    const updateContainerType = await prisma.containerType.update({
      where: { id: parseInt(id) },
      data: {
        name: name,
        material: material,
        volume: parseInt(volume),
        carryingCapacity: parseInt(carryingCapacity),
        radioactivityLevel: radioactivityLevel,
        physicalProperties: physicalProperties,
        footprint: parseInt(footprint),
        description: description,
      },
    });

    return NextResponse.json(
      { message: "Container Type updated successfully", updateContainerType },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["preparedData"] });

export const dynamic = "force-dynamic";
