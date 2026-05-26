import { NextResponse } from "next/server";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Createing  data
export async function POST(req, res) {
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
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.preStorageResponsibleEmployee.create({
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
      { message: "New Pre-Storage Employee added successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to create Pre-Storage Employee: ", error);
    return NextResponse.json(
      { message: "Failed to create Pre-Storage Employee" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}

// Fetch data
export async function GET() {
  try {
    const preStorageEmployeeData =
      await prisma.preStorageResponsibleEmployee.findMany({
        orderBy: { id: "desc" },
      });

    if (!preStorageEmployeeData) {
      return NextResponse.json(
        {
          containerEmployeeData: null,
          message: "No Container Type information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ preStorageEmployeeData }, { status: 200 });
  } catch (error) {
    console.error("Faild to fetch Pre Storage Employee: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Pre Storage Employee.",
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
    await prisma.preStorageResponsibleEmployee.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Pre Storage Employee deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to delete Pre Storage Employee: ", error);
    return NextResponse.json(
      {
        message: "Faild to delete Pre Storage Employee: ",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Update container type

export async function PUT(req, res) {
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

  try {
    const updateContainerType =
      await prisma.preStorageResponsibleEmployee.update({
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
        message: "Pre Storage Employee updated successfully",
        updateContainerType,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to update Pre Storage Employee: ", error);
    return NextResponse.json(
      {
        message: "Faild to update Pre Storage Employee: ",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
