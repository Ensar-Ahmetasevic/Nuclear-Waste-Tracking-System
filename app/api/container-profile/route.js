import { createHash } from "node:crypto";
import { assertUnreceivedProfile, profileSnapshot } from "@/lib/server/container-corrections";
import { HttpError } from "@/lib/server/errors.cjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating  data
async function POSTHandler(req, res) {
  const formData = await req.json();

  const { quantity, locationOriginId, wasteProfileId, shippingInformationId } =
    formData;

  if (
    !quantity ||
    !locationOriginId ||
    !wasteProfileId ||
    !shippingInformationId
  ) {
    return NextResponse.json(
      { message: "All fields are required" },
      { status: 400 },
    );
  }

  // Parse data from string to integer
  const parsedQuantity = parseInt(quantity);
  const parsedLocationOriginId = parseInt(locationOriginId);
  const parsedWasteProfileId = parseInt(wasteProfileId);
  const parsedShippingInformationId = parseInt(shippingInformationId);

  {
    await prisma.containerProfile.create({
      data: {
        quantity: parsedQuantity,
        containerStatus: "pending",
        locationOriginId: parsedLocationOriginId,
        wasteProfileId: parsedWasteProfileId,
        shippingInformationId: parsedShippingInformationId,
      },
    });

    return NextResponse.json(
      {
        message: "New Container Profile added successfully.",
      },
      { status: 200 },
    );
  }
}

// Fetch data
async function GETHandler() {
  {
    const containerProfileData = await prisma.containerProfile.findMany({
      orderBy: { id: "desc" },
    });

    if (!containerProfileData) {
      return NextResponse.json(
        {
          containerProfileData: [],
          message: "No container information available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ containerProfileData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    const current = await prisma.containerProfile.findUniqueOrThrow({ where: { id: Number(id) } });
    await assertUnreceivedProfile(current);
    await prisma.containerProfile.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json(
      { message: "Container Profile deleted successfully." },
      { status: 200 },
    );
  }
}

// Update container profile on the Entry Form

async function PUTHandler(req, { user }) {
  const { preparedData } = await req.json();
  const { id, quantity, locationOrigin, wasteProfile, actionKey, expected, reason } = preparedData;
  const afterFields = { quantity: Number(quantity), locationOriginId: Number(locationOrigin), wasteProfileId: Number(wasteProfile) };
  if (!Object.values(afterFields).every(value => Number.isSafeInteger(value) && value > 0 && value <= 2147483647) ||
      typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey) ||
      typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000 || !expected || Array.isArray(expected))
    throw new HttpError(400, "Review the profile and provide a reason (3–1000 characters)");
  const current = await prisma.containerProfile.findUniqueOrThrow({ where: { id: Number(id) } });
  const shipment = await prisma.shippingInformation.findUniqueOrThrow({ where: { id: current.shippingInformationId } });
  const before = profileSnapshot(current, shipment);
  const keys = Object.keys(before);
  const reviewed = Object.fromEntries(keys.map(key => [key, expected[key]]));
  const fingerprint = createHash("sha256").update(JSON.stringify([current.id, afterFields, reviewed, reason.trim(), user.id])).digest("hex");
  const previous = await prisma.containerCorrection.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different correction");
    return NextResponse.json({ correction: previous, replayed: true });
  }
  if (keys.some(key => expected[key] !== before[key])) throw new HttpError(409, "The profile or shipment has changed. Close and reload before reviewing again.");
  await assertUnreceivedProfile(current);
  if (Object.keys(afterFields).every(key => afterFields[key] === current[key])) throw new HttpError(400, "No changes to save");
  const updatedProfile = await prisma.containerProfile.update({ where: { id: current.id }, data: { ...afterFields, containerStatus: "pending" } });
  // An amended rejected profile needs review again; keep the shipment queue in sync.
  await prisma.shippingInformation.update({ where: { id: shipment.id }, data: { status: "pending" } });
  const correction = await prisma.containerCorrection.create({ data: {
    shipmentId: shipment.id, containerProfileId: current.id, actorId: user.id, actionKey,
    fingerprint, reason: reason.trim(), before, after: profileSnapshot(updatedProfile, shipment),
  } });
  return NextResponse.json({ message: "Container Profile correction saved.", updatedProfile, correction });
}

// Update container profile STATUS in the hall

async function PATCHHandler(request, { user }) {
  {
    const { containerStatusUpdateData } = await request.json();

    const { containerProfileId, containerStatus } = containerStatusUpdateData;

    if (!['accepted','rejected'].includes(containerStatus)) throw new HttpError(400, 'Invalid container status');
    if (user.role !== 'ADMINISTRATOR' && containerStatus === 'accepted') throw new HttpError(403, 'Use the receipt form to accept containers');
    const current = await prisma.containerProfile.findUniqueOrThrow({where:{id:containerProfileId}});
    if (user.role !== 'ADMINISTRATOR' && current.containerStatus !== 'pending') throw new HttpError(409, 'This profile is no longer awaiting review');
    await assertUnreceivedProfile(current);
    // Step 1: Update container status for specific container in a hall
    // and we are using this when we are updating the container status in the hall

    const updatedContainer = await prisma.containerProfile.update({
      where: { id: containerProfileId },
      data: { containerStatus: containerStatus },
    });

    // Step 2: Check if all containers for the same shipping information are accepted
    const relatedContainers = await prisma.containerProfile.findMany({
      where: { shippingInformationId: updatedContainer.shippingInformationId },
    });

    const allAccepted = relatedContainers.every(
      (container) => container.containerStatus === "accepted",
    );

    // Step 3: If all are accepted, update ShippingInformation status
    if (allAccepted) {
      await prisma.shippingInformation.update({
        where: { id: updatedContainer.shippingInformationId },
        data: { status: "accepted" },
      });
    }

    return NextResponse.json({ success: true });
  }
}

export const POST = withApiAuth(POSTHandler, { access: "shipping" });
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler, { access: "shipping" });
export const PUT = withApiAuth(PUTHandler, { access: "shipping", bodyObjects: ["preparedData"] });
export const PATCH = withApiAuth(PATCHHandler, { access: "shipping", bodyObjects: ["containerStatusUpdateData"] });

export const dynamic = "force-dynamic";
