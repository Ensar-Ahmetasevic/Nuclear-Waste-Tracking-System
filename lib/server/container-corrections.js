import { prisma } from "./scoped-database.cjs";
import { HttpError } from "./errors.cjs";
export const profileSnapshot = (profile, shipment) => ({
  quantity: profile.quantity, locationOriginId: profile.locationOriginId,
  wasteProfileId: profile.wasteProfileId, containerStatus: profile.containerStatus,
  truckStatus: shipment.truckStatus,
});
export async function assertUnreceivedProfile(profile) {
  if (!['pending', 'rejected'].includes(profile.containerStatus) ||
      await prisma.receiptAllocation.count({ where: { containerProfileId: profile.id } }) ||
      await prisma.transferSource.count({ where: { containerProfileId: profile.id } })) {
    throw new HttpError(409, "This profile has a receipt or transfer history. Its quantity, origin, waste profile and receipt status cannot be rewritten here. Review the linked records with an administrator.");
  }
}
