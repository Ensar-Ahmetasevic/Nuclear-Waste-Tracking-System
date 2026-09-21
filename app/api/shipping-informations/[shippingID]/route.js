import { shipmentTimeline } from "@/lib/server/shipment-timeline";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// GET request to fetch shipping information by ID
async function GETHandler(req, { params, user }) {
  const { shippingID } = await params;

  {
    const shippingData = await prisma.shippingInformation.findUnique({
      where: { id: parseInt(shippingID) },
      include: {
        containerProfiles: {
          include: {
            locationOrigin: true,
            wasteProfile: true,
          },
        },
      },
    });

    if (!shippingData) {
      return NextResponse.json(
        { message: "Shipping Information not found" },
        { status: 404 },
      );
    }

    const linked = await prisma.receiptAllocation.findMany({ where: { shipmentId: shippingData.id }, select: { containerProfileId: true } });
    const transferred = await prisma.transferSource.findMany({ where: { shipmentId: shippingData.id }, select: { containerProfileId: true } });
    const locked = new Set([...linked, ...transferred].map(row => row.containerProfileId));
    shippingData.containerProfiles = shippingData.containerProfiles.map(profile => ({ ...profile,
      truckStatus: shippingData.truckStatus,
      correctionLocked: profile.containerStatus === "accepted" || locked.has(profile.id),
    }));
    const canReviewCorrections = ["ADMINISTRATOR", "SUPERVISION"].includes(user.role);
    const containerCorrections = canReviewCorrections ? await prisma.containerCorrection.findMany({
      where: { shipmentId: shippingData.id }, orderBy: { id: "desc" }, take: 20,
      select: { id: true, containerProfileId: true, actorId: true, reason: true, before: true, after: true, createdAt: true },
    }) : [];
    return NextResponse.json(
      {
        shippingData, containerCorrections,
        timeline: await shipmentTimeline(shippingData, user.role === "ADMINISTRATOR", canReviewCorrections),
      departure: await prisma.shipmentDeparture.findFirst({where:{shipmentId:shippingData.id},orderBy:{id:"desc"},select:{id:true,actorId:true,createdAt:true}}),
        corrections:
          user.role === "ADMINISTRATOR"
            ? await prisma.shippingCorrection.findMany({
                where: { shipmentId: shippingData.id },
                orderBy: { id: "desc" },
                take: 10,
                select: {
                  id: true,
                  actorId: true,
                  reason: true,
                  before: true,
                  after: true,
                  createdAt: true,
                },
              })
            : [],
        permissions: {
          canCorrectStatus: user.role === "ADMINISTRATOR",
          canEditContainers:
            user.role === "ADMINISTRATOR" ||
            (user.role === "SUPERVISION" && shippingData.truckStatus !== "OUT"),
          canEdit:
            user.role === "ADMINISTRATOR" || shippingData.truckStatus !== "OUT",
        },
      },
      { status: 200 },
    );
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
