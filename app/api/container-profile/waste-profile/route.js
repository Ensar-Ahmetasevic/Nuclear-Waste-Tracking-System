import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { HttpError } from "@/lib/server/errors.cjs";
import { withApiAuth } from "@/lib/server/api-route";

async function assertContainerTypeAvailable(containerTypeId, currentId) {
  if (!Number.isSafeInteger(containerTypeId) || containerTypeId <= 0) throw new HttpError(400, "Select a valid container type");
  await prisma.containerType.findUniqueOrThrow({ where: { id: containerTypeId } });
  const assigned = await prisma.wasteProfile.findFirst({ where: { containerTypeId } });
  if (assigned && assigned.id !== currentId) {
    throw new HttpError(409, `This container type is already assigned to waste profile "${assigned.name}". Choose an unused type or keep the current type.`);
  }
}

// Createing  data
async function POSTHandler(req, res) {
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

  {
    await assertContainerTypeAvailable(parseInt(recommendationsForTransport));
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
  }
}

// Fetch data
async function GETHandler() {
  {
    const wasteProfileData = await prisma.wasteProfile.findMany({
      orderBy: { id: "desc" },
      include: { containerType: true },
    });

    return NextResponse.json({ wasteProfileData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.wasteProfile.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Waste Profile deleted successfully." },
      { status: 200 },
    );
  }
}

// Update container type

async function PUTHandler(req, res) {
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

  if (!name || 
    !typeOfWaste || 
    !wasteDescription || 
    !risksAndHazards || 
    !processingMethods || 
    !chemicalProperties || 
    !physicalProperties || 
    !biologicalProperties || 
    !collectionProcedures || 
    !containerTypeId || 
    !id) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  {
    await prisma.wasteProfile.findUniqueOrThrow({ where: { id: parseInt(id) } });
    await assertContainerTypeAvailable(parseInt(containerTypeId), parseInt(id));
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
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["dataForUpdate"] });

export const dynamic = "force-dynamic";
