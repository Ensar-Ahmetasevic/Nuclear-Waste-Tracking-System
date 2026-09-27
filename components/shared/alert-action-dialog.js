"use client";

import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import useReviewDialog, { sendAttempt } from "./use-review-dialog";
import { InlineLoader } from "../loading/loaders";

// Acknowledge, note or close one alert against the version that was reviewed.
export default function AlertActionDialog({ area, alert, action, onClose }) {
  const t = useT();
  const format = useFormat();
  const [original] = useState(alert);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const payload = useRef(null),
    busy = useRef(false);
  const titleId = useId(),
    client = useQueryClient();
  const { dialog, heading, first, keepFocus } = useReviewDialog(
    phase,
    "edit",
    "alerts-heading",
  );
  const [title, confirm, consequence] = ["title", "confirm", "consequence"].map(
    (part) => t(`alertAction.${action}.${part}`),
  );
  const required = action !== "ACKNOWLEDGE";
  const valid =
    note.trim().length <= 1000 && (!required || note.trim().length >= 3);

  function finish() {
    if (busy.current) return;
    if (result || ["conflict", "unknown"].includes(phase))
      client.invalidateQueries();
    onClose();
  }
  async function save(event) {
    event?.preventDefault();
    if (busy.current || !valid) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      alertId: original.id,
      action,
      note: note.trim(),
      expectedVersion: original.version,
      actionKey: crypto.randomUUID(),
    };
    const outcome = await sendAttempt(
      `/api/${area}-setup/monitoring`,
      payload.current,
      "event",
    );
    busy.current = false;
    setPhase(outcome.phase);
    setResult(outcome.result || null);
    setMessage(
      outcome.phase === "unknown"
        ? t("alertAction.unconfirmed")
        : outcome.message || "",
    );
  }
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
        {result ? t("alertAction.recorded", { action: confirm }) : title}
      </h2>
      <p className="my-3 [overflow-wrap:anywhere]">
        {t("alert.number", { id: original.id })} ·{" "}
        {t(original.severity === "CRITICAL" ? "cell.critical" : "cell.warning")}{" "}
        · {t(`alert.kind.${original.kind}`)} ·{" "}
        {original.parameter ? t(`param.${original.parameter}`) : original.label}{" "}
        · {original.locationName}
      </p>
      <p className="my-3">{consequence}</p>
      {phase === "edit" ? (
        <form className="space-y-4" onSubmit={save}>
          <label className="block text-sm">
            {t(`alertAction.${action}.label`)}
            <textarea
              ref={first}
              required={required}
              minLength={required ? 3 : undefined}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {required && (
            <p className="text-sm text-base-content/70">
              {t("alertAction.hint")}
            </p>
          )}
          <button
            type="submit"
            className="btn min-h-11 btn-primary"
            disabled={!valid}
          >
            {confirm}
          </button>
        </form>
      ) : (
        <>
          {note.trim() && (
            <p className="my-3 [overflow-wrap:anywhere]">
              {t("def.note", { reason: note.trim() })}
            </p>
          )}
          {phase === "saving" && <InlineLoader save />}
          {message && (
            <p role="alert" className="my-3">
              {message}
            </p>
          )}
          {result && (
            <p role="status" className="operational-confirm my-4 text-success">
              {t("alertAction.result", {
                id: result.id,
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
              {t("alertAction.check")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {phase === "error" && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("edit");
            }}
          >
            {t("users.review.back")}
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
              ? t("alertAction.closeReload")
              : phase === "unknown"
                ? t("alertAction.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
