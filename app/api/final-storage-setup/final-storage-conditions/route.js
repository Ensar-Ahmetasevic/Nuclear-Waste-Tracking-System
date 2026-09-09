import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating data

async function POSTHandler(req, res) {
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

  {
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
  }
}

export const POST = withApiAuth(POSTHandler);

export const dynamic = "force-dynamic";
