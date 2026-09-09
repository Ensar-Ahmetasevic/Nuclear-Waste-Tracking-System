import { withApiAuth } from '@/lib/server/api-route';
import { prisma } from '@/lib/server/scoped-database.cjs';
// FinalStorageEntry was removed by an existing migration. Final entries are
// represented by completed transfers; new entries must use that workflow.
export const POST = withApiAuth(async () => Response.json({ message: 'Use the storage transfer workflow to record final storage arrivals.' }, { status: 410 }));
export const GET = withApiAuth(async () => {
  const entries = await prisma.storageTransferRequest.findMany({ where: { preStorageStatus: 'completed', finalStorageStatus: 'accepted' }, orderBy: { id: 'desc' } });
  const data = entries.map(entry => ({ ...entry, quantity: entry.requestedQuantity }));
  return Response.json({ finalStorageOfCapacityData: data, finalStorageEntryData: data });
});
export const dynamic = 'force-dynamic';
