import { NextResponse } from "next/server";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Creating data

export async function POST(req, res) {
  const formData = await req.json();

  const {
    finalStorageTemperature,
    finalStorageRadiationLevel,
    finalStorageHumidity,
    finalStoragePressure,
    finalStorageLocationId,
    finalStorageResponsibleEmployeeId,
  } = formData;

  if (
    !finalStorageTemperature ||
    !finalStorageRadiationLevel ||
    !finalStorageHumidity ||
    !finalStoragePressure ||
    !finalStorageLocationId ||
    !finalStorageResponsibleEmployeeId
  ) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.finalStorageCondition.create({
      data: {
        finalStorageTemperature: parseFloat(finalStorageTemperature),
        finalStorageRadiationLevel: parseFloat(finalStorageRadiationLevel),
        finalStorageHumidity: parseInt(finalStorageHumidity),
        finalStoragePressure: parseInt(finalStoragePressure),
        finalStorageLocationId: parseInt(finalStorageLocationId),
        finalStorageResponsibleEmployeeId: parseInt(
          finalStorageResponsibleEmployeeId,
        ),
      },
    });

    return NextResponse.json(
      { message: "New Final-Storage Conditions add successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Faild to creat Final-Storage Conditions:", error);
    return NextResponse.json(
      { message: "Faild to add Final-Storage Conditions" },
      { status: 500 },
      { error: `${error.message}` },
    );
  }
}
