"use client";
import { useState } from "react";
import Link from "next/link";
import ModalAcceptRequestFromFinalStorageForm from "../../modal/modal-accept-request-from-final-storage-form";
import { useT } from "../../../../../../shell/preferences";
import { useFormat } from "../../../../../../ui/format";
import IconTile from "../../../../../../ui/icon-tile";
export default function RequestFromFinalStorage({ requestData }) {
  const t = useT();
  const format = useFormat();
  const [decision, setDecision] = useState(null);
  return (
    <article className="flex flex-wrap items-start gap-3 rounded-xl border border-step-3/40 bg-base-200/60 p-3">
      <IconTile icon="transfer" tone="step-3" size="sm" />
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold">
          {t("records.transfer", { id: requestData.id })} ·{" "}
          {requestData.requestedByRoom}
        </h4>
        <p className="text-sm">
          {t("ship.containers", { count: requestData.requestedQuantity })} ·{" "}
          {t("xfer.requested", {
            time: format.dateTime(requestData.createdAt),
          })}
        </p>
        <p className="text-sm text-base-content/70">
          {t("xfer.requestedBy", {
            name: `${requestData.requestedByEmployee?.name || ""} ${requestData.requestedByEmployee?.surname || ""}`.trim(),
          })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn min-h-11 btn-sm btn-success"
          onClick={() =>
            setDecision({ request: { ...requestData }, accept: true })
          }
        >
          {t("xfer.reviewApproval")}
        </button>
        <button
          className="btn min-h-11 btn-soft btn-error btn-sm"
          onClick={() =>
            setDecision({ request: { ...requestData }, accept: false })
          }
        >
          {t("xfer.reviewRejection")}
        </button>
        <Link
          href={`/transfers/${requestData.id}`}
          aria-label={t("xfer.openAria", { id: requestData.id })}
          className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
        >
          {t("xfer.open")}
        </Link>
      </div>
      {decision && (
        <ModalAcceptRequestFromFinalStorageForm
          isOpen
          requestData={decision.request}
          accept={decision.accept}
          closeModal={() => setDecision(null)}
        />
      )}
    </article>
  );
}
