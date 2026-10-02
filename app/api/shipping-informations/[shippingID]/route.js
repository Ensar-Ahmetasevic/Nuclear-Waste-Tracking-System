import { shipmentDocuments } from "@/lib/server/profile-documents";
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

    const linked = await prisma.receiptAllocation.findMany({ where: { shipmentId: shippingData.id }, select: { containerProfileId: true, locationId: true } });
    const transferred = await prisma.transferSource.findMany({ where: { shipmentId: shippingData.id }, select: { containerProfileId: true, quantity: true, state: true } });
    const departure = await prisma.shipmentDeparture.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { id: "desc" }, select: { id: true, actorId: true, createdAt: true } });
    const locked = new Set([...linked, ...transferred].map(row => row.containerProfileId));
    const receiptRecorded = new Set(linked.map(row => row.containerProfileId));
    const halls = new Map((await prisma.preStorageLocation.findMany({ where: { id: { in: [...new Set(linked.map(row => row.locationId))] } }, select: { id: true, name: true } })).map(row => [row.id, row.name]));
    const hallNames = profileId => [...new Set(linked.filter(row => row.containerProfileId === profileId).map(row => halls.get(row.locationId)).filter(Boolean))];
    const returns = await rejectionReports(shippingData);
    shippingData.containerProfiles = shippingData.containerProfiles.map(profile => ({ ...profile,
      lastReturn: latestReport(returns, profile.id),
      truckStatus: shippingData.truckStatus,
      correctionLocked: profile.containerStatus === "accepted" || locked.has(profile.id),
      receiptRecorded: receiptRecorded.has(profile.id),
      receiptHalls: hallNames(profile.id),
    }));
    // Steps of the truck for the stepper.
    const journey = shipmentJourney({
      ...shippingData,
      arrival: await prisma.shipmentArrival.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { id: "asc" }, select: { actorId: true, createdAt: true } }),
      lastReceiptAt: (await prisma.receiptAllocation.findFirst({ where: { shipmentId: shippingData.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }))?.createdAt ?? null,
      departure,
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
        documents: await shipmentDocuments(shippingData),
        returnState: returns.some(row => row.state === "escalated") ? "escalated" : returns.some(row => row.state === "open") ? "open" : null,
        deletionVersion: shipmentRemovalVersion(shipmentRemovalSnapshot(shippingData)),
        timeline: await shipmentTimeline(shippingData, user.role === "ADMINISTRATOR", true, returns),
        departure,
        journey,
        corrections,
        people,
        permissions: {
          canRemoveDocuments: canReviewCorrections,
          // Employees correct; only management deletes shipments and profiles.
          canDeleteContainers: canReviewCorrections,
          canDelete: canReviewCorrections && !linked.length && !transferred.length && !shippingData.containerProfiles.some(profile => profile.containerStatus === "accepted"),
          canCorrectStatus: user.role === "ADMINISTRATOR",
          // Once Step 1 hands a return to Supervision, only management resends it.
          canDecideReturns: canReviewCorrections,
          // Employees correct while the truck is IN; after OUT only management.
          canEditContainers:
            canReviewCorrections || shippingData.truckStatus !== "OUT",
          canEdit: canReviewCorrections || shippingData.truckStatus !== "OUT",
        },
      },
      { status: 200 },
    );
  }
}

export const GET = withApiAuth(GETHandler);

export const dynamic = "force-dynamic";
