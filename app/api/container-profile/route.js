import { createHash } from "node:crypto";
import { assertUnreceivedProfile, profileSnapshot } from "@/lib/server/container-corrections";
import { HttpError } from "@/lib/server/errors.cjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { reasonText, withApiAuth } from "@/lib/server/api-route";

const archivedChoice = "The selected Location Origin or Waste Profile has been archived. Reload the options and choose an active definition.";

// A preparation event records the reviewed quantity and source, not physical receipt.
async function POSTHandler(req, { user }) {
  const { quantity, locationOriginId, wasteProfileId, shippingInformationId, actionKey, expected, reason = "" } = await req.json();
  const fields = { quantity, locationOriginId, wasteProfileId, shippingInformationId };
  if (!Object.values(fields).every(value => Number.isSafeInteger(value) && value > 0 && value <= 2147483647) ||
      typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey) ||
      !expected || !["IN", "OUT"].includes(expected.truckStatus) || typeof expected.status !== "string" ||
      !Number.isSafeInteger(expected.containerTypeId) || expected.containerTypeId <= 0 ||
      typeof reason !== "string" || reason.trim().length > 1000 || (expected.truckStatus === "OUT" && reason.trim().length < 3))
    throw new HttpError(400, "Review the profile before confirming. A departed shipment also requires a reason (3–1000 characters).");
  const reviewed = { truckStatus: expected.truckStatus, status: expected.status, containerTypeId: expected.containerTypeId };
  const fingerprint = createHash("sha256").update(JSON.stringify([fields, reviewed, reason.trim(), user.id])).digest("hex");
  const select = { id: true, shipmentId: true, containerProfileId: true, actorId: true, snapshot: true, reason: true, createdAt: true };
  const previous = await prisma.containerPreparation.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different profile preparation");
    return NextResponse.json({ preparation: Object.fromEntries(Object.keys(select).map(key => [key, previous[key]])), replayed: true });
  }
  const shipment = await prisma.shippingInformation.findUniqueOrThrow({ where: { id: shippingInformationId } });
  if (shipment.truckStatus === "OUT" && user.role === "EMPLOYEE")
    throw new HttpError(403, "Only Supervision or an administrator can correct a departed shipment");
  const origin = await prisma.locationOrigin.findUniqueOrThrow({ where: { id: locationOriginId } });
  const waste = await prisma.wasteProfile.findUniqueOrThrow({ where: { id: wasteProfileId } });
  if (origin.archivedAt || waste.archivedAt) throw new HttpError(409, archivedChoice);
  if (shipment.truckStatus !== reviewed.truckStatus || shipment.status !== reviewed.status || waste.containerTypeId !== reviewed.containerTypeId)
    throw new HttpError(409, "The shipment or recommended container type changed. Reload and review before preparing this profile.");
  const profile = await prisma.containerProfile.create({ data: { ...fields, containerStatus: "pending" } });
  await prisma.shippingInformation.update({ where: { id: shipment.id }, data: { status: "pending" } });
  const preparation = await prisma.containerPreparation.create({ data: {
    shipmentId: shipment.id, containerProfileId: profile.id, actorId: user.id, actionKey, fingerprint,
    snapshot: { quantity, locationOriginId, wasteProfileId, containerTypeId: waste.containerTypeId, truckStatus: shipment.truckStatus, containerStatus: "pending" },
    reason: reason.trim() || null,
  }, select });
  return NextResponse.json({ preparation, message: "Container Profile prepared and awaiting pre-storage review." });
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

