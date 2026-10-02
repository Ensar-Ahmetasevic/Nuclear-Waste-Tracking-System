"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { InlineLoader } from "../../loading/loaders";
import { AiTextarea } from "../../ui/proofread";

export const differenceText = (t, counted, recorded) =>
  counted === recorded
    ? t("recon.diff.match")
    : t(counted > recorded ? "recon.diff.more" : "recon.diff.fewer", {
        count: Math.abs(counted - recorded),
      });

// Records the result of a count against the figures shown. Recorded stock is not changed.
export default function VerificationDialog({ area, hall, onClose }) {
  const t = useT();
  const format = useFormat();
  const [original] = useState(hall);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    first = useRef(null),
    basis = useRef(null),
    payload = useRef(null),
    busy = useRef(false);
  const titleId = useId(),
    client = useQueryClient();
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, []);
  useEffect(() => {
    if (phase === "edit") first.current?.focus();
    else heading.current?.focus();
  }, [phase]);
  const count = Number(counted),
    recorded = original.figures.recordedQuantity;

  async function review(event) {
    event.preventDefault();
    const found = {};
    if (counted.trim() === "" || !Number.isSafeInteger(count) || count < 0)
      found.count = t("recon.error.count");
    if (reason.trim().length < 3 || reason.trim().length > 1000)
      found.reason = t("recon.error.basis");
    setErrors(found);
    if (found.count) {
      first.current?.focus();
      return;
    }
    if (found.reason) {
      basis.current?.focus();
      return;
    }
    setReason(reason.trim());
    payload.current = null;
    setMessage("");
    setPhase("review");
  }
  function finish() {
    if (busy.current) return;
    if (result || ["conflict", "unknown"].includes(phase))
      client.invalidateQueries({ queryKey: ["stockReconciliation"] });
    onClose();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      area,
      locationId: original.id,
      countedQuantity: count,
      expectedVersion: original.version,
      reason: reason.trim(),
      actionKey: crypto.randomUUID(),
    };
    try {
      const response = await fetch(
        "/api/storage-reconciliation/verifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.current),
          signal: AbortSignal.timeout(20000),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        setPhase([404, 409].includes(response.status) ? "conflict" : "error");
        setMessage(data.message || t("recon.verify.failed"));
        return;
      }
      if (!data.verification?.id) throw Error();
      setResult(data.verification);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("recon.verify.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)",
      ),
    ];
    const firstControl = controls[0],
      last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === firstControl ||
        document.activeElement === heading.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      firstControl.focus();
    }
  }
  const areaLabel = t(`area.${area}`);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold"
      >
        {result
          ? t("recon.verify.done")
          : phase === "edit"
            ? t("recon.verify.title")
            : t("recon.verify.review")}
      </h2>
      <p className="my-3 [overflow-wrap:anywhere]">
        {areaLabel} · #{original.id} · {original.name}
      </p>
      <p className="my-3">{t("recon.verify.intro", { count: recorded })}</p>
      {phase === "edit" ? (
        <form noValidate className="space-y-4" onSubmit={review}>
          {Object.keys(errors).length > 0 && (
            <p role="alert">{t("def.error.fields")}</p>
          )}
          <div>
            <label className="block text-sm">
              {t("recon.counted")}
              <input
                ref={first}
                type="number"
                min="0"
                step="1"
                required
                className="input mt-1 w-full"
                value={counted}
                onChange={(event) => setCounted(event.target.value)}
                aria-invalid={Boolean(errors.count)}
                aria-describedby={
                  errors.count ? `${titleId}-count-error` : undefined
                }
              />
            </label>
            {errors.count && (
              <p
                id={`${titleId}-count-error`}
                className="mt-1 text-sm text-error"
              >
                {errors.count}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm">
              {t("recon.basis")}
              <AiTextarea
                ref={basis}
                required
                minLength={3}
                maxLength={1000}
                className="textarea mt-1 w-full"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(errors.reason)}
                aria-describedby={`${titleId}-basis-hint${errors.reason ? ` ${titleId}-basis-error` : ""}`}
              />
            </label>
            <p
              id={`${titleId}-basis-hint`}
              className="mt-1 text-sm text-base-content/70"
            >
              {t("recon.basis.hint")}
            </p>
            {errors.reason && (
              <p
                id={`${titleId}-basis-error`}
                className="mt-1 text-sm text-error"
              >
                {errors.reason}
              </p>
            )}
          </div>
          <button type="submit" className="btn min-h-11 btn-primary">
            {t("recon.verify.reviewButton")}
          </button>
        </form>
      ) : (
        <>
          <dl className="space-y-3">
            {[
              [t("recon.recorded"), t("ship.containers", { count: recorded })],
              [t("recon.countedShort"), t("ship.containers", { count })],
              [t("recon.result"), differenceText(t, count, recorded)],
              [t("recon.basisShort"), reason.trim()],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
              >
                <dt className="font-semibold">{label}</dt>
                <dd className="whitespace-pre-line">{value}</dd>
              </div>
            ))}
          </dl>
          {count !== recorded && (
            <p className="my-4 rounded-xl border border-warning p-3">
              {t("recon.verify.differenceNote")}
            </p>
          )}
          {phase === "review" && (
            <button
              type="button"
              className="btn mt-4 min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.verify.confirm", { name: original.name })}
            </button>
          )}
          {phase === "saving" && <InlineLoader save />}
          {message && (
            <p role="alert" className="my-3">
              {message}
            </p>
          )}
          {result && (
            <p role="status" className="operational-confirm my-4 text-success">
              {t("recon.verify.result", {
                id: result.id,
                time: format.dateTime(result.createdAt),
                actor: result.actorId,
              })}
            </p>
          )}
          {phase === "unknown" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.verify.check")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {["review", "error"].includes(phase) && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("edit");
            }}
          >
            {t("users.review.back")}
          </button>
        )}
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("recon.closeReload")
              : phase === "unknown"
                ? t("recon.verify.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
