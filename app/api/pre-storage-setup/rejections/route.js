import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { HttpError } from "@/lib/server/errors.cjs";
import { prisma, positiveInteger } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { assertActiveResponsibleEmployee } from "@/lib/server/definition-changes";
import { assertUnreceivedProfile } from "@/lib/server/container-corrections";
import { REJECTION_REASONS, rejectionProblem, REJECTION_PROBLEMS } from "@/lib/receipt-rejections";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Pre-storage returns the incoming Container Profiles of one hall to Step 1 with
// an inspection report. Accepting still happens through the receipt form.
async function POSTHandler(req, { user }) {
  const { actionKey, shipmentId, locationId, responsibleEmployeeId, reasons, note = "", profiles } = await req.json();
  if (typeof actionKey !== "string" || !UUID.test(actionKey))
    throw new HttpError(400, "A valid return reference is required");
  if (![shipmentId, locationId, responsibleEmployeeId].every(positiveInteger))
    throw new HttpError(400, "Choose the shipment, the hall and the responsible employee");
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 50 ||
      profiles.some((row) => !row || !positiveInteger(row.id) || !positiveInteger(row.quantity)) ||
      new Set(profiles.map((row) => row.id)).size !== profiles.length)
    throw new HttpError(400, "Select the returned Container Profiles");
  const problem = rejectionProblem({ reasons, note, profiles });
  if (problem) throw new HttpError(400, REJECTION_PROBLEMS[problem]);
  const rows = profiles
    .map(({ id, quantity, countedQuantity }) => ({ containerProfileId: id, expectedQuantity: quantity, countedQuantity: countedQuantity ?? null }))
    .sort((a, b) => a.containerProfileId - b.containerProfileId);
  const report = { shipmentId, locationId, responsibleEmployeeId, reasons: REJECTION_REASONS.filter((code) => reasons.includes(code)), note: note.trim(), profiles: rows };
  const fingerprint = createHash("sha256").update(JSON.stringify([report, user.id])).digest("hex");
  const previous = await prisma.receiptRejection.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This return reference belongs to different data");
    return NextResponse.json({ rejection: previous, replayed: true });
  }

  const shipment = await prisma.shippingInformation.findUniqueOrThrow({ where: { id: shipmentId } });
  const hall = await prisma.preStorageLocation.findUniqueOrThrow({ where: { id: locationId } });
  const current = await prisma.containerProfile.findMany({
    where: { id: { in: rows.map((row) => row.containerProfileId) } },
    include: { wasteProfile: { select: { name: true } } },
  });
  if (current.length !== rows.length || current.some((profile) => profile.shippingInformationId !== shipment.id))
    throw new HttpError(404, "Container Profile not found for this shipment");
  if (shipment.truckStatus !== "IN" || current.some((profile) => profile.containerStatus !== "pending"))
    throw new HttpError(409, "These containers are no longer awaiting receipt");
  if (current.some((profile) => profile.wasteProfile.name !== (hall.wasteProfile || hall.containerType)))
    throw new HttpError(409, "These Container Profiles are not assigned to this hall");
  for (const row of rows) {
    const profile = current.find((item) => item.id === row.containerProfileId);
    if (profile.quantity !== row.expectedQuantity)
      throw new HttpError(409, "The Container Profile changed. Reload and review the delivery again.");
    await assertUnreceivedProfile(profile);
  }
  await assertActiveResponsibleEmployee(true, responsibleEmployeeId);

  const rejection = await prisma.receiptRejection.create({ data: {
    shipmentId, locationId, responsibleEmployeeId, profiles: rows, reasons: report.reasons,
    note: report.note || undefined, actorId: user.id, actionKey, fingerprint,
  } });
  for (const profile of current)
    await prisma.containerProfile.update({ where: { id: profile.id }, data: { containerStatus: "rejected" } });
  return NextResponse.json({ rejection, message: "Delivery returned to Shipments with the inspection report." });
}

export const POST = withApiAuth(POSTHandler, { access: "member", texts: (body) => [body.note] });

export const dynamic = "force-dynamic";
