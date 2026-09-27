"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import { REJECTION_REASONS, rejectionProblem } from "../../../../../../lib/receipt-rejections";
import { useT } from "../../../../../shell/preferences";
import { useFormat } from "../../../../../ui/format";
import { InlineLoader } from "../../../../../loading/loaders";
import { ButtonSpinner } from "../../../../../loading/spinner";
import EarlierReturns from "../earlier-returns";
import IncomingDelivery from "../incoming-delivery";

export default function ModalReturnDelivery({ isOpen, ...props }) {
  return isOpen ? <ReturnReview {...props} /> : null;
}

// Pre-storage returns the incoming profiles of this hall to Step 1 with an
// inspection report: reasons, counted quantity for a mismatch, and a note.
function ReturnReview({ closeModal, hallData, entryData }) {
  const t = useT();
  const format = useFormat();
  const dialog = useRef(null);
  const title = useRef(null);
  const frozenRequest = useRef(null);
  const inFlight = useRef(false);
  const client = useQueryClient();
  const profiles = entryData.profiles || [];
  const [employee, setEmployee] = useState("");
  const [reasons, setReasons] = useState([]);
  const [counted, setCounted] = useState({});
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [rejection, setRejection] = useState(null);
  const { data: employees, isLoading, isError, refetch } =
    usePreStorageEmployeeQuery({ activeOnly: true });
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

  const mismatch = reasons.includes("QUANTITY_MISMATCH");
  const report = () => ({
    shipmentId: entryData.id,
    locationId: hallData.id,
    responsibleEmployeeId: Number(employee),
    reasons: REJECTION_REASONS.filter((code) => reasons.includes(code)),
    note: note.trim(),
    profiles: profiles.map((profile) => ({
      id: profile.id,
      quantity: profile.quantity,
      ...(mismatch && { countedQuantity: counted[profile.id] === "" || counted[profile.id] == null ? NaN : Number(counted[profile.id]) }),
    })),
  });
  const responsible = employees?.find((row) => row.id === Number(employee));
  const toggle = (code) =>
    setReasons((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  async function finish() {
    if (inFlight.current) return;
    closeModal();
    if (rejection || phase === "unknown") {
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
    if (!frozenRequest.current) frozenRequest.current = { ...report(), actionKey: crypto.randomUUID() };
    try {
      const response = await fetch("/api/pre-storage-setup/rejections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frozenRequest.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw new Error("Unconfirmed response");
        setPhase("error");
        setMessage(data.message || t("ret.failed"));
        return;
      }
      if (!data.rejection?.id) throw new Error("Missing return reference");
      setRejection(data.rejection);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("ret.unconfirmed"));
    } finally {
      inFlight.current = false;
    }
  }
  const busy = phase === "saving";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="return-review-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) finish();
      }}
    >
      <h2 ref={title} tabIndex={-1} id="return-review-title" className="text-2xl font-semibold">
        {rejection ? t("ret.done") : t("ret.title")}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        {t("area.PRE_STORAGE")} · {t("ship.number", { id: entryData.id })} · {hallData.name}
      </p>
      {rejection ? (
        <div className="operational-confirm mt-5 space-y-3" role="status">
          <p className="text-lg font-semibold text-error">
            {t("ret.returned", { count: entryData.totalQuantity })}
          </p>
          <p>{t("ret.recorded", { id: rejection.id, time: format.dateTime(rejection.createdAt) })}</p>
          <p className="text-sm text-base-content/65">{t("ret.after")}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm">{t("ret.intro")}</p>
          <IncomingDelivery entryData={entryData} />
          <EarlierReturns profiles={entryData.profiles} />
          {isLoading ? (
            <InlineLoader />
          ) : isError ? (
            <p role="alert">
              {t("meas.form.employeesError")}{" "}
              <button className="btn min-h-11 btn-sm" onClick={() => refetch()}>{t("alert.retry")}</button>
            </p>
          ) : !employees?.length ? (
            <p>{t("meas.form.noEmployees")}</p>
          ) : phase === "edit" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const problem = rejectionProblem(report());
                setMessage(problem ? t(`ret.problem.${problem}`) : "");
                if (!problem) setPhase("review");
              }}
            >
              <div>
                <label className="block text-sm font-medium" htmlFor="return-employee">{t("meas.responsible")}</label>
                <select id="return-employee" required className="select mt-2 w-full" value={employee} onChange={(event) => setEmployee(event.target.value)}>
                  <option value="">{t("meas.form.chooseEmployee")}</option>
                  {employees.map((row) => (
                    <option key={row.id} value={row.id}>{row.name} {row.surname}</option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="text-sm font-medium">{t("ret.reasons")}</legend>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {REJECTION_REASONS.map((code) => (
                    <label key={code} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-base-200/70">
                      <input type="checkbox" className="checkbox checkbox-sm" checked={reasons.includes(code)} onChange={() => toggle(code)} />
                      <span className="text-sm">{t(`return.reason.${code}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {mismatch && profiles.map((profile) => (
                <div key={profile.id}>
                  <label className="block text-sm font-medium" htmlFor={`return-counted-${profile.id}`}>{t("ret.counted", { id: profile.id })}</label>
                  <input
                    id={`return-counted-${profile.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    required
                    className="input mt-2 w-full sm:w-48"
                    value={counted[profile.id] ?? ""}
                    onChange={(event) => setCounted((current) => ({ ...current, [profile.id]: event.target.value }))}
                  />
                  <p className="mt-1 text-sm text-base-content/65">{t("ret.countedHint", { count: profile.quantity })}</p>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium" htmlFor="return-note">{t("ret.note")}</label>
                <textarea id="return-note" rows={3} maxLength={1000} className="textarea mt-2 w-full" value={note} onChange={(event) => setNote(event.target.value)} />
                <p className="mt-1 text-sm text-base-content/65">{t("ret.noteHint")}</p>
              </div>
              <button className="operational-control btn min-h-11 btn-primary" type="submit">{t("ret.review")}</button>
            </form>
          ) : (
            <div className="space-y-2 rounded-xl border border-error/40 bg-error/5 p-4 text-sm">
              <p><span className="font-medium">{t("meas.responsible")}:</span> {responsible?.name} {responsible?.surname}</p>
              <p className="font-medium">{t("return.reasons")}:</p>
              <ul className="list-disc pl-5">
                {report().reasons.map((code) => <li key={code}>{t(`return.reason.${code}`)}</li>)}
              </ul>
              {mismatch && profiles.map((profile) => (
                <p key={profile.id}>
                  {t("ship.profile", { id: profile.id })}: {t("return.counted", { counted: counted[profile.id], expected: profile.quantity })}
                </p>
              ))}
              {note.trim() && <p className="break-words"><span className="font-medium">{t("ret.note")}:</span> {note.trim()}</p>}
            </div>
          )}
          <div className="mt-4" aria-live="polite" aria-atomic="true">
            {busy && <InlineLoader save label={t("common.saving")} />}
            {message && <p className={phase === "unknown" ? "text-warning" : "text-error"}>{message}</p>}
          </div>
          {phase === "review" && (
            <button className="operational-control btn mt-4 min-h-11 w-full btn-error" onClick={save}>
              {t("ret.confirm", { count: entryData.totalQuantity })}
            </button>
          )}
          {phase === "unknown" && <button className="btn mt-4 min-h-11 btn-primary" onClick={save}>{t("ret.check")}</button>}
          {phase === "error" && <button className="btn mt-4 min-h-11 btn-outline" onClick={save}>{t("ret.retry")}</button>}
          {busy && (
            <button className="btn mt-4 min-h-11 w-full btn-error" disabled>
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
            {t("ret.back")}
          </button>
        )}
        <button className="btn min-h-11 btn-outline" disabled={busy} onClick={finish}>
          {rejection ? t("ret.close") : phase === "unknown" ? t("rec.closeLater") : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
