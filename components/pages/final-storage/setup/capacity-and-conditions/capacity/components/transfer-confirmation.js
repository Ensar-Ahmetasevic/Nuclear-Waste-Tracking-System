"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../../../../../shell/preferences";
import { useFormat } from "../../../../../../ui/format";
import { InlineLoader } from "../../../../../../loading/loaders";
import { ButtonSpinner } from "../../../../../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../../../../../ui/proofread";
export default function TransferConfirmation({
  request,
  accept,
  room,
  close,
  preStorage = false,
  approval = null,
  back = null,
}) {
  const t = useT();
  const format = useFormat();
  // approve / reject (pre-storage decision) or receive / return (final storage).
  const mode = preStorage
    ? accept
      ? "approve"
      : "reject"
    : accept
      ? "receive"
      : "return";
  const dialog = useRef(null),
    heading = useRef(null),
    payload = useRef(null),
    inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const proofread = useProofread();
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
  useEffect(() => {
    if (phase !== "review") heading.current?.focus();
  }, [phase]);
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
      setMessage(t("conf.reasonShort"));
      return;
    }
    // A retry resends the saved request unchanged; only the first send is checked.
    let written = reason.trim();
    if (!accept && !payload.current) {
      if (proofread.waiting) return;
      written = (await proofread.confirm(written)).trim();
      setReason(written);
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
        ...(approval
          ? {
              requestedQuantity: approval.requestedQuantity,
              approvedByEmployeeId: approval.approvedByEmployeeId,
              sources: approval.sources?.map(
                ({ receiptAllocationId, quantity }) => ({
                  receiptAllocationId,
                  quantity,
                }),
              ),
              ...(!approval.sources
                ? { receiptAllocationId: approval.receiptAllocationId }
                : {}),
            }
          : {}),
        id: request.id,
        expectedVersion: request.version,
        actionKey: crypto.randomUUID(),
        ...(!accept ? { reason: written } : {}),
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
        setMessage(data.message || t("conf.failed"));
        return;
      }
      if (!data.result?.id) throw Error("Missing confirmation");
      setResult(data.result);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("conf.unconfirmed"));
    } finally {
      inFlight.current = false;
    }
  }
  const linkedSources = preStorage
    ? approval?.sources || []
    : request.sources || (request.source ? [request.source] : []);
  return (
    <dialog
      ref={dialog}
      className="receipt-dialog operational-panel rounded-box border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
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
        className="text-2xl font-semibold"
      >
        {result ? t(`conf.${mode}.done`) : t(`conf.${mode}.title`)}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        {t(preStorage ? "area.PRE_STORAGE" : "area.FINAL_STORAGE")} ·{" "}
        {t("records.transfer", { id: request.id })}
      </p>
      {(accept || !preStorage) && (
        <section className="mt-4 space-y-2" aria-label={t("conf.sources")}>
          <h3 className="font-semibold">{t("conf.sources")}</h3>
          {linkedSources.length ? (
            <ul className="space-y-2">
              {linkedSources.map((source) => (
                <li
                  key={source.receiptAllocationId}
                  className="rounded-xl border border-base-content/15 p-3 break-words"
                >
                  <p>
                    {source.sourceLabel ||
                      t("conf.source", {
                        id: source.receiptAllocationId,
                        shipment: source.shipmentId,
                        profile: source.containerProfileId,
                        hall: source.locationId,
                      })}
                  </p>
                  <p className="mt-1 font-semibold">
                    {t("ship.containers", { count: source.quantity })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("conf.noSource")}</p>
          )}
        </section>
      )}
      <dl className="my-5 grid gap-4 rounded-xl bg-base-200/70 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-base-content/60">
            {t("rec.destinationLabel")}
          </dt>
          <dd>{room.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">
            {t("field.quantity")}
          </dt>
          <dd className="font-semibold">
            {t("ship.containers", {
              count: approval?.requestedQuantity ?? request.requestedQuantity,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">
            {t("conf.roomConfig")}
          </dt>
          <dd>{room.containerType || t("conf.notSpecified")}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">
            {t("conf.requestedBy")}
          </dt>
          <dd>
            {request.requestedByEmployee
              ? `${request.requestedByEmployee.name} ${request.requestedByEmployee.surname}`
              : t("ship.notRecorded")}
          </dd>
        </div>
      </dl>
      {approval && (
        <p className="mb-4 text-sm">
          {t("conf.approvalSummary", {
            containers: t("ship.containers", {
              count: request.requestedQuantity,
            }),
            employee: approval.employeeLabel,
          })}
        </p>
      )}
      {result ? (
        <div className="operational-confirm space-y-2" role="status">
          <p className="font-semibold text-success">
            {t("conf.result", { id: result.id })}
          </p>
          <p>
            {t("ship.containers", { count: result.quantity })} ·{" "}
            {format.dateTime(result.createdAt)}
          </p>
          {result.reason && (
            <p>{t("ship.reason", { reason: result.reason })}</p>
          )}
          <p className="text-sm">{t(`conf.${mode}.after`)}</p>
        </div>
      ) : (
        <form onSubmit={save}>
          <p className="mb-4 text-sm">{t(`conf.${mode}.intro`)}</p>
          {!accept && (
            <label className="block text-sm font-medium">
              {t(preStorage ? "conf.reasonReject" : "conf.reasonReturn")}
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
          <ProofreadPrompt proofread={proofread} />
          <div className="my-4 text-sm" aria-live="polite" aria-atomic="true">
            {phase === "saving" && <InlineLoader save />}
            {message && (
              <p
                className={phase === "unknown" ? "text-warning" : "text-error"}
              >
                {message}
              </p>
            )}
          </div>
          {phase === "review" && (
            <button
              className={`operational-control btn min-h-11 w-full ${accept ? "btn-success" : "btn-error"}`}
              type="submit"
              disabled={proofread.waiting}
            >
              {proofread.checking && <ButtonSpinner />}
              {t(`conf.${mode}.confirm`, {
                count: accept
                  ? preStorage
                    ? approval.requestedQuantity
                    : request.requestedQuantity
                  : undefined,
              })}
            </button>
          )}
          {phase === "saving" && (
            <button disabled className="btn min-h-11 w-full btn-primary">
              <ButtonSpinner />
              {t("common.saving")}
            </button>
          )}
          {phase === "unknown" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={() => save()}
            >
              {t("users.change.check")}
            </button>
          )}
          {phase === "error" && (
            <button
              type="button"
              className="btn min-h-11 btn-outline"
              onClick={() => save()}
            >
              {t("conf.retry")}
            </button>
          )}
        </form>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-base-content/10 pt-4">
        {back && phase === "review" && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={back}
          >
            {t("conf.backToSources")}
          </button>
        )}
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("rec.doneButton")
            : phase === "conflict"
              ? t("prep.closeReload")
              : phase === "unknown"
                ? t("rec.closeLater")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
