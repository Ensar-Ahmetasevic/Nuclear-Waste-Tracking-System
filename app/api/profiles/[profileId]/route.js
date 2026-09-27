import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { profileCustody } from "@/lib/server/profile-custody";
import { canAccess, manages } from "@/lib/workspaces.cjs";

// Chain of custody of one Container Profile across all three steps. Container
// corrections (with their reasons) are shown to management only, as on the
// shipment detail.
async function GETHandler(req, { params, user }) {
  const custody = await profileCustody(Number(params.profileId), {
    corrections: manages(user),
  });
  return NextResponse.json({
    ...custody,
    permissions: {
      canOpenShipment: canAccess(user, "SHIPPING"),
      canOpenTransfers:
        canAccess(user, "PRE_STORAGE") || canAccess(user, "FINAL_STORAGE"),
    },
  });
}

export const GET = withApiAuth(GETHandler);
export const dynamic = "force-dynamic";
