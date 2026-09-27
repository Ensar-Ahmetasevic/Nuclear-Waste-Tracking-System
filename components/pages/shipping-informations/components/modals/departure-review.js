"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { SavingButton } from "../../../../loading/loaders";
export default function DepartureReview({ shipment, close }) {
  const t = useT();
  const format = useFormat();
  const [reviewed] = useState(() => ({ ...shipment }));
  const [phase, setPhase] = useState("review"),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    busy = useRef(false),
    payload = useRef(null);
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
  async function finish() {
    if (busy.current) return;
    close();
    if (result || phase === "unknown" || phase === "conflict") {
      await client.invalidateQueries();
      const title = document.querySelector("main h1,h1");
      if (title) {
        title.setAttribute("tabindex", "-1");
        title.focus();
      }
    }
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      id: reviewed.id,
      actionKey: crypto.randomUUID(),
      expected: {
        companyName: reviewed.companyName,
        driverName: reviewed.driverName,
        registrationPlates: reviewed.registrationPlates,
        truckStatus: reviewed.truckStatus,
      },
    };
    try {
      const response = await fetch("/api/shipping-informations/departure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unknown");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("dep.failed"));
        return;
      }
      if (!data.departure?.id) throw Error("Missing result");
      setResult(data.departure);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("dep.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      aria-labelledby="departure-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        id="departure-title"
        tabIndex={-1}
        ref={heading}
        className="text-2xl font-semibold"
      >
        {result ? t("dep.done") : t("dep.title")}
      </h2>
      <p className="my-3">
        {t("area.SHIPPING")} ·{" "}
        {t("ship.number", { id: reviewed.id })}
      </p>
      <dl className="grid gap-2 rounded-xl bg-base-200/70 p-4 break-words sm:grid-cols-3">
        <div>
          <dt className="text-sm text-base-content/70">
            {t("field.companyName")}
          </dt>
          <dd className="font-semibold">{reviewed.companyName}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/70">
            {t("field.driverName")}
          </dt>
          <dd>{reviewed.driverName}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/70">{t("ship.plates")}</dt>
          <dd className="font-mono">{reviewed.registrationPlates}</dd>
        </div>
      </dl>
      {result ? (
        <div className="operational-confirm mt-4" role="status">
          <p className="font-semibold text-success">
            {t("dep.result", { id: result.id })}
          </p>
          <p>
            {t("meas.form.recorded", {
              time: format.dateTime(result.createdAt),
              actor: result.actorId,
            })}
          </p>
        </div>
      ) : (
        <>
          <p className="my-4">{t("dep.effect")}</p>
          {phase === "review" && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              {t("dep.confirm")}
            </button>
          )}
          {phase === "saving" && (
            <SavingButton />
          )}
          {["unknown", "error"].includes(phase) && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              {t("dep.check")}
            </button>
          )}
        </>
      )}
      <p className="my-4 text-sm" aria-live="polite">
        {message}
      </p>
      <div className="flex justify-end border-t border-base-content/15 pt-4">
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("dep.doneButton")
            : phase === "conflict"
              ? t("prep.closeReload")
              : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
