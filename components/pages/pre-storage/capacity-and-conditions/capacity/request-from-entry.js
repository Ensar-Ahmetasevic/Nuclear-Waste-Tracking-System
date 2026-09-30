"use client";
import { useState } from "react";
import { useT } from "../../../../shell/preferences";
import IconTile from "../../../../ui/icon-tile";
import ModalPreStorageCapacityForm from "./modal/modal-pre-storage-capacity-form";
import ModalReturnDelivery from "./modal/modal-return-delivery";
import { earlierReturns } from "./earlier-returns";

// One incoming shipment for this hall: accept opens the receipt form, return
// sends its profiles back to Step 1 with an inspection report.
export default function RequestFromEntry({ entryData, hallData }) {
  const t = useT();
  const [isModalCapacityOpen, setIsModalCapacityOpen] = useState(false);
  const [isModalReturnOpen, setIsModalReturnOpen] = useState(false);
  const earlier = earlierReturns(entryData.profiles);
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-base-200/60 p-3">
      <IconTile icon="truck" tone="step-1" size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {t("ship.number", { id: entryData.id })} · {entryData.companyName}
        </p>
        <p className="text-sm text-base-content/75">
          <span className="font-mono">{entryData.registrationPlates}</span> ·{" "}
          {t("ship.containers", { count: entryData.totalQuantity })}
        </p>
        {earlier.length > 0 && (
          <p className="text-sm font-medium text-warning">
            {t("retHist.hint", { count: earlier.length })}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn min-h-11 btn-sm btn-success"
          onClick={() => setIsModalCapacityOpen(true)}
        >
          {t("rec.accept")}
        </button>
        <button
          type="button"
          className="btn min-h-11 btn-soft btn-error btn-sm"
          onClick={() => setIsModalReturnOpen(true)}
        >
          {t("rec.reject")}
        </button>
      </div>
      <ModalPreStorageCapacityForm
        isOpen={isModalCapacityOpen}
        closeModal={() => setIsModalCapacityOpen(false)}
        hallData={hallData}
        entryData={entryData}
      />
      <ModalReturnDelivery
        isOpen={isModalReturnOpen}
        closeModal={() => setIsModalReturnOpen(false)}
        hallData={hallData}
        entryData={entryData}
      />
    </li>
  );
}
