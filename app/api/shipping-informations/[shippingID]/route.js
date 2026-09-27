import { shipmentTimeline } from "@/lib/server/shipment-timeline";
import { shipmentRemovalSnapshot, shipmentRemovalVersion } from "@/lib/server/shipment-removal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { shipmentJourney } from "@/lib/shipment-journey";
import { rejectionReports, latestReport } from "@/lib/server/receipt-rejections";
import { recordNames, peopleMap } from "@/lib/server/record-names";

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
            wasteProfile: { include: { containerType: true } },
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
    const transferred = await prisma.transferSource.findMany({ where: { shipmentId: shippingData.id }, select: { containerProfileId: true, quantity: true, state: true } });
    const departure = await prisma.shipmentDeparture.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { id: "desc" }, select: { id: true, actorId: true, createdAt: true } });
    const locked = new Set([...linked, ...transferred].map(row => row.containerProfileId));
    const receiptRecorded = new Set(linked.map(row => row.containerProfileId));
    const returns = await rejectionReports(shippingData);
    shippingData.containerProfiles = shippingData.containerProfiles.map(profile => ({ ...profile,
      lastReturn: latestReport(returns, profile.id),
      truckStatus: shippingData.truckStatus,
      correctionLocked: profile.containerStatus === "accepted" || locked.has(profile.id),
      receiptRecorded: receiptRecorded.has(profile.id),
    }));
    // Steps for the stepper; final storage counts only linked, completed transfers.
    const journey = shipmentJourney({
      ...shippingData,
      arrival: await prisma.shipmentArrival.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { id: "asc" }, select: { actorId: true, createdAt: true } }),
      lastReceiptAt: (await prisma.receiptAllocation.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }))?.createdAt ?? null,
      departure,
      finalContainers: transferred.filter(row => row.state === "completed").reduce((total, row) => total + row.quantity, 0),
    });
    const canReviewCorrections = ["ADMINISTRATOR", "SUPERVISION"].includes(user.role);
    const containerCorrections = canReviewCorrections ? await prisma.containerCorrection.findMany({
      where: { shipmentId: shippingData.id }, orderBy: { id: "desc" }, take: 20,
      select: { id: true, containerProfileId: true, actorId: true, reason: true, before: true, after: true, createdAt: true },
    }) : [];
    const corrections = user.role === "ADMINISTRATOR"
      ? await prisma.shippingCorrection.findMany({
          where: { shipmentId: shippingData.id }, orderBy: { id: "desc" }, take: 10,
          select: { id: true, actorId: true, reason: true, before: true, after: true, createdAt: true },
        })
      : [];
    // Names of the people who recorded the steps and corrections shown on the page.
    const people = peopleMap(await recordNames({ users: [...journey.steps, departure, ...corrections, ...containerCorrections].map(row => row?.actorId) }));
    return NextResponse.json(
      {
        shippingData, containerCorrections, returns,
        returnState: returns.some(row => row.state === "escalated") ? "escalated" : returns.some(row => row.state === "open") ? "open" : null,
        deletionVersion: shipmentRemovalVersion(shipmentRemovalSnapshot(shippingData)),
        timeline: await shipmentTimeline(shippingData, user.role === "ADMINISTRATOR", canReviewCorrections, returns),
        departure,
        journey,
        corrections,
        people,
        permissions: {
          canDelete: (user.role === "ADMINISTRATOR" || shippingData.truckStatus !== "OUT") && (canReviewCorrections || !shippingData.containerProfiles.length) && !linked.length && !transferred.length && !shippingData.containerProfiles.some(profile => profile.containerStatus === "accepted"),
          canCorrectStatus: user.role === "ADMINISTRATOR",
          // Once Step 1 hands a return to Supervision, only management resends it.
          canDecideReturns: canReviewCorrections,
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
