"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";

export default function ModalPreStorageCapacityForm({ isOpen, ...props }) {
  return isOpen ? <ReceiptReview {...props} /> : null;
}
function ReceiptReview({ closeModal, hallData, entryData }) {
  const dialog = useRef(null);
  const title = useRef(null);
  const frozenRequest = useRef(null);
  const inFlight = useRef(false);
  const client = useQueryClient();
  const [employee, setEmployee] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState(null);
  const {
    data: employees,
    isLoading,
    isError,
    refetch,
  } = usePreStorageEmployeeQuery();
  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement;
    node.showModal();
    title.current?.focus();
    return () => {
      node.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  async function finish() {
    if (inFlight.current) return;
    closeModal();
    if (receipt || phase === "unknown") {
      await client.invalidateQueries();
      const heading = document.querySelector("main h1, h1, main");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }
  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase("saving");
    setMessage("");
    if (!frozenRequest.current)
      frozenRequest.current = {
        receiptKey: crypto.randomUUID(),
        quantity: entryData.totalQuantity,
        containerProfileIds: entryData.containerProfileIds,
        preStorageLocationId: hallData.id,
        responsiblePreStorageEmployeeId: Number(employee),
      };
    try {
      const response = await fetch("/api/pre-storage-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frozenRequest.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw new Error("Unconfirmed response");
        setPhase("error");
        setMessage(data.message || "The receipt could not be recorded.");
        return;
      }
      if (!data.receipt?.id) throw new Error("Missing receipt reference");
      setReceipt(data.receipt);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(
        "Save could not be confirmed. Check the result using the same receipt reference before starting another receipt.",
      );
    } finally {
      inFlight.current = false;
    }
  }
  const busy = phase === "saving";
  const responsible = employees?.find((row) => row.id === Number(employee));
  return (
    <dialog
      ref={dialog}
      aria-labelledby="receipt-review-title"
      className="receipt-dialog operational-panel rounded-xl border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) finish();
      }}
    >
      <h2
        ref={title}
        tabIndex={-1}
        id="receipt-review-title"
        className="text-2xl font-bold"
      >
        {receipt ? "Receipt recorded" : "Review pre-storage receipt"}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        Step 2 · Shipment #{entryData.id} → {hallData.name}
      </p>
      {receipt ? (
        <div className="operational-confirm mt-5 space-y-3" role="status">
          <p className="text-lg font-semibold text-emerald-500">
            {receipt.quantity} containers recorded
          </p>
          <p>
            Receipt #{receipt.id} ·{" "}
            {new Date(receipt.createdAt).toLocaleString()}
          </p>
          <p>Destination: {hallData.name}</p>
          <p className="text-sm text-base-content/65">
            The receipt and container statuses were saved together.
          </p>
        </div>
      ) : (
        <>
          <dl className="my-5 grid gap-4 rounded-lg bg-base-200 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-base-content/60">Transport</dt>
              <dd>
                {entryData.companyName} · {entryData.registrationPlates}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-base-content/60">Destination</dt>
              <dd>{hallData.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-base-content/60">Quantity</dt>
              <dd className="text-xl font-semibold">
                {entryData.totalQuantity} containers
              </dd>
            </div>
            <div>
              <dt className="text-sm text-base-content/60">Profiles</dt>
              <dd>
                {entryData.containerProfileIds.map((id) => `#${id}`).join(", ")}
              </dd>
            </div>
          </dl>
          {entryData.profiles?.map((profile) => (
            <div
              key={profile.id}
              className="mb-3 rounded-lg border border-base-content/15 p-3 text-sm"
            >
              <p className="font-semibold">
                {profile.wasteProfile.name} · {profile.quantity} containers
              </p>
              <p>Origin: {profile.locationOrigin?.name || "Not recorded"}</p>
              <p>
                Container type:{" "}
                {profile.wasteProfile.containerType?.name || "Not recorded"}
              </p>
            </div>
          ))}
          <p className="mb-4 text-sm text-base-content/65">
            Confirm the full selected quantity. If the quantity differs, cancel
            and return the profile for review.
          </p>
          {isLoading ? (
            <p role="status">Loading responsible employees…</p>
          ) : isError ? (
            <p role="alert">
              Unable to load employees.{" "}
              <button className="btn btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </p>
          ) : !employees?.length ? (
            <p>
              No responsible employees configured. Contact your administrator.
            </p>
          ) : phase === "edit" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPhase("review");
                setMessage("");
              }}
            >
              <label
                className="block text-sm font-medium"
                htmlFor="receipt-employee"
              >
                Responsible employee
              </label>
              <select
                autoFocus={false}
                id="receipt-employee"
                required
                className="select mt-2 w-full"
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">Select responsible employee</option>
                {employees.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.surname}
                  </option>
                ))}
              </select>
              <button
                className="operational-control btn mt-4 min-h-11 btn-primary"
                type="submit"
              >
                Review confirmation →
              </button>
            </form>
          ) : (
            <p className="font-medium">
              Responsible employee: {responsible?.name} {responsible?.surname}
            </p>
          )}
          <div className="mt-4" aria-live="polite" aria-atomic="true">
            {busy && <p>Saving receipt… Keep this window open.</p>}
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
              className="operational-control btn mt-4 min-h-11 w-full btn-primary"
              onClick={save}
            >
              Confirm receipt of {entryData.totalQuantity} containers
            </button>
          )}
          {phase === "unknown" && (
            <button className="btn mt-4 min-h-11 btn-primary" onClick={save}>
              Check save result
            </button>
          )}
          {phase === "error" && (
            <button className="btn mt-4 min-h-11 btn-outline" onClick={save}>
              Check or retry this receipt
            </button>
          )}
          {busy && (
            <button className="btn mt-4 min-h-11 w-full btn-primary" disabled>
              Saving…
            </button>
          )}
        </>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-base-content/10 pt-4">
        {(phase === "review" || phase === "error") && (
          <button
            className="btn min-h-11 btn-ghost"
            onClick={() => { frozenRequest.current = null; setPhase("edit"); setMessage(""); }}
          >
            Back to employee selection
          </button>
        )}
        <button
          className="btn min-h-11 btn-outline"
          disabled={busy}
          onClick={finish}
        >
          {receipt
            ? "Done — return to tasks"
            : phase === "unknown"
              ? "Close and review history later"
              : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
