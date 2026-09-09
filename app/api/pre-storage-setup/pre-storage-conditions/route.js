import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating data

async function POSTHandler(req, res) {
  const formData = await req.json();

  const {
    preStorageTemperature,
    preStorageRadiationLevel,
    preStorageHumidity,
    preStoragePressure,
    preStorageLocationId,
    preStorageResponsibleEmployeeId,
  } = formData;

  if (
    !preStorageTemperature ||
    !preStorageRadiationLevel ||
    !preStorageHumidity ||
    !preStoragePressure ||
    !preStorageLocationId ||
    !preStorageResponsibleEmployeeId
  ) {
    return NextResponse.json(
      {
        message: "Backend: All fields are required",
      },
      { status: 400 },
    );
  }

  {
    await prisma.preStorageConditions.create({
      data: {
        preStorageTemperature: parseFloat(preStorageTemperature),
        preStorageRadiationLevel: parseFloat(preStorageRadiationLevel),
        preStorageHumidity: parseInt(preStorageHumidity),
        preStoragePressure: parseInt(preStoragePressure),
        preStorageLocationId: parseInt(preStorageLocationId),
        preStorageResponsibleEmployeeId: parseInt(
          preStorageResponsibleEmployeeId,
        ),
      },
    });

    return NextResponse.json(
      { message: "New Pre-Storage Conditions add successfully." },
      { status: 200 },
    );
  }
}

export const POST = withApiAuth(POSTHandler);

export const dynamic = "force-dynamic";
