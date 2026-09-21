import { withApiAuth } from "@/lib/server/api-route";
import { storageOverview } from "@/lib/server/storage-overview";
export const GET = withApiAuth((request) =>
  storageOverview(request, "PRE_STORAGE"),
);
