import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/server/api-route";
import { transferDetail } from "@/lib/server/transfer-detail";
import { canAccess } from "@/lib/workspaces.cjs";

// One transfer: steps, sources, destination and recorded actions. The actions
// themselves stay on the existing transfer endpoint and its checks.
async function GETHandler(req, { params, user }) {
  const detail = await transferDetail(Number(params.transferId));
  const { preStorageStatus, finalStorageStatus } = detail.transfer;
  return NextResponse.json({
    ...detail,
    permissions: {
      canApprove:
        canAccess(user, "PRE_STORAGE") &&
        preStorageStatus === "pending" &&
        finalStorageStatus === "requestPending",
      canReceive:
        canAccess(user, "FINAL_STORAGE") &&
        finalStorageStatus === "transportPending",
    },
  });
}

export const GET = withApiAuth(GETHandler);
export const dynamic = "force-dynamic";
