import { withApiAuth } from "@/lib/server/api-route";
import { prisma } from "@/lib/server/scoped-database.cjs";
export const GET = withApiAuth(async () => {
  const finalStorageLocationData = await prisma.finalStorageLocation.findMany({
    where: {
      storageTransferRequests: { some: { preStorageStatus: "pending" } },
    },
    select: {
      id: true,
      name: true,
      containerType: true,
      storageTransferRequests: {
        where: { preStorageStatus: "pending" },
        select: {
          id: true,
          version: true,
          requestedQuantity: true,
          requestedByRoom: true,
          finalStorageStatus: true,
          preStorageStatus: true,
          finalStorageLocationId: true,
          createdAt: true,
          requestedByEmployee: { select: { name: true, surname: true } },
        },
      },
    },
  });
  return Response.json({ finalStorageLocationData });
});
