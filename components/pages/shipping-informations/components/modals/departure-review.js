"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
export default function DepartureReview({ shipment, close }) {
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
        setMessage(data.message || "Unable to record departure.");
        return;
      }
      if (!data.departure?.id) throw Error("Missing result");
      setResult(data.departure);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(
        "Departure could not be confirmed. Check this attempt before recording another departure.",
      );
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
      className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        id="departure-title"
        tabIndex={-1}
        ref={heading}
        className="text-2xl font-bold"
      >
        {result ? "Departure recorded" : "Review truck departure"}
      </h2>
      <p className="my-3">Step 1 · Shipment #{reviewed.id}</p>
      <dl className="space-y-2 rounded-lg bg-base-200 p-4 break-words">
        <dt>Company</dt>
        <dd className="font-semibold">{reviewed.companyName}</dd>
        <dt>Driver</dt>
        <dd>{reviewed.driverName}</dd>
        <dt>Registration plates</dt>
        <dd>{reviewed.registrationPlates}</dd>
      </dl>
      {result ? (
        <div className="operational-confirm mt-4" role="status">
          <p className="font-semibold text-success">
            Departure #{result.id} saved · OUT
          </p>
          <p>
            {new Date(result.createdAt).toLocaleString()} · User #
            {result.actorId}
          </p>
        </div>
      ) : (
        <>
          <p className="my-4">
            This records that the truck has left the unloading zone. The
            shipment becomes read-only for Employee and Supervision; corrections
            remain available to administrators.
          </p>
          {phase === "review" && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              Record departure — mark OUT
            </button>
          )}
          {phase === "saving" && (
            <button className="btn min-h-11" disabled>
              Recording departure…
            </button>
          )}
          {["unknown", "error"].includes(phase) && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              Check departure result
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
            ? "Done — return to shipment"
            : phase === "conflict"
              ? "Close and reload shipment"
              : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
