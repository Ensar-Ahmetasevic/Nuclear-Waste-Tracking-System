"use client";
import { useState } from "react";
import dayjs from "dayjs";
import ModalAcceptRequestFromFinalStorageForm from "../../modal/modal-accept-request-from-final-storage-form";
export default function RequestFromFinalStorage({ requestData }) {
  const [decision, setDecision] = useState(null);
  return (
    <article className="my-3 rounded-lg border border-base-content/20 bg-base-200 p-4">
      <h3 className="font-semibold">
        Transfer #{requestData.id} · {requestData.requestedByRoom}
      </h3>
      <p className="mt-2">
        {requestData.requestedQuantity} containers · Requested{" "}
        {dayjs(requestData.createdAt).format("DD.MM.YYYY HH:mm")}
      </p>
      <p className="text-sm">
        Requested by: {requestData.requestedByEmployee?.name}{" "}
        {requestData.requestedByEmployee?.surname}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="btn min-h-11 btn-primary"
          onClick={() =>
            setDecision({ request: { ...requestData }, accept: true })
          }
        >
          Review approval
        </button>
        <button
          className="btn min-h-11 btn-outline"
          onClick={() =>
            setDecision({ request: { ...requestData }, accept: false })
          }
        >
          Review rejection
        </button>
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
