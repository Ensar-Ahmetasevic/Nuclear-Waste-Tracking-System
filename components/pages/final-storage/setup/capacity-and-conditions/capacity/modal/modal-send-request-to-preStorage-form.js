"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useFinalStorageEmployeeQuery from "../../../../../../../requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";
export default function ModalSendRequestToPreStorageForm({
  isOpen,
  closeModal,
  roomData,
}) {
  return isOpen ? <RequestReview close={closeModal} room={roomData} /> : null;
}
function RequestReview({ close, room }) {
  const [destination] = useState(() => ({ id: room.id, name: room.name }));
  const [quantity, setQuantity] = useState("");
  const [employee, setEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const employees = useFinalStorageEmployeeQuery();
  const client = useQueryClient();
  const dialog = useRef(null),
    heading = useRef(null),
    payload = useRef(null),
    busy = useRef(false);
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
    if (phase === "edit") (dialog.current?.querySelector("input") || heading.current)?.focus();
    else heading.current?.focus();
  }, [phase]);
  async function finish() {
    if (busy.current) return;
    close();
    if (result || phase === "unknown" || phase === "conflict")
      await client.invalidateQueries();
  }
  function review(event) {
    event.preventDefault();
    const selected = employees.data?.find((row) => row.id === Number(employee));
    if (!selected) return;
    payload.current = null;
    setEmployeeName(`${selected.name} ${selected.surname}`);
    setMessage("");
    setPhase("review");
    heading.current?.focus();
  }
  async function send() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      requestedQuantity: Number(quantity),
      requestedByRoom: destination.name,
      requestedByEmployeeId: Number(employee),
      finalStorageLocationId: destination.id,
      actionKey: crypto.randomUUID(),
    };
    try {
      const response = await fetch(
        "/api/final-storage-setup/final-storage-transver-request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.current),
          signal: AbortSignal.timeout(20000),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || "Unable to send request.");
        return;
      }
      if (!data.result?.id) throw Error("Missing result");
      setResult(data);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(
        "Sending could not be confirmed. Check the same request before creating another one.",
      );
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="new-transfer-title"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="new-transfer-title"
        className="text-2xl font-bold"
      >
        {result
          ? "Transfer request saved"
          : phase === "edit"
            ? "Prepare transfer request"
            : "Review transfer request"}
      </h2>
      <p className="my-4">
        Step 3 · Destination: {destination.name} · Room #{destination.id}
      </p>
      {phase === "edit" ? (
        employees.isLoading ? (
          <p role="status">Loading responsible employees…</p>
        ) : employees.isError ? (
          <div role="alert">
            Unable to load employees.{" "}
            <button className="btn" onClick={() => employees.refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={review}>
            <label className="block">
              Requested quantity
              <input
                className="input mt-2 w-full"
                required
                type="number"
                step="1"
                min="1"
                max="2147483647"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <label className="block">
              Responsible employee
              <select
                className="select mt-2 w-full"
                required
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">Select an employee</option>
                {employees.data?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.surname}
                  </option>
                ))}
              </select>
            </label>
            {!employees.data?.length && (
              <p>
                No responsible employees configured. Contact your administrator.
              </p>
            )}
            <button
              className="btn min-h-11 btn-primary"
              disabled={!employees.data?.length}
              type="submit"
            >
              Review request
            </button>
          </form>
        )
      ) : (
        <div className="space-y-4">
          <dl className="rounded-lg bg-base-200 p-4">
            <dt>Requested quantity</dt>
            <dd className="font-semibold">{quantity} containers</dd>
            <dt className="mt-3">Responsible employee</dt>
            <dd>{employeeName}</dd>
          </dl>
          {result ? (
            <div className="operational-confirm" role="status">
              <p className="font-semibold text-success">
                Transfer #{result.transferId} saved
              </p>
              <p>
                {new Date(result.result.createdAt).toLocaleString()} · User #
                {result.result.actorId}
              </p>
              <p className="mt-2">
                Waiting for pre-storage approval. Receipt has not been
                confirmed.
              </p>
            </div>
          ) : (
            <>
              <p>
                This sends a request to pre-storage for review. It does not
                confirm transport or receipt.
              </p>
              {phase === "review" && (
                <div className="flex flex-wrap gap-3">
                  <button className="btn min-h-11 btn-primary" onClick={send}>
                    Send request for {quantity} containers
                  </button>
                  <button
                    className="btn min-h-11 btn-outline"
                    onClick={() => setPhase("edit")}
                  >
                    Back to edit
                  </button>
                </div>
              )}
              {phase === "saving" && (
                <button className="btn min-h-11" disabled>
                  Sending…
                </button>
              )}
              {phase === "error" && <button className="btn min-h-11 btn-outline" onClick={() => setPhase("edit")}>Back to edit</button>}
              {phase === "unknown" && (
                <button className="btn min-h-11 btn-primary" onClick={send}>
                  Check request result
                </button>
              )}
            </>
          )}
        </div>
      )}
      <p className="my-4 text-sm" aria-live="polite">
        {message}
      </p>
      <div className="mt-5 flex justify-end border-t border-base-content/15 pt-4">
        <button
          disabled={phase === "saving"}
          className="btn min-h-11 btn-outline"
          onClick={finish}
        >
          {result
            ? "Done — return to tasks"
            : phase === "conflict"
              ? "Close and reload destination"
              : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
