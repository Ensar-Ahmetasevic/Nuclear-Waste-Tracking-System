"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PreStorageAvailability from "./pre-storage-availability";
import useFinalStorageEmployeeQuery from "../../../../../../../requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";
import { useT } from "../../../../../../shell/preferences";
import { useFormat } from "../../../../../../ui/format";
import { InlineLoader, SavingButton } from "../../../../../../loading/loaders";
export default function ModalSendRequestToPreStorageForm({
  isOpen,
  closeModal,
  roomData,
}) {
  return isOpen ? <RequestReview close={closeModal} room={roomData} /> : null;
}
function RequestReview({ close, room }) {
  const t = useT();
  const format = useFormat();
  const [destination] = useState(() => ({ id: room.id, name: room.name }));
  const [quantity, setQuantity] = useState("");
  const [employee, setEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const employees = useFinalStorageEmployeeQuery({ activeOnly: true });
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
    if (phase === "edit")
      (dialog.current?.querySelector("input") || heading.current)?.focus();
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
        setMessage(data.message || t("send.failed"));
        return;
      }
      if (!data.result?.id) throw Error("Missing result");
      setResult(data);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("send.unconfirmed"));
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
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="new-transfer-title"
        className="text-2xl font-semibold"
      >
        {result
          ? t("send.done")
          : phase === "edit"
            ? t("send.title")
            : t("send.review")}
      </h2>
      <p className="my-4">
        {t("area.FINAL_STORAGE")} ·{" "}
        {t("rec.destination", { name: destination.name })} · #{destination.id}
      </p>
      {!result && (
        <PreStorageAvailability
          containerType={room.containerType}
          requested={quantity}
        />
      )}
      {phase === "edit" ? (
        employees.isLoading ? (
          <InlineLoader />
        ) : employees.isError ? (
          <div role="alert">
            {t("meas.form.employeesError")}{" "}
            <button
              className="btn min-h-11"
              onClick={() => employees.refetch()}
            >
              {t("alert.retry")}
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={review}>
            <label className="block text-sm">
              {t("send.quantity")}
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
            <label className="block text-sm">
              {t("meas.responsible")}
              <select
                className="select mt-2 w-full"
                required
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">{t("meas.form.chooseEmployee")}</option>
                {employees.data?.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.surname}
                  </option>
                ))}
              </select>
            </label>
            {!employees.data?.length && <p>{t("meas.form.noEmployees")}</p>}
            <button
              className="btn min-h-11 btn-primary"
              disabled={!employees.data?.length}
              type="submit"
            >
              {t("send.reviewButton")}
            </button>
          </form>
        )
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 rounded-xl bg-base-200/70 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-base-content/70">
                {t("send.quantity")}
              </dt>
              <dd className="font-semibold">
                {t("ship.containers", { count: Number(quantity) })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-base-content/70">
                {t("meas.responsible")}
              </dt>
              <dd>{employeeName}</dd>
            </div>
          </dl>
          {result ? (
            <div className="operational-confirm" role="status">
              <p className="font-semibold text-success">
                {t("send.result", { id: result.transferId })}
              </p>
              <p>
                {t("meas.form.recorded", {
                  time: format.dateTime(result.result.createdAt),
                  actor: result.result.actorId,
                })}
              </p>
              <p className="mt-2">{t("send.waiting")}</p>
            </div>
          ) : (
            <>
              <p>{t("send.effect")}</p>
              {phase === "review" && (
                <div className="flex flex-wrap gap-3">
                  <button className="btn min-h-11 btn-primary" onClick={send}>
                    {t("send.confirm", { count: Number(quantity) })}
                  </button>
                  <button
                    className="btn min-h-11 btn-outline"
                    onClick={() => setPhase("edit")}
                  >
                    {t("users.review.back")}
                  </button>
                </div>
              )}
              {phase === "saving" && (
                <SavingButton />
              )}
              {phase === "error" && (
                <button
                  className="btn min-h-11 btn-outline"
                  onClick={() => setPhase("edit")}
                >
                  {t("users.review.back")}
                </button>
              )}
              {phase === "unknown" && (
                <button className="btn min-h-11 btn-primary" onClick={send}>
                  {t("send.check")}
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
            ? t("rec.doneButton")
            : phase === "conflict"
              ? t("prep.closeReload")
              : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
