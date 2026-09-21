import { createHash } from "node:crypto";
import { HttpError } from "@/lib/server/errors.cjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";

// Creating  data
async function POSTHandler(req, { user }) {
  const input = await req.json();
  const { actionKey } = input;
  if (typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey))
    throw new HttpError(400, "A valid arrival reference is required");
  const fields = ["companyName", "driverName", "registrationPlates"];
  if (fields.some(key => typeof input[key] !== "string" || !input[key].trim() || input[key].trim().length > 200))
    throw new HttpError(400, "Enter company, driver and registration plates (up to 200 characters each)");
  const data = Object.fromEntries(fields.map(key => [key, input[key].trim()]));
  const fingerprint = createHash("sha256").update(JSON.stringify([data, user.id])).digest("hex");
  const previous = await prisma.shipmentArrival.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This arrival reference belongs to different data");
    return NextResponse.json({ arrival: previous, replayed: true });
  }
  const shipment = await prisma.shippingInformation.create({ data: { ...data, truckStatus: "IN" } });
  const arrival = await prisma.shipmentArrival.create({ data: { shipmentId: shipment.id, actorId: user.id, actionKey, fingerprint, snapshot: data, createdAt: shipment.entryDateTime } });
  return NextResponse.json({ arrival });
}

// Fetch data

async function GETHandler(req, res) {
  {
    const shippingData = await prisma.shippingInformation.findMany({
      orderBy: {
        // IDs follow insertion order; arrival dates may be backdated or edited.
        id: "desc",
      },
      include: {
        containerProfiles: {
          include: {
            locationOrigin: true,
            wasteProfile: {
              include: {
                containerType: true,
              },
            },
          },
        },
      },
    });

    if (!shippingData) {
      return NextResponse.json(
        { shippingData: [], message: "No shipping information available" },
        { status: 200 },
      );
    }

    return NextResponse.json({ shippingData }, { status: 200 });
  }
}

//  Delete data

async function DELETEHandler(req) {
  const { id } = await req.json();

  {
    const shipmentId = Number(id);
    if (await prisma.receiptAllocation.count({ where: { shipmentId } }) ||
        await prisma.transferSource.count({ where: { shipmentId } }) ||
        await prisma.containerProfile.count({ where: { shippingInformationId: shipmentId, containerStatus: "accepted" } }))
      throw new HttpError(409, "This shipment has received containers or a linked stock history and cannot be deleted here.");
    await prisma.shippingInformation.delete({
      where: { id: id },
    });
    return NextResponse.json(
      { message: "Shipping Information deleted successfully." },
      { status: 200 },
    );
  }
}

// Update truck data profile

const truckFields = [
  "companyName",
  "driverName",
  "registrationPlates",
  "truckStatus",
];
const snapshot = (record) =>
  Object.fromEntries(truckFields.map((key) => [key, record[key]]));
