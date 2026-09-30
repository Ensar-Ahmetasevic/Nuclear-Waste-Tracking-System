import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { HttpError } from "@/lib/server/errors.cjs";
import { prisma, positiveInteger } from "@/lib/server/scoped-database.cjs";
import { withApiAuth } from "@/lib/server/api-route";
import { assertUnreceivedProfile, profileSnapshot } from "@/lib/server/container-corrections";
import { rejectionReports, latestReport } from "@/lib/server/receipt-rejections";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Step 1 handles a Pre-storage return: RESEND sends the profiles back to Step 2,
// with corrected quantity, location origin or waste profile (a new waste profile
// routes the profile to that hall); ESCALATE hands the return to Supervision and
// the truck waits. Once escalated, only Supervision or an administrator resends it.
async function POSTHandler(req, { user }) {
  const { actionKey, rejectionId, action, note, profiles = [], expectedState } = await req.json();
  if (typeof actionKey !== "string" || !UUID.test(actionKey))
    throw new HttpError(400, "A valid action reference is required");
  if (!positiveInteger(rejectionId) || !["RESEND", "ESCALATE"].includes(action) || !["open", "escalated"].includes(expectedState))
    throw new HttpError(400, "Choose the return and the action");
  if (typeof note !== "string" || note.trim().length < 3 || note.trim().length > 1000)
    throw new HttpError(400, action === "ESCALATE" ? "Explain why Supervision is needed (3–1000 characters)" : "Describe what was checked or corrected (3–1000 characters)");
  if (!Array.isArray(profiles) || profiles.some((row) => !row || ![row.id, row.locationOriginId, row.wasteProfileId].every(positiveInteger) || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 100000) ||
      new Set(profiles.map((row) => row.id)).size !== profiles.length || (action === "ESCALATE" && profiles.length))
    throw new HttpError(400, "Enter the quantity, location origin and waste profile of every returned profile");
  const request = { rejectionId, action, note: note.trim(), expectedState, profiles: [...profiles].sort((a, b) => a.id - b.id).map(({ id, quantity, locationOriginId, wasteProfileId }) => ({ id, quantity, locationOriginId, wasteProfileId })) };
  const fingerprint = hash([request, user.id]);
  const previous = await prisma.returnAction.findFirst({ where: { actionKey } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new HttpError(409, "This action reference belongs to different data");
    return NextResponse.json({ returnAction: previous, replayed: true });
  }

  const rejection = await prisma.receiptRejection.findUniqueOrThrow({ where: { id: rejectionId } });
  const shipment = await prisma.shippingInformation.findUniqueOrThrow({ where: { id: rejection.shipmentId }, include: { containerProfiles: true } });
  const reports = await rejectionReports(shipment);
  const report = reports.find((row) => row.id === rejectionId);
  if (report.state !== expectedState)
    throw new HttpError(409, "This return changed in the meantime. Reload the shipment and review it again.");
  if (action === "RESEND" && report.state === "escalated" && user.role === "EMPLOYEE")
    throw new HttpError(403, "Supervision decides this return now");

  const changes = [];
  if (action === "RESEND") {
    if (shipment.truckStatus !== "IN") throw new HttpError(409, "The truck has left; an administrator corrects departed shipments");
    const returned = shipment.containerProfiles.filter((profile) => profile.containerStatus === "rejected" && latestReport(reports, profile.id)?.id === rejectionId);
    if (returned.length !== request.profiles.length || returned.some((profile) => !request.profiles.some((row) => row.id === profile.id)))
      throw new HttpError(409, "The returned profiles changed. Reload the shipment and review it again.");
    const names = async (row) => ({
      quantity: row.quantity,
      locationOriginId: row.locationOriginId,
      locationOrigin: (await prisma.locationOrigin.findUniqueOrThrow({ where: { id: row.locationOriginId } })).name,
      wasteProfileId: row.wasteProfileId,
      wasteProfile: (await prisma.wasteProfile.findUniqueOrThrow({ where: { id: row.wasteProfileId } })).name,
    });
    for (const profile of returned) {
      await assertUnreceivedProfile(profile);
      const { quantity, locationOriginId, wasteProfileId } = request.profiles.find((row) => row.id === profile.id);
      // Keeping an archived definition is allowed; choosing one anew is not.
      if ((locationOriginId !== profile.locationOriginId && (await prisma.locationOrigin.findUniqueOrThrow({ where: { id: locationOriginId } })).archivedAt) ||
          (wasteProfileId !== profile.wasteProfileId && (await prisma.wasteProfile.findUniqueOrThrow({ where: { id: wasteProfileId } })).archivedAt))
        throw new HttpError(409, "An archived location origin or waste profile cannot be chosen. Reload and choose an active one.");
      const updated = await prisma.containerProfile.update({ where: { id: profile.id }, data: { quantity, locationOriginId, wasteProfileId, containerStatus: "pending" } });
      if (quantity === profile.quantity && locationOriginId === profile.locationOriginId && wasteProfileId === profile.wasteProfileId) continue;
      // Names are kept with the ids so the history reads the same after a definition is renamed.
      changes.push({ containerProfileId: profile.id, before: await names(profile), after: await names(updated) });
      // The profile history lists these changes with the other corrections.
      await prisma.containerCorrection.create({ data: {
        shipmentId: shipment.id, containerProfileId: profile.id, actorId: user.id, actionKey: randomUUID(),
        fingerprint: hash([actionKey, profile.id]), reason: `Return #${rejectionId}: ${request.note}`,
        before: profileSnapshot(profile, shipment), after: profileSnapshot(updated, shipment),
      } });
    }
    await prisma.shippingInformation.update({ where: { id: shipment.id }, data: { status: "pending" } });
  }
  const returnAction = await prisma.returnAction.create({ data: {
    shipmentId: shipment.id, rejectionId, action: action === "RESEND" ? "RESENT" : "ESCALATED",
    note: request.note, changes, actorId: user.id, actorRole: user.role, actionKey, fingerprint,
  } });
  return NextResponse.json({ returnAction });
}

export const POST = withApiAuth(POSTHandler, {
  access: "member",
  // A resend also records the note as the correction reason of each profile.
  texts: (body) => [body.note, body.action === "RESEND" && typeof body.note === "string" && `Return #${body.rejectionId}: ${body.note.trim()}`],
});

export const dynamic = "force-dynamic";
