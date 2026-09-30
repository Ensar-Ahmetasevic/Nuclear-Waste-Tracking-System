"use client";

import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useReviewDialog, {
  sendAttempt,
} from "@/components/shared/use-review-dialog";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import MessageText from "../../ui/message-text";
import CorrectionReport, { reportSections } from "./correction-report";
import { InlineLoader } from "../../loading/loaders";
import { ButtonSpinner } from "../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../ui/proofread";

const LIMIT = 4000;
const required = new Set(["incident", "cause"]);

// Administrator approves bringing recorded stock to the latest recorded count, with a report.
export default function CorrectionDialog({ hall, onClose }) {
  const t = useT();
  const format = useFormat();
  const [original] = useState(hall);
  const verification = original.lastVerification;
  const [report, setReport] = useState({
    incident: "",
    cause: "",
    actions: "",
    references: "",
  });
  const [errors, setErrors] = useState({});
  const proofread = useProofread();
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const payload = useRef(null),
    busy = useRef(false),
    fields = useRef({});
  const titleId = useId(),
    client = useQueryClient();
  const { dialog, heading, first, keepFocus } = useReviewDialog(phase);
  const recorded = original.figures.recordedQuantity;
  const delta = verification.countedQuantity - recorded;
  const trimmed = Object.fromEntries(
    Object.entries(report).map(([key, value]) => [key, value.trim()]),
  );

  async function review(event) {
    event.preventDefault();
    if (proofread.waiting) return;
    const found = {};
    for (const key of reportSections) {
      const label = t(`recon.report.${key}`);
      if (required.has(key) && trimmed[key].length < 3)
        found[key] = t("recon.error.reportRequired", { field: label });
      else if (trimmed[key].length > LIMIT)
        found[key] = t("def.error.length", { field: label, limit: LIMIT });
    }
    setErrors(found);
    const firstInvalid = reportSections.find((key) => found[key]);
    if (firstInvalid) {
      fields.current[firstInvalid]?.focus();
      return;
    }
    setReport(await proofread.confirm(trimmed));
    payload.current = null;
    setMessage("");
    setPhase("review");
  }
  function finish() {
    if (busy.current) return;
    if (result || ["conflict", "unknown"].includes(phase))
      client.invalidateQueries();
    onClose();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      verificationId: verification.id,
      expectedVersion: verification.correctionVersion,
      report: trimmed,
      actionKey: crypto.randomUUID(),
    };
    const outcome = await sendAttempt(
      "/api/storage-reconciliation/corrections",
      payload.current,
      "correction",
    );
    busy.current = false;
    setPhase(outcome.phase);
    setResult(outcome.result || null);
    setMessage(
      outcome.phase === "unknown"
        ? t("recon.correct.unconfirmed")
        : outcome.message || "",
    );
  }
  const rows = [
    [t("recon.recordedNow"), t("ship.containers", { count: recorded })],
    [
      t("recon.countedShort"),
      t("recon.countedDetail", {
        count: verification.countedQuantity,
        id: verification.id,
        time: format.dateTime(verification.createdAt),
        actor: verification.actorId,
      }),
    ],
    [t("recon.basis"), <MessageText key="basis" text={verification.reason} />],
    [
      t("recon.change"),
      t("recon.changeDetail", {
        delta: `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`,
        count: verification.countedQuantity,
      }),
    ],
  ];
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold"
      >
        {result
          ? t("recon.correct.done")
          : phase === "edit"
            ? t("recon.correct.title")
            : t("recon.correct.review")}
      </h2>
      <p className="my-3 [overflow-wrap:anywhere]">
        {original.name} · #{original.id}
      </p>
      <dl className="space-y-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
          >
            <dt className="font-semibold">{label}</dt>
            <dd className="whitespace-pre-line">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="my-4 rounded-xl border border-warning p-3">
        {t("recon.correct.effect", { count: verification.countedQuantity })}
      </p>
      {phase === "edit" ? (
        <form noValidate className="space-y-4" onSubmit={review}>
          {Object.keys(errors).length > 0 && (
            <p role="alert">{t("recon.error.report")}</p>
          )}
          {reportSections.map((key, index) => {
            const hintId = `${titleId}-${key}-hint`,
              errorId = `${titleId}-${key}-error`;
            return (
              <div key={key}>
                <label className="block text-sm">
                  {t(`recon.report.${key}`)}
                  {required.has(key) ? "" : ` (${t("recon.optional")})`}
                  <textarea
                    ref={(node) => {
                      fields.current[key] = node;
                      if (index === 0) first.current = node;
                    }}
                    required={required.has(key)}
                    maxLength={LIMIT}
                    rows={required.has(key) ? 4 : 2}
                    className="textarea mt-1 w-full"
                    value={report[key]}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={`${hintId}${errors[key] ? ` ${errorId}` : ""}`}
                    onChange={(event) => {
                      const value = event.target.value;
                      setReport((current) => ({ ...current, [key]: value }));
                    }}
                  />
                </label>
                <p id={hintId} className="mt-1 text-sm text-base-content/70">
                  {t(`recon.hint.${key}`)}
                </p>
                {errors[key] && (
                  <p id={errorId} className="mt-1 text-sm text-error">
                    {errors[key]}
                  </p>
                )}
              </div>
            );
          })}
          <ProofreadPrompt
            proofread={proofread}
            labels={Object.fromEntries(reportSections.map((key) => [key, t(`recon.report.${key}`)]))}
          />
          <button type="submit" className="btn min-h-11 btn-primary" disabled={proofread.waiting}>
            {proofread.checking && <ButtonSpinner />}
            {t("recon.correct.reviewButton")}
          </button>
        </form>
      ) : (
        <>
          <h3 className="mt-4 text-lg font-semibold">
            {t("recon.reportTitle")}
          </h3>
          <CorrectionReport report={trimmed} />
          {phase === "review" && (
            <button
              type="button"
              className="btn mt-4 min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.correct.confirm", {
                count: verification.countedQuantity,
              })}
            </button>
          )}
          {phase === "saving" && <InlineLoader save />}
          {message && (
            <p role="alert" className="my-3">
              {message}
            </p>
          )}
          {result && (
            <p role="status" className="operational-confirm my-4 text-success">
              {t("recon.correct.result", {
                id: result.id,
                delta: `${result.delta > 0 ? "+" : ""}${result.delta}`,
                time: format.dateTime(result.createdAt),
                actor: result.actorId,
              })}
            </p>
          )}
          {phase === "unknown" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.correct.check")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {["review", "error"].includes(phase) && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("edit");
            }}
          >
            {t("recon.backToReport")}
          </button>
        )}
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("recon.closeReload")
              : phase === "unknown"
                ? t("recon.correct.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
