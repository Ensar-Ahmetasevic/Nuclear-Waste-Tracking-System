import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Createing  data
async function POSTHandler(req, res) {
  const formData = await req.json();

  const {
    name,
    surname,
    dateOfBirth,
    address,
    qualifications,
    safetyTraining,
  } = formData;

  

  if (
    !name ||
    !surname ||
    !dateOfBirth ||
    !address ||
    !qualifications ||
    safetyTraining === undefined ||
    safetyTraining === null
  ) {
    return NextResponse.json(
      {
        message: "All fields are required",
      },
      { status: 400 },
    );
  }

  {
    await prisma.finalStorageResponsibleEmployee.create({
      data: {
        name,
        surname,
        dateOfBirth,
        address,
        qualifications,
        safetyTraining,
      },
    });

    return NextResponse.json(
      { message: "New Final-Storage Employee added successfully." },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const finalStorageEmployeeData =
      await prisma.finalStorageResponsibleEmployee.findMany({
        orderBy: { id: "desc" },
      });

    if (!finalStorageEmployeeData) {
      return NextResponse.json(
        {
          containerEmployeeData: [],
          message: "No Container Type information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ finalStorageEmployeeData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    await prisma.finalStorageResponsibleEmployee.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Final Storage Employee deleted successfully." },
      { status: 200 },
    );
  }
}

// Update container type

async function PUTHandler(req, res) {
  const { dataForUpdate } = await req.json();

  const {
    name,
    surname,
    dateOfBirth,
    address,
    qualifications,
    safetyTraining,
    id,
  } = dataForUpdate;

  if (
    !name ||
    !surname ||
    !dateOfBirth ||
    !address ||
    !qualifications ||
    safetyTraining === undefined ||
    safetyTraining === null
  ) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  {
    const updateContainerType =
      await prisma.finalStorageResponsibleEmployee.update({
        where: { id: parseInt(id) },
        data: {
          name,
          surname,
          dateOfBirth,
          address,
          qualifications,
          safetyTraining: Boolean(safetyTraining), // Ensure safetyTraining is stored as boolean,
        },
      });

    return NextResponse.json(
      {
        message: "Final Storage Employee updated successfully",
        updateContainerType,
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
