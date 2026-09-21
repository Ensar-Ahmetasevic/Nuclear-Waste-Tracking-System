import { createHash } from "node:crypto";
import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
import { HttpError } from "@/lib/server/errors.cjs";
const snapshot = (row) => ({
  companyName: row.companyName,
  driverName: row.driverName,
  registrationPlates: row.registrationPlates,
  truckStatus: row.truckStatus,
});
export const POST = withApiAuth(
  async (req, { user }) => {
    const { id, actionKey, expected } = await req.json();
    if (
      typeof actionKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        actionKey,
      )
    )
      throw new HttpError(400, "A valid departure reference is required");
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({ id, expected: snapshot(expected), actorId: user.id }),
      )
      .digest("hex");
    const previous = await prisma.shipmentDeparture.findFirst({
      where: { actionKey },
    });
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "This departure reference belongs to different data",
        );
      return Response.json({ departure: previous, replayed: true });
    }
    const shipment = await prisma.shippingInformation.findUniqueOrThrow({
      where: { id: Number(id) },
    });
    if (
      shipment.truckStatus !== "IN" ||
      Object.keys(snapshot(shipment)).some(
        (key) => shipment[key] !== expected[key],
      )
    )
      throw new HttpError(
        409,
        "Shipment changed or already departed. Reload and review it.",
      );
    const departure = await prisma.shipmentDeparture.create({
      data: {
        shipmentId: shipment.id,
        actorId: user.id,
        actionKey,
        fingerprint,
        snapshot: snapshot(shipment),
      },
    });
    await prisma.shippingInformation.update({
      where: { id: shipment.id },
      data: { truckStatus: "OUT", exitDateTime: departure.createdAt },
    });
    return Response.json({ departure });
  },
  { access: "member", bodyObjects: ["expected"] },
);
