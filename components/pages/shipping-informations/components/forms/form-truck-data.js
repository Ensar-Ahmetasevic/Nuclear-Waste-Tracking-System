"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { InlineLoader } from "../../../../loading/loaders";

// Labels: field.<key> (companyName, driverName) and ship.plates.
const fields = [
  ["companyName", "field.companyName"],
  ["driverName", "field.driverName"],
  ["registrationPlates", "ship.plates"],
];
export default function FormTruckData({ onSubmitForm, closeModal }) {
  const t = useT();
  const format = useFormat();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [phase, setPhase] = useState("edit"),
    [draft, setDraft] = useState(null),
    [result, setResult] = useState(null),
    [message, setMessage] = useState("");
  const dialog = useRef(null),
    heading = useRef(null),
    busy = useRef(false);
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
    if (phase === "edit")
      (dialog.current?.querySelector("input") || heading.current)?.focus();
    else heading.current?.focus();
  }, [phase]);
  function finish() {
    if (busy.current) return;
    if (result || phase === "unknown") client.invalidateQueries();
    if (result) onSubmitForm();
    else closeModal();
  }
  function review(values) {
    setDraft({
      ...Object.fromEntries(fields.map(([key]) => [key, values[key].trim()])),
      actionKey: crypto.randomUUID(),
    });
    setMessage("");
    setPhase("review");
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    try {
      const response = await fetch("/api/shipping-informations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("arrival.failed"));
        return;
      }
      if (!data.arrival?.shipmentId) throw Error("Missing confirmation");
      setResult(data.arrival);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("arrival.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="arrival-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="arrival-title"
        className="text-2xl font-semibold"
      >
        {result
          ? t("arrival.done")
          : phase === "edit"
            ? t("arrival.title")
            : t("arrival.review")}
      </h2>
      <p className="my-4 text-sm">{t("ship.eyebrow")}</p>
      <form
        noValidate
        onSubmit={handleSubmit(review)}
        className={phase === "edit" ? "space-y-4" : "hidden"}
      >
        {fields.map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`arrival-${key}`} className="block text-sm">
              {t(label)}
            </label>
            <input
              id={`arrival-${key}`}
              className="input mt-1 w-full"
              aria-invalid={Boolean(errors[key])}
              aria-describedby={
                errors[key] ? `arrival-error-${key}` : undefined
              }
              {...register(key, {
                validate: (value) =>
                  Boolean(value?.trim()) ||
                  t("def.error.required", { field: t(label) }),
                maxLength: { value: 200, message: t("arrival.maxLength") },
              })}
            />
            {errors[key] && (
              <p
                id={`arrival-error-${key}`}
                role="alert"
                className="mt-1 text-sm text-error"
              >
                {errors[key].message}
              </p>
            )}
          </div>
        ))}
        <button type="submit" className="btn min-h-11 btn-primary">
          {t("arrival.reviewButton")}
        </button>
      </form>
      {phase !== "edit" && (
        <div className="space-y-4">
          <dl className="space-y-3 rounded-xl bg-base-200/70 p-4">
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt className="text-sm text-base-content/70">{t(label)}</dt>
                <dd className="font-medium break-words">
                  {(result?.snapshot || draft)?.[key]}
                </dd>
              </div>
            ))}
          </dl>
          {result ? (
            <div role="status" className="operational-confirm space-y-2">
              <p className="font-semibold text-success">
                {t("arrival.result", { id: result.shipmentId })}
              </p>
              <p>
                {t("meas.form.recorded", {
                  time: format.dateTime(result.createdAt),
                  actor: result.actorId,
                })}
              </p>
              <p>{t("arrival.next")}</p>
            </div>
          ) : (
            <p>{t("arrival.note")}</p>
          )}
          {phase === "saving" && <InlineLoader save />}
          {phase === "review" && (
            <div className="flex flex-wrap gap-3">
              <button className="btn min-h-11" onClick={() => setPhase("edit")}>
                {t("users.review.back")}
              </button>
              <button className="btn min-h-11 btn-primary" onClick={save}>
                {t("arrival.confirm")}
              </button>
            </div>
          )}
          {phase === "error" && (
            <button className="btn min-h-11" onClick={() => setPhase("edit")}>
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
      <p className="my-4 text-sm" aria-live="polite">
        {message}
      </p>
      <div className="mt-5 flex justify-end border-t border-base-content/20 pt-4">
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("arrival.doneButton")
            : phase === "unknown"
              ? t("arrival.closeUnconfirmed")
              : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
