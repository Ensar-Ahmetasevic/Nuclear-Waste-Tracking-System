"use client";
import { useState } from "react";
import TransferConfirmation from "./transfer-confirmation";
const labels = {
  requestPending: "Waiting for pre-storage approval",
  transportPending: "Ready for final storage receipt",
  requestRejected: "Rejected by pre-storage",
};
export default function RequestDrawer({ roomData }) {
  const [selected, setSelected] = useState(null);
  return (
    <section className="my-4 space-y-3">
      <h3 className="text-lg font-semibold">Work area tasks · Transfers</h3>
      {roomData.storageTransferRequests
        .filter((r) => r.finalStorageStatus !== "accepted")
        .sort((a, b) => a.id - b.id)
        .map((request) => (
          <article
            key={request.id}
            className="rounded-lg border border-base-content/20 p-4"
          >
            <p className="font-semibold">
              Request #{request.id} · {request.requestedQuantity} containers
            </p>
            <p className="mt-1 text-sm">
              {labels[request.finalStorageStatus] || request.finalStorageStatus}
            </p>
            {request.finalStorageStatus === "transportPending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="operational-control btn min-h-11 btn-sm btn-success"
                  onClick={() =>
                    setSelected({ request: { ...request }, accept: true })
                  }
                >
                  Review receipt
                </button>
                <button
                  className="operational-control btn min-h-11 btn-outline btn-sm"
                  onClick={() =>
                    setSelected({ request: { ...request }, accept: false })
                  }
                >
                  Return for revision
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
