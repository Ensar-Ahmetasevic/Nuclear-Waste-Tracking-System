"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import { useT } from "../../../../../shell/preferences";
import { useFormat } from "../../../../../ui/format";
import { InlineLoader } from "../../../../../loading/loaders";
import { ButtonSpinner } from "../../../../../loading/spinner";
import EarlierReturns from "../earlier-returns";
import IncomingDelivery from "../incoming-delivery";

export default function ModalPreStorageCapacityForm({ isOpen, ...props }) {
  return isOpen ? <ReceiptReview {...props} /> : null;
}
function ReceiptReview({ closeModal, hallData, entryData }) {
  const t = useT();
  const format = useFormat();
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
  } = usePreStorageEmployeeQuery({ activeOnly: true });
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
        setMessage(data.message || t("rec.failed"));
        return;
      }
      if (!data.receipt?.id) throw new Error("Missing receipt reference");
      setReceipt(data.receipt);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("rec.unconfirmed"));
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
      className="receipt-dialog operational-panel rounded-box border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) finish();
      }}
    >
      <h2
        ref={title}
        tabIndex={-1}
        id="receipt-review-title"
        className="text-2xl font-semibold"
      >
        {receipt ? t("rec.done") : t("rec.title")}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        {t("area.PRE_STORAGE")} · {t("ship.number", { id: entryData.id })} →{" "}
        {hallData.name}
      </p>
      {receipt ? (
        <div className="operational-confirm mt-5 space-y-3" role="status">
          <p className="text-lg font-semibold text-success">
            {t("rec.recorded", { count: receipt.quantity })}
          </p>
          <p>
            {t("rec.receipt", {
              id: receipt.id,
              time: format.dateTime(receipt.createdAt),
            })}
          </p>
          <p>{t("rec.destination", { name: hallData.name })}</p>
          <p className="text-sm text-base-content/65">
            {t("rec.savedTogether")}
          </p>
        </div>
      ) : (
        <>
          <IncomingDelivery entryData={entryData} />
          <EarlierReturns profiles={entryData.profiles} />
          <p className="mb-4 text-sm text-base-content/65">
            {t("rec.fullQuantity")}
          </p>
          {isLoading ? (
            <InlineLoader />
          ) : isError ? (
            <p role="alert">
              {t("meas.form.employeesError")}{" "}
              <button className="btn min-h-11 btn-sm" onClick={() => refetch()}>
                {t("alert.retry")}
              </button>
            </p>
          ) : !employees?.length ? (
            <p>{t("meas.form.noEmployees")}</p>
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
                {t("meas.responsible")}
              </label>
              <select
                autoFocus={false}
                id="receipt-employee"
                required
                className="select mt-2 w-full"
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">{t("meas.form.chooseEmployee")}</option>
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
                {t("rec.reviewButton")}
              </button>
            </form>
          ) : (
            <p className="font-medium">
              {t("meas.responsible")}: {responsible?.name}{" "}
              {responsible?.surname}
            </p>
          )}
          <div className="mt-4" aria-live="polite" aria-atomic="true">
            {busy && <InlineLoader save label={t("rec.saving")} />}
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
              className="operational-control btn mt-4 min-h-11 w-full btn-success"
              onClick={save}
            >
              {t("rec.confirm", { count: entryData.totalQuantity })}
            </button>
          )}
          {phase === "unknown" && (
            <button className="btn mt-4 min-h-11 btn-primary" onClick={save}>
              {t("users.change.check")}
            </button>
          )}
          {phase === "error" && (
            <button className="btn mt-4 min-h-11 btn-outline" onClick={save}>
              {t("rec.retry")}
            </button>
          )}
          {busy && (
            <button className="btn mt-4 min-h-11 w-full btn-primary" disabled>
              <ButtonSpinner />
              {t("common.saving")}
            </button>
          )}
        </>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-base-content/10 pt-4">
        {(phase === "review" || phase === "error") && (
          <button
            className="btn min-h-11 btn-ghost"
            onClick={() => {
              frozenRequest.current = null;
              setPhase("edit");
              setMessage("");
            }}
          >
            {t("rec.backToEmployee")}
          </button>
        )}
        <button
          className="btn min-h-11 btn-outline"
          disabled={busy}
          onClick={finish}
        >
          {receipt
            ? t("rec.doneButton")
            : phase === "unknown"
              ? t("rec.closeLater")
              : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
