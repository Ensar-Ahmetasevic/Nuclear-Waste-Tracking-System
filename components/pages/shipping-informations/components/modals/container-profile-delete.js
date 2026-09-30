"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { InlineLoader } from "../../../../loading/loaders";
import { ButtonSpinner } from "../../../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../../../ui/proofread";

export default function ContainerProfileDelete({
  profile,
  open,
  closeModal,
  suspend,
  onUnconfirmed,
}) {
  const t = useT();
  const format = useFormat();
  const [original] = useState(profile);
  const [reason, setReason] = useState("");
  const proofread = useProofread();
  const [phase, setPhase] = useState("review");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    busy = useRef(false),
    payload = useRef(null),
    returnToList = useRef(false);
  const titleId = useId(),
    client = useQueryClient();
  useEffect(() => {
    if (!open) return;
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (!returnToList.current && trigger?.isConnected) trigger.focus();
        else document.getElementById("shipment-containers-heading")?.focus();
      });
    };
  }, [open]);
  useEffect(() => {
    heading.current?.focus();
  }, [phase]);
  async function finish() {
    if (busy.current) return;
    if (phase === "unknown") {
      suspend();
      return;
    }
    returnToList.current = Boolean(result);
    closeModal();
    if (result || phase === "conflict") {
      await client.invalidateQueries();
      if (result)
        document.getElementById("shipment-containers-heading")?.focus();
    }
  }
  async function save(event) {
    event?.preventDefault();
    if (busy.current || reason.trim().length < 3) return;
    // A retry resends the saved request unchanged; only the first send is checked.
    let written = reason.trim();
    if (!payload.current) {
      if (proofread.waiting) return;
      written = (await proofread.confirm(written)).trim();
      setReason(written);
    }
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      id: original.id,
      actionKey: crypto.randomUUID(),
      reason: written,
      expected: {
        quantity: original.quantity,
        locationOriginId: original.locationOriginId,
        wasteProfileId: original.wasteProfileId,
        containerStatus: original.containerStatus,
        truckStatus: original.truckStatus,
      },
    };
    try {
      const response = await fetch("/api/container-profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        onUnconfirmed(false);
        setPhase(
          response.status === 409 || response.status === 404
            ? "conflict"
            : "error",
        );
        setMessage(data.message || t("del.failed"));
        return;
      }
      if (!data.removal?.id) throw Error();
      onUnconfirmed(false);
      setResult(data.removal);
      setPhase("success");
    } catch {
      onUnconfirmed(true);
      setPhase("unknown");
      setMessage(t("del.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled), textarea:not(:disabled)",
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      heading.current?.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === heading.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold"
      >
        {result ? t("del.done") : t("del.title")}
      </h2>
      <p className="my-3">
        {t("ship.profile", { id: original.id })} ·{" "}
        {t("ship.number", { id: original.shippingInformationId })} ·{" "}
        {original.truckStatus}
      </p>
      {original.truckStatus === "OUT" && (
        <p className="my-3 rounded-xl border border-warning p-3">
          {t("del.outNote")}
        </p>
      )}
      <dl className="space-y-3">
        {[
          [t("field.quantity"), original.quantity],
          [
            t("field.locationOrigin"),
            `${original.locationOrigin.name} (#${original.locationOriginId})`,
          ],
          [
            t("field.wasteProfile"),
            `${original.wasteProfile.name} (#${original.wasteProfileId})`,
          ],
          [
            t("field.containerStatus"),
            t(`profile.${original.containerStatus}`),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
          >
            <dt className="font-semibold">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="my-4">{t("del.effect")}</p>
      {phase === "review" ? (
        <form className="space-y-4" onSubmit={save}>
          <label className="block text-sm">
            {t("del.reason")}
            <textarea
              required
              minLength={3}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <ProofreadPrompt proofread={proofread} />
          <button
            type="submit"
            className="btn min-h-11 btn-error"
            disabled={reason.trim().length < 3 || proofread.waiting}
          >
            {proofread.checking && <ButtonSpinner />}
            {t("ship.profile.delete", { id: original.id })}
          </button>
        </form>
      ) : (
        <>
          <p className="my-4 [overflow-wrap:anywhere]">
            {t("ship.reason", { reason: reason.trim() })}
          </p>
          {phase === "saving" && <InlineLoader save />}
          {message && (
            <p role="alert" className="my-3">
              {message}
            </p>
          )}
          {result && (
            <p role="status" className="operational-confirm text-success">
              {t("del.result", {
                id: result.id,
                time: format.dateTime(result.createdAt),
                actor: result.actorId,
              })}
            </p>
          )}
          {["unknown", "conflict"].includes(phase) && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              {t("ship.checkDeletion")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {phase === "error" && (
          <button
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setPhase("review");
            }}
          >
            {t("def.backToReview")}
          </button>
        )}
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("del.doneButton")
            : phase === "unknown"
              ? t("prep.closeKeep")
              : phase === "conflict"
                ? t("prep.closeReload")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
