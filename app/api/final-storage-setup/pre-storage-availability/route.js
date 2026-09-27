import { withApiAuth } from "@/lib/server/api-route";
import { preStorageAvailability } from "@/lib/server/storage-balances";

// Read-only view for Step 3: what pre-storage halls can currently release,
// after administrator-approved corrections and existing reservations.
export const GET = withApiAuth(async () => Response.json({ halls: await preStorageAvailability() }));

export const dynamic = "force-dynamic";
