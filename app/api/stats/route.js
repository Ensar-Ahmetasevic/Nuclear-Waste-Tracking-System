import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      preStorageLocations,
      finalStorageLocations,
      preStorageEntriesAgg,
      activeShipments,
    ] = await Promise.all([
      prisma.preStorageLocation.findMany({
        select: {
          surfaceArea: true,
          containerFootprint: true,
          preStorageEntry: { select: { quantity: true } },
        },
      }),
      prisma.finalStorageLocation.findMany({
        select: {
          surfaceArea: true,
          containerFootprint: true,
          quantity: true,
        },
      }),
      prisma.preStorageEntry.aggregate({ _sum: { quantity: true } }),
      prisma.shippingInformation.count({ where: { truckStatus: "IN" } }),
    ]);

    const preStorageContainers = preStorageEntriesAgg._sum.quantity || 0;
    const finalStorageContainers = finalStorageLocations.reduce(
      (sum, loc) => sum + (loc.quantity || 0),
      0,
    );
    const activeContainers = preStorageContainers + finalStorageContainers;

    // Used surface area = (sum of entries quantity * containerFootprint) per location
    const preUsedSurface = preStorageLocations.reduce((sum, loc) => {
      const qty = (loc.preStorageEntry || []).reduce(
        (q, e) => q + (e.quantity || 0),
        0,
      );
      return sum + qty * (loc.containerFootprint || 0);
    }, 0);
    const finalUsedSurface = finalStorageLocations.reduce(
      (sum, loc) => sum + (loc.quantity || 0) * (loc.containerFootprint || 0),
      0,
    );

    const preTotalSurface = preStorageLocations.reduce(
      (sum, loc) => sum + (loc.surfaceArea || 0),
      0,
    );
    const finalTotalSurface = finalStorageLocations.reduce(
      (sum, loc) => sum + (loc.surfaceArea || 0),
      0,
    );

    const totalSurface = preTotalSurface + finalTotalSurface;
    const usedSurface = preUsedSurface + finalUsedSurface;

    const capacityUsedPercentage =
      totalSurface > 0 ? Math.round((usedSurface / totalSurface) * 100) : 0;

    return NextResponse.json(
      {
        activeContainers,
        capacityUsedPercentage,
        activeShipments,
        preStorageLocations: preStorageLocations.length,
        finalStorageLocations: finalStorageLocations.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { message: "Failed to fetch stats", error: error.message },
      { status: 500 },
    );
  }
}