// Validate current permissions here so a confirmed deletion can be replayed after
// its operational profile no longer exists. All calls still use fresh membership
// and the organization-scoped serializable transaction from withApiAuth.
async function DELETEHandler(req, { user }) {
  const { id, expected, actionKey, reason } = await req.json();
  if (!Number.isSafeInteger(id) || id <= 0 || typeof actionKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey) ||
      typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000 ||
      !expected || Array.isArray(expected))
    throw new HttpError(400, "Review the profile and provide a deletion reason (3–1000 characters).");
  const keys = ["quantity", "locationOriginId", "wasteProfileId", "containerStatus", "truckStatus"];
  const reviewed = Object.fromEntries(keys.map(key => [key, expected[key]]));
  const fingerprint = createHash("sha256").update(JSON.stringify([id, reviewed, reason.trim(), user.id])).digest("hex");
  const select = { id: true, shipmentId: true, containerProfileId: true, actorId: true, reason: true, before: true, createdAt: true };
  const previous = await prisma.containerRemoval.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This confirmation belongs to a different deletion.");
    return NextResponse.json({ removal: Object.fromEntries(Object.keys(select).map(key => [key, previous[key]])), replayed: true });
  }
  const current = await prisma.containerProfile.findUniqueOrThrow({ where: { id } });
  const shipment = await prisma.shippingInformation.findUniqueOrThrow({ where: { id: current.shippingInformationId } });
  // Employees correct; deleting is for Supervision and Administrators only.
  if (user.role === "EMPLOYEE")
    throw new HttpError(403, "Only Supervision or an administrator can delete a Container Profile");
  const before = profileSnapshot(current, shipment);
  if (keys.some(key => before[key] !== expected[key])) throw new HttpError(409, "The profile or shipment changed. Close and reload before reviewing deletion again.");
  await assertUnreceivedProfile(current);
  const removal = await prisma.containerRemoval.create({ data: {
    shipmentId: shipment.id, containerProfileId: id, actorId: user.id, actionKey, fingerprint,
    reason: reason.trim(), before: { ...before, profileCreatedAt: current.createdAt.toISOString() },
  }, select });
  await prisma.containerProfile.delete({ where: { id } });
  const remaining = await prisma.containerProfile.findMany({ where: { shippingInformationId: shipment.id }, select: { containerStatus: true } });
  await prisma.shippingInformation.update({ where: { id: shipment.id }, data: { status: remaining.length && remaining.every(row => row.containerStatus === "accepted") ? "accepted" : "pending" } });
  return NextResponse.json({ removal, message: "Container Profile deleted. Recorded storage stock was not changed." });
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
  if (shipment.truckStatus === "OUT" && user.role === "EMPLOYEE")
    throw new HttpError(403, "Only Supervision or an administrator can correct a departed shipment");
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
  // Keeping an archived definition is allowed; choosing one anew is not.
  if ((afterFields.locationOriginId !== current.locationOriginId && (await prisma.locationOrigin.findUniqueOrThrow({ where: { id: afterFields.locationOriginId } })).archivedAt) ||
      (afterFields.wasteProfileId !== current.wasteProfileId && (await prisma.wasteProfile.findUniqueOrThrow({ where: { id: afterFields.wasteProfileId } })).archivedAt))
    throw new HttpError(409, archivedChoice);
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
    // Pre-storage accepts through the receipt form and returns a delivery with an
    // inspection report (/api/pre-storage-setup/rejections); this is an administrator correction.
    if (user.role !== 'ADMINISTRATOR') throw new HttpError(403, containerStatus === 'accepted' ? 'Use the receipt form to accept containers' : 'Return the delivery with an inspection report in the hall');
    const current = await prisma.containerProfile.findUniqueOrThrow({where:{id:containerProfileId}});
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

export const POST = withApiAuth(POSTHandler, { access: "shipping", texts: reasonText });
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler, { access: "member", texts: reasonText });
export const PUT = withApiAuth(PUTHandler, { access: "shipping", bodyObjects: ["preparedData"], texts: (body) => [body.preparedData?.reason] });
export const PATCH = withApiAuth(PATCHHandler, { access: "shipping", bodyObjects: ["containerStatusUpdateData"] });

export const dynamic = "force-dynamic";
