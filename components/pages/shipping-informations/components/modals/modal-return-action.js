"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useWasteProfileQuery from "@/requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useLocationOriginQuery from "@/requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { InlineLoader } from "../../../../loading/loaders";
import { ButtonSpinner } from "../../../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../../../ui/proofread";
import ReturnReport from "../../container-data/return-report";

// Step 1 handles a Pre-storage return: RESEND corrects quantity, location origin
// or waste profile and sends the profiles back to Step 2; ESCALATE hands the
// return to Supervision.
export default function ModalReturnAction(props) {
  return props.mode === "RESEND" ? <ResendAction {...props} /> : <ReturnAction {...props} />;
}

// Definitions are loaded only for a resend.
function ResendAction(props) {
  const origins = useLocationOriginQuery();
  const wastes = useWasteProfileQuery();
  return <ReturnAction {...props} origins={origins} wastes={wastes} />;
}

function ReturnAction({ mode, report, profiles, closeModal, origins, wastes }) {
  const t = useT();
  const format = useFormat();
  const client = useQueryClient();
  const dialog = useRef(null);
  const title = useRef(null);
  const frozen = useRef(null);
  const inFlight = useRef(false);
  const returned = profiles.filter(
    (profile) => profile.containerStatus === "rejected" && profile.lastReturn?.id === report.id,
  );
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      returned.map((profile) => [
        profile.id,
        { quantity: String(profile.quantity), locationOriginId: String(profile.locationOriginId), wasteProfileId: String(profile.wasteProfileId) },
      ]),
    ),
  );
  const change = (id, key) => (event) =>
    setForm((current) => ({ ...current, [id]: { ...current[id], [key]: event.target.value } }));
  // The current definition may be archived and can be kept; other archived ones are not offered.
  const options = (query, profile, key) =>
    query?.data?.filter((row) => !row.archivedAt || row.id === profile[key]) || [];
  const nameOf = (query, id) => query?.data?.find((row) => row.id === Number(id))?.name ?? `#${id}`;
  const [note, setNote] = useState("");
  const proofread = useProofread();
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
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
  const resend = mode === "RESEND";
  const counted = (id) => report.profiles.find((row) => row.containerProfileId === id)?.countedQuantity;
  const invalid = () => {
    if (note.trim().length < 3) return t(resend ? "retAct.noteRequired.RESEND" : "retAct.noteRequired.ESCALATE");
    if (resend && returned.some((profile) => !/^\d+$/.test(form[profile.id].quantity) || Number(form[profile.id].quantity) < 1 || !form[profile.id].locationOriginId || !form[profile.id].wasteProfileId))
      return t("retAct.invalid");
    return null;
  };

  async function finish() {
    if (inFlight.current) return;
    closeModal();
    if (result || phase === "unknown") await client.invalidateQueries();
  }
  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPhase("saving");
    setMessage("");
    frozen.current ??= {
      actionKey: crypto.randomUUID(),
      rejectionId: report.id,
      action: mode,
      expectedState: report.state,
      note: note.trim(),
      profiles: resend
        ? returned.map((profile) => ({
            id: profile.id,
            quantity: Number(form[profile.id].quantity),
            locationOriginId: Number(form[profile.id].locationOriginId),
            wasteProfileId: Number(form[profile.id].wasteProfileId),
          }))
        : [],
    };
    try {
      const response = await fetch("/api/shipping-informations/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frozen.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw new Error("Unconfirmed response");
        setPhase("error");
        setMessage(data.message || t("retAct.failed"));
        return;
      }
      setResult(data.returnAction);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("retAct.unconfirmed"));
    } finally {
      inFlight.current = false;
    }
  }
  const busy = phase === "saving";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="return-action-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/15 bg-base-100 p-5 text-base-content shadow-xl sm:p-7"
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) finish();
      }}
    >
      <h2 ref={title} tabIndex={-1} id="return-action-title" className="text-2xl font-semibold">
        {result ? t(`retAct.done.${mode}`) : t(`retAct.title.${mode}`)}
      </h2>
      <p className="mt-2 text-sm text-base-content/65">
        {t("ship.number", { id: report.shipmentId })} · {t("return.titleNumber", { id: report.id })}
      </p>
      {result ? (
        <div className="operational-confirm mt-5 space-y-3" role="status">
          <p className={`text-lg font-semibold ${resend ? "text-success" : "text-warning"}`}>{t(`retAct.after.${mode}`)}</p>
          <p className="text-sm text-base-content/70">{format.dateTime(result.createdAt)}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm">{t(`retAct.intro.${mode}`)}</p>
          <div className="my-4">
            <ReturnReport report={report} />
          </div>
          {phase === "edit" ? (
            <form
              className="space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (proofread.waiting) return;
                const problem = invalid();
                setMessage(problem || "");
                if (problem) return;
                setNote(await proofread.confirm(note));
                setPhase("review");
              }}
            >
              {resend &&
                returned.map((profile) => (
                  <fieldset key={profile.id} className="space-y-3 rounded-xl border border-base-content/15 p-3">
                    <legend className="px-1 text-sm font-semibold">{t("retAct.profile", { id: profile.id })}</legend>
                    <label className="block text-sm">
                      {t("field.quantity")}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        required
                        className="input mt-1 block w-full sm:w-48"
                        value={form[profile.id].quantity}
                        onChange={change(profile.id, "quantity")}
                      />
                      <span className="mt-1 block text-base-content/65">
                        {counted(profile.id) != null
                          ? t("retAct.quantityHint.counted", { recorded: profile.quantity, counted: counted(profile.id) })
                          : t("retAct.quantityHint", { recorded: profile.quantity })}
                      </span>
                    </label>
                    <label className="block text-sm">
                      {t("field.locationOrigin")}
                      <select required className="select mt-1 w-full" value={form[profile.id].locationOriginId} onChange={change(profile.id, "locationOriginId")}>
                        <option value="">{t("prep.chooseOrigin")}</option>
                        {options(origins, profile, "locationOriginId").map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                            {row.archivedAt ? ` (${t("def.archivedTag")})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      {t("field.wasteProfile")}
                      <select required className="select mt-1 w-full" value={form[profile.id].wasteProfileId} onChange={change(profile.id, "wasteProfileId")}>
                        <option value="">{t("prep.chooseWaste")}</option>
                        {options(wastes, profile, "wasteProfileId").map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                            {row.archivedAt ? ` (${t("def.archivedTag")})` : ""}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-base-content/65">{t("retAct.routingHint")}</span>
                    </label>
                  </fieldset>
                ))}
              {resend && (origins.isPending || wastes.isPending) && <InlineLoader />}
              {resend && (origins.isError || wastes.isError) && (
                <p role="alert">
                  {t("prep.optionsError")}{" "}
                  <button type="button" className="btn min-h-11" onClick={() => { origins.refetch(); wastes.refetch(); }}>
                    {t("alert.retry")}
                  </button>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium" htmlFor="return-action-note">{t(`retAct.note.${mode}`)}</label>
                <textarea
                  id="return-action-note"
                  rows={3}
                  maxLength={1000}
                  required
                  className="textarea mt-2 w-full"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="mt-1 text-sm text-base-content/65">{t(`retAct.noteHint.${mode}`)}</p>
              </div>
              <ProofreadPrompt proofread={proofread} />
              <button className="operational-control btn min-h-11 btn-primary" type="submit" disabled={proofread.waiting}>
                {proofread.checking && <ButtonSpinner />}
                {t("retAct.review")}
              </button>
            </form>
          ) : (
            <div className="space-y-2 rounded-xl border border-base-content/15 bg-base-200/60 p-4 text-sm">
              {resend &&
                returned.map((profile) => {
                  const next = form[profile.id];
                  const rows = [
                    ["quantity", format.number(profile.quantity), format.number(Number(next.quantity))],
                    ["locationOrigin", profile.locationOrigin?.name ?? nameOf(origins, profile.locationOriginId), nameOf(origins, next.locationOriginId)],
                    ["wasteProfile", profile.wasteProfile?.name ?? nameOf(wastes, profile.wasteProfileId), nameOf(wastes, next.wasteProfileId)],
                  ].filter(([, before, after]) => before !== after);
                  return rows.length ? (
                    rows.map(([key, before, after]) => (
                      <p key={`${profile.id}-${key}`}>
                        {t("retAct.summary.change", { id: profile.id, field: t(`field.${key}`), before, after })}
                      </p>
                    ))
                  ) : (
                    <p key={profile.id}>{t("retAct.summary.unchanged", { id: profile.id })}</p>
                  );
                })}
              <p className="break-words"><span className="font-medium">{t(`retAct.note.${mode}`)}:</span> {note.trim()}</p>
            </div>
          )}
          <div className="mt-4" aria-live="polite" aria-atomic="true">
            {busy && <InlineLoader save label={t("common.saving")} />}
            {message && <p className={phase === "unknown" ? "text-warning" : "text-error"}>{message}</p>}
          </div>
          {phase === "review" && (
            <button className={`operational-control btn mt-4 min-h-11 w-full ${resend ? "btn-primary" : "btn-warning"}`} onClick={save}>
              {t(`retAct.confirm.${mode}`)}
            </button>
          )}
          {phase === "unknown" && <button className="btn mt-4 min-h-11 btn-primary" onClick={save}>{t("ret.check")}</button>}
          {phase === "error" && <button className="btn mt-4 min-h-11 btn-outline" onClick={save}>{t("ret.retry")}</button>}
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
              frozen.current = null;
              setPhase("edit");
              setMessage("");
            }}
          >
            {t("retAct.back")}
          </button>
        )}
        <button className="btn min-h-11 btn-outline" disabled={busy} onClick={finish}>
          {result ? t("ret.close") : phase === "unknown" ? t("rec.closeLater") : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
