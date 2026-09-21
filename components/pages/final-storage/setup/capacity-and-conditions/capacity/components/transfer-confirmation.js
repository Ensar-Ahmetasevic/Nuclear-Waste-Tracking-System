"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
export default function TransferConfirmation({
  request,
  accept,
  room,
  close,
  preStorage = false,
  approval = null,
  back = null,
}) {
  const dialog = useRef(null),
    heading = useRef(null),
    payload = useRef(null),
    inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState("review");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const client = useQueryClient();
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  useEffect(() => { if (phase !== "review") heading.current?.focus(); }, [phase]);
  async function finish() {
    if (inFlight.current) return;
    close();
    if (result || phase === "unknown" || phase === "conflict") {
      await client.invalidateQueries();
      const next = document.querySelector("main h1, h1, main");
      if (next) {
        next.setAttribute("tabindex", "-1");
        next.focus();
      }
    }
  }
  async function save(event) {
    event?.preventDefault();
    if (inFlight.current) return;
    if (!accept && reason.trim().length < 3) {
      setMessage("Enter a reason with at least 3 characters.");
      return;
    }
    inFlight.current = true;
    setMessage("");
    setPhase("saving");
    payload.current ||= {
      operationType: preStorage
        ? accept
          ? "PRE_STORAGE_ACCEPT_REQUEST"
          : "PRE_STORAGE_REJECT_REQUEST"
        : accept
          ? "FINAL_STORAGE_ACCEPT_RESPONSE"
          : "FINAL_STORAGE_REJECT_RESPONSE",
      data: {
        ...(approval ? { requestedQuantity: approval.requestedQuantity, approvedByEmployeeId: approval.approvedByEmployeeId,
          sources: approval.sources?.map(({ receiptAllocationId, quantity }) => ({ receiptAllocationId, quantity })),
          ...(!approval.sources ? { receiptAllocationId: approval.receiptAllocationId } : {}),
        } : {}),
        id: request.id,
        expectedVersion: request.version,
        actionKey: crypto.randomUUID(),
        ...(!accept ? { reason: reason.trim() } : {}),
      },
    };
    try {
      const response = await fetch(
        "/api/final-storage-setup/final-storage-transver-request",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.current),
          signal: AbortSignal.timeout(20000),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || "Unable to save.");
        return;
      }
      if (!data.result?.id) throw Error("Missing confirmation");
      setResult(data.result);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(
        "Save could not be confirmed. Check the same action before starting another confirmation.",
      );
    } finally {
      inFlight.current = false;
    }
  }
  const linkedSources = preStorage ? approval?.sources || [] : request.sources || (request.source ? [request.source] : []);
  return (
    <dialog
      ref={dialog}
      className="receipt-dialog operational-panel rounded-xl border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
      aria-labelledby="transfer-confirmation-title"
      aria-busy={phase === "saving"}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="transfer-confirmation-title"
        className="text-2xl font-bold"
      >
        {result
          ? accept
            ? preStorage
              ? "Request approved"
              : "Receipt confirmed"
            : preStorage
              ? "Request rejected"
              : "Returned for revision"
          : accept
            ? preStorage
              ? "Review transfer approval"
              : "Review final storage receipt"
            : preStorage
              ? "Review request rejection"
              : "Review return for revision"}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        Step {preStorage ? 2 : 3} · Transfer #{request.id}
      </p>
      {(accept || !preStorage) && <section className="mt-4 space-y-2" aria-label="Transfer sources">
        <h3 className="font-semibold">Source receipts</h3>
        {linkedSources.length ? <ul className="space-y-2">{linkedSources.map(source => <li key={source.receiptAllocationId} className="rounded border border-base-content/20 p-3 break-words">
          <p>{source.sourceLabel || `Source #${source.receiptAllocationId} · Shipment #${source.shipmentId} · Profile #${source.containerProfileId} · Hall #${source.locationId}`}</p>
          <p className="mt-1 font-semibold">{source.quantity} containers</p>
        </li>)}</ul> : <p>Source receipt not linked for this older transfer. Profile traceability is unavailable.</p>}
      </section>}
      <dl className="my-5 grid gap-4 rounded-lg bg-base-200 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-base-content/60">Destination</dt>
          <dd>{room.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Quantity</dt>
          <dd className="font-semibold">
            {approval?.requestedQuantity ?? request.requestedQuantity}{" "}
            containers
          </dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Room configuration</dt>
          <dd>{room.containerType || "Not specified in this request"}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Requested by</dt>
          <dd>
            {request.requestedByEmployee
              ? `${request.requestedByEmployee.name} ${request.requestedByEmployee.surname}`
              : "Not recorded"}
          </dd>
        </div>
      </dl>
      {approval && (
        <p className="mb-4 text-sm">
          Requested: {request.requestedQuantity} containers · Responsible
          employee: {approval.employeeLabel}
        </p>
      )}
      {result ? (
        <div className="operational-confirm space-y-2" role="status">
          <p className="font-semibold text-emerald-500">
            Confirmation #{result.id} saved
          </p>
          <p>
            {result.quantity} containers ·{" "}
            {new Date(result.createdAt).toLocaleString()}
          </p>
          {result.reason && <p>Reason: {result.reason}</p>}
          <p className="text-sm">
            {accept
              ? preStorage
                ? "Request approved. Transport is pending; receipt has not been confirmed."
                : "Transfer marked received."
              : preStorage
                ? "The request has been rejected by pre-storage."
                : "The transfer is back in the pre-storage review queue."}
          </p>
        </div>
      ) : (
        <form onSubmit={save}>
          <p className="mb-4 text-sm">
            {accept
              ? preStorage
                ? "Review the approved quantity, responsible employee and destination before saving."
                : "Confirm only after reviewing the transfer and destination."
              : preStorage
                ? "Explain why this transfer request is being rejected."
                : "This returns the request to pre-storage for review; it does not confirm receipt."}
          </p>
          {!accept && (
            <label className="block text-sm font-medium">
              Reason for {preStorage ? "rejection" : "revision"}
              <textarea
                required
                minLength={3}
                maxLength={1000}
                disabled={phase !== "review"}
                className="textarea mt-2 w-full"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <div className="my-4 text-sm" aria-live="polite" aria-atomic="true">
            {phase === "saving" && <p>Saving confirmation…</p>}
            {message && (
              <p
                className={
                  phase === "unknown" ? "text-amber-400" : "text-error"
                }
              >
                {message}
              </p>
            )}
          </div>
          {phase === "review" && (
            <button
              className="operational-control btn min-h-11 w-full btn-primary"
              type="submit"
            >
              {accept
                ? preStorage
                  ? `Approve ${approval.requestedQuantity} containers`
                  : `Confirm receipt of ${request.requestedQuantity} containers`
                : preStorage
                  ? "Confirm rejection"
                  : "Confirm return for revision"}
            </button>
          )}
          {phase === "saving" && (
            <button disabled className="btn min-h-11 w-full btn-primary">
              Saving…
            </button>
          )}
          {phase === "unknown" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={() => save()}
            >
              Check save result
            </button>
          )}
          {phase === "error" && (
            <button
              type="button"
              className="btn min-h-11 btn-outline"
              onClick={() => save()}
            >
              Retry this confirmation
            </button>
          )}
        </form>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-base-content/10 pt-4">
        {back && phase === "review" && <button type="button" className="btn min-h-11 btn-outline" onClick={back}>Back to sources</button>}
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? "Done — return to tasks"
            : phase === "conflict"
              ? "Close and reload transfer"
              : phase === "unknown"
                ? "Close and review transfer later"
                : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
