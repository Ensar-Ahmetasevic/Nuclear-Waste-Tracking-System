import { prisma } from "./scoped-database.cjs";

const LISTED = {
  id: true, containerProfileId: true, kind: true, fileName: true, mimeType: true, size: true, actorId: true, createdAt: true,
  removedAt: true, removedById: true, removeReason: true,
};

// Documents of one Container Profile without their file content, newest first.
// Removed ones stay in the list with who removed them and why.
export async function profileDocuments(containerProfileId) {
  return prisma.profileDocument.findMany({ where: { containerProfileId }, orderBy: { id: "desc" }, select: LISTED });
}

// The same list for a shipment page: the documents of its current profiles.
export async function shipmentDocuments(shipment) {
  return prisma.profileDocument.findMany({
    where: { containerProfileId: { in: shipment.containerProfiles.map((row) => row.id) } },
    orderBy: { id: "desc" }, select: LISTED,
  });
}

export const listedDocument = (row) => Object.fromEntries(Object.keys(LISTED).map((key) => [key, row[key]]));
