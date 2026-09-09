import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Createing  data
async function POSTHandler(req, res) {
  const formData = await req.json();
  const { name, address, origin } = formData;

  if (!formData) {
    return NextResponse.json(
      { message: "Backend: `Did not recive data from Location Origin form`" },
      { status: 200 },
    );
  }

  {
    await prisma.locationOrigin.create({ data: { name, address, origin } });

    return NextResponse.json(
      { message: "New Location Origin added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const locationOriginData = await prisma.locationOrigin.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ locationOriginData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.locationOrigin.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Location Origin deleted successfully." },
      { status: 200 },
    );
  }
}

// Update

async function PUTHandler(req, res) {
  const { dataForUpdate } = await req.json();

  const { name, address, origin, id } = dataForUpdate;

  if (!name || !address || !origin || !id) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  {
    const updateLocationOrigin = await prisma.locationOrigin.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        origin,
      },
    });

    return NextResponse.json(
      { message: "Location Origin updated successfully", updateLocationOrigin },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler);
export const PUT = withApiAuth(PUTHandler, { bodyObjects: ["dataForUpdate"] });

export const dynamic = "force-dynamic";
