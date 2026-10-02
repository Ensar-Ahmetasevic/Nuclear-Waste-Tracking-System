"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { SavingButton } from "../../../../loading/loaders";
import { AiTextarea } from "../../../../ui/proofread";
// Field → label key.
const detailFields = {
  companyName: "field.companyName",
  driverName: "field.driverName",
  registrationPlates: "ship.plates",
};
export default function ModalTruckUpdate({
  modalTruckFormData: original,
  closeModal,
  lifecycle = false,
}) {
  const t = useT();
  const format = useFormat();
  const fields = lifecycle
    ? {
        truckStatus: "field.truckStatus",
        entryDateTime: "field.entryDateTime",
        exitDateTime: "field.exitDateTime",
      }
    : detailFields;
  const display = (value) =>
    !value
      ? t("ship.notRecorded")
      : lifecycle && value.includes("T") && Number.isFinite(Date.parse(value))
        ? format.dateTime(value)
        : value;
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.keys(fields).map((key) => [key, original[key] || ""]),
    ),
  );
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    payload = useRef(null),
    busy = useRef(false);
  const client = useQueryClient();
  const correction = lifecycle || original.truckStatus === "OUT";
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
    if (phase === "edit")
      (
        dialog.current?.querySelector("input, select") || heading.current
      )?.focus();
    else heading.current?.focus();
  }, [phase]);
  async function finish() {
    if (busy.current) return;
    closeModal();
    if (result || phase === "unknown" || phase === "conflict")
      await client.invalidateQueries();
  }
  async function review(event) {
    event.preventDefault();
    if (
      Object.keys(fields).every(
        (key) => values[key].trim() === (original[key] || ""),
      )
    ) {
      setMessage(t("def.error.unchanged"));
      return;
    }
    setReason(reason.trim());
    payload.current = null;
    setMessage("");
    setPhase("review");
    heading.current?.focus();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      [lifecycle ? "shippingStatusData" : "updatedTruckData"]: {
        id: original.id,
        ...Object.fromEntries(
          Object.entries(values).map(([key, value]) => [
            key,
            lifecycle && key === "exitDateTime" && !value ? null : value.trim(),
          ]),
        ),
        expected: {
          ...Object.fromEntries(
            Object.keys(fields).map((key) => [key, original[key]]),
          ),
          truckStatus: original.truckStatus,
        },
        reason: reason.trim(),
        actionKey: crypto.randomUUID(),
      },
    };
    try {
      const response = await fetch("/api/shipping-informations", {
        method: lifecycle ? "PATCH" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("users.change.failed"));
        return;
      }
      setResult(data);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("truck.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="shipment-edit-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        id="shipment-edit-title"
        ref={heading}
        tabIndex={-1}
        className="text-2xl font-semibold"
      >
        {result
          ? t("truck.done")
          : phase === "edit"
            ? t("truck.title")
            : t("truck.review")}
      </h2>
      <p className="my-3 text-sm">
        {t("ship.number", { id: original.id })} · {original.truckStatus}
        {correction ? ` · ${t("truck.correction")}` : ""}
      </p>
      {phase === "edit" ? (
        <form onSubmit={review} className="space-y-4">
          {Object.entries(fields).map(([key, label]) => (
            <label key={key} className="block text-sm">
              {t(label)}
              {lifecycle && key === "truckStatus" ? (
                <select
                  className="select mt-1 w-full"
                  value={values[key]}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      truckStatus: event.target.value,
                      ...(event.target.value === "IN"
                        ? { exitDateTime: "" }
                        : {}),
                    })
                  }
                >
                  <option>IN</option>
                  <option>OUT</option>
                </select>
              ) : (
                <input
                  required={
                    !lifecycle ||
                    key !== "exitDateTime" ||
                    values.truckStatus === "OUT"
                  }
                  disabled={
                    lifecycle &&
                    key === "exitDateTime" &&
                    values.truckStatus === "IN"
                  }
                  type={lifecycle ? "datetime-local" : "text"}
                  step={lifecycle ? "0.001" : undefined}
                  maxLength={1000}
                  className="input mt-1 w-full"
                  value={
                    lifecycle && values[key]
                      ? new Date(
                          new Date(values[key]).getTime() -
                            new Date(values[key]).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, -1)
                      : values[key]
                  }
                  onChange={(event) =>
                    setValues({
                      ...values,
                      [key]: lifecycle
                        ? event.target.value
                          ? new Date(event.target.value).toISOString()
                          : ""
                        : event.target.value,
                    })
                  }
                />
              )}
              {lifecycle && key !== "truckStatus" && (
                <span className="text-xs">
                  {t("truck.localTime", {
                    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  })}
                </span>
              )}
            </label>
          ))}
          <label className="block text-sm">
            {t("corr.reason")}
            <AiTextarea
              required
              minLength={3}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            {correction && (
              <span className="text-xs text-base-content/70">
                {t("truck.reasonHint")}
              </span>
            )}
          </label>
          <button className="btn min-h-11 btn-primary" type="submit">
            {t("users.reviewChanges")}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {Object.entries(fields)
            .filter(([key]) => (original[key] || "") !== values[key].trim())
            .map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl bg-base-200/70 p-3 break-words"
              >
                <p className="font-semibold">{t(label)}</p>
                <p>{t("ship.before", { value: display(original[key]) })}</p>
                <p>{t("ship.after", { value: display(values[key].trim()) })}</p>
              </div>
            ))}
          <p className="break-words">{t("ship.reason", { reason })}</p>
          {lifecycle &&
            values.truckStatus === "IN" &&
            original.truckStatus === "OUT" && (
              <p className="rounded-xl border border-warning p-3">
                {t("truck.restoreIn")}
              </p>
            )}
          {result ? (
            <div role="status" className="operational-confirm">
              <p className="font-semibold text-success">
                {result.correction
                  ? t("truck.correctionSaved", { id: result.correction.id })
                  : t("truck.saved")}
              </p>
              {result.correction && (
                <p>
                  {t("meas.form.recorded", {
                    time: format.dateTime(result.correction.createdAt),
                    actor: result.correction.actorId,
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {phase === "review" && (
                <>
                  <button className="btn min-h-11 btn-primary" onClick={save}>
                    {correction
                      ? t("truck.saveCorrection")
                      : t("truck.saveChanges")}
                  </button>
                  <button
                    className="btn min-h-11 btn-outline"
                    onClick={() => setPhase("edit")}
                  >
                    {t("users.review.back")}
                  </button>
                </>
              )}
              {phase === "saving" && (
                <SavingButton />
              )}
              {phase === "error" && (
                <button
                  className="btn min-h-11"
                  onClick={() => setPhase("edit")}
                >
                  {t("users.review.back")}
                </button>
              )}
              {phase === "unknown" && (
                <button className="btn min-h-11 btn-primary" onClick={save}>
                  {t("users.change.check")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="my-4 text-sm">
        {message}
      </p>
      <div className="mt-5 flex justify-end border-t border-base-content/15 pt-4">
        <button
          disabled={phase === "saving"}
          className="btn min-h-11 btn-outline"
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("prep.closeReload")
              : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
