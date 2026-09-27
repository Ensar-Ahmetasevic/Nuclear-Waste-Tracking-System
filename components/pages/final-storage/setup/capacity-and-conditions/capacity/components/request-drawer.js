"use client";
import { useState } from "react";
import Link from "next/link";
import TransferConfirmation from "./transfer-confirmation";
import { useT } from "../../../../../../shell/preferences";
import IconTile from "../../../../../../ui/icon-tile";
import StatusChip from "../../../../../../ui/status-chip";
const TONES = {
  requestPending: "info",
  transportPending: "warning",
  requestRejected: "error",
};
export default function RequestDrawer({ roomData }) {
  const t = useT();
  const [selected, setSelected] = useState(null);
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t("xfer.final.title")}</h3>
      {roomData.storageTransferRequests
        .filter((r) => r.finalStorageStatus !== "accepted")
        .sort((a, b) => a.id - b.id)
        .map((request) => (
          <article
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-base-content/15 bg-base-200/60 p-3"
          >
            <IconTile icon="transfer" tone="step-3" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {t("xfer.request", { id: request.id })} ·{" "}
                {t("ship.containers", { count: request.requestedQuantity })}
              </p>
              <StatusChip tone={TONES[request.finalStorageStatus] || "neutral"}>
                {t(`xfer.status.${request.finalStorageStatus}`) ===
                `xfer.status.${request.finalStorageStatus}`
                  ? request.finalStorageStatus
                  : t(`xfer.status.${request.finalStorageStatus}`)}
              </StatusChip>
            </div>
            <Link
              href={`/transfers/${request.id}`}
              aria-label={t("xfer.openAria", { id: request.id })}
              className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
            >
              {t("xfer.open")}
            </Link>
            {request.finalStorageStatus === "transportPending" && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="operational-control btn min-h-11 btn-sm btn-success"
                  onClick={() =>
                    setSelected({ request: { ...request }, accept: true })
                  }
                >
                  {t("xfer.reviewReceipt")}
                </button>
                <button
                  className="operational-control btn min-h-11 btn-outline btn-sm"
                  onClick={() =>
                    setSelected({ request: { ...request }, accept: false })
                  }
                >
                  {t("xfer.return")}
                </button>
              </div>
            )}
          </article>
        ))}
      {selected && (
        <TransferConfirmation
          request={selected.request}
          accept={selected.accept}
          room={roomData}
          close={() => setSelected(null)}
        />
      )}
    </section>
  );
}