async function PUTHandler(req, { user }) {
  const { updatedTruckData: input } = await req.json();
  const {
    id,
    companyName,
    driverName,
    registrationPlates,
    actionKey,
    expected,
    reason,
  } = input;
  const changes = { companyName, driverName, registrationPlates };
  if (
    !id ||
    Object.values(changes).some(
      (value) =>
        typeof value !== "string" || !value.trim() || value.length > 1000,
    )
  )
    throw new HttpError(
      400,
      "Company, driver and plates are required (maximum 1000 characters each)",
    );
  for (const key of Object.keys(changes)) changes[key] = changes[key].trim();
  const current = await prisma.shippingInformation.findUniqueOrThrow({
    where: { id: Number(id) },
  });
  const correction = current.truckStatus === "OUT";
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        id: Number(id),
        changes,
        expected: expected ? snapshot(expected) : null,
        reason,
        actorId: user.id,
      }),
    )
    .digest("hex");
  if (actionKey) {
    const previous = await prisma.shippingCorrection.findFirst({
      where: { actionKey },
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new HttpError(409, "This confirmation belongs to different data");
      return NextResponse.json({ correction: previous, replayed: true });
    }
  }
  if (correction) {
    if (user.role !== "ADMINISTRATOR")
      throw new HttpError(
        403,
        "Only an administrator can correct a departed shipment",
      );
    if (
      typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.length > 1000
    )
      throw new HttpError(400, "Enter a correction reason (3–1000 characters)");
    if (
      typeof actionKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        actionKey,
      ) ||
      !expected
    )
      throw new HttpError(
        400,
        "Review the current shipment before confirming a correction",
      );
  }
  if (expected && truckFields.some((key) => expected[key] !== current[key]))
    throw new HttpError(
      409,
      "Shipment changed. Close and reload it before reviewing again.",
    );
  if (Object.keys(changes).every((key) => changes[key] === current[key]))
    throw new HttpError(400, "No changes to save");
  const updateTruckData = await prisma.shippingInformation.update({
    where: { id: current.id },
    data: changes,
  });
  const record = correction
    ? await prisma.shippingCorrection.create({
        data: {
          shipmentId: current.id,
          actorId: user.id,
          reason: reason.trim(),
          before: snapshot(current),
          after: snapshot(updateTruckData),
          actionKey,
          fingerprint,
        },
      })
    : null;
  return NextResponse.json({
    message: "Shipment changes saved",
    updateTruckData,
    correction: record,
  });
}

// Update Shipping STATUS

async function PATCHHandler(req, { user }) {
  const { shippingStatusData: input } = await req.json();
  const { id, actionKey, reason, expected } = input;
  if (!Number.isSafeInteger(id) || id < 1 || typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000 || typeof actionKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionKey))
    throw new HttpError(400, "A shipment, correction reference and reason (3–1000 characters) are required");
  const keys = ["truckStatus", "entryDateTime", "exitDateTime"];
  const dates = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value));
  if (!["IN", "OUT"].includes(input.truckStatus) || !dates(input.entryDateTime) || (input.exitDateTime !== null && !dates(input.exitDateTime)))
    throw new HttpError(400, "Enter valid status and dates");
  if ((input.truckStatus === "IN" && input.exitDateTime !== null) || (input.truckStatus === "OUT" && (!input.exitDateTime || Date.parse(input.exitDateTime) < Date.parse(input.entryDateTime))))
    throw new HttpError(400, "IN requires no departure date; OUT requires a departure on or after arrival");
  if (!expected || keys.some(key => !(key in expected))) throw new HttpError(400, "Review the current status and dates first");
  const after = Object.fromEntries(keys.map(key => [key, input[key]]));
  const fingerprint = createHash("sha256").update(JSON.stringify(["status-dates", id, after, expected, reason.trim(), user.id])).digest("hex");
  const previous = await prisma.shippingCorrection.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This correction reference belongs to different data");
    return NextResponse.json({ correction: previous, replayed: true });
  }
  const current = await prisma.shippingInformation.findUniqueOrThrow({ where: { id } });
  const before = { truckStatus: current.truckStatus, entryDateTime: current.entryDateTime.toISOString(), exitDateTime: current.exitDateTime?.toISOString() || null };
  if (keys.some(key => expected[key] !== before[key])) throw new HttpError(409, "Shipment changed. Close and reload before reviewing again.");
  if (keys.every(key => after[key] === before[key])) throw new HttpError(400, "No changes to save");
  await prisma.shippingInformation.update({ where: { id }, data: after });
  const correction = await prisma.shippingCorrection.create({ data: { shipmentId: id, actorId: user.id, actionKey, fingerprint, reason: reason.trim(), before, after } });
  return NextResponse.json({ correction });
}

export const POST = withApiAuth(POSTHandler, { access: "shipping" });
export const GET = withApiAuth(GETHandler);
export const DELETE = withApiAuth(DELETEHandler, { access: "shipping" });
export const PUT = withApiAuth(PUTHandler, {
  access: "shipping",
  bodyObjects: ["updatedTruckData"],
});
export const PATCH = withApiAuth(PATCHHandler, {
  access: "admin",
  bodyObjects: ["shippingStatusData"],
});

export const dynamic = "force-dynamic";
