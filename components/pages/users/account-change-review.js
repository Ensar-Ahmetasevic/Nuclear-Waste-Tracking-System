"use client";
import { useEffect, useRef, useState } from "react";
import { areas } from "@/lib/workspaces.cjs";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { InlineLoader } from "../../loading/loaders";
import { ButtonSpinner } from "../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../ui/proofread";

const KEYS = ["displayName", "username", "email", "role", "workArea", "active"];

export default function AccountChangeReview({
  original,
  proposed,
  close,
  saved,
}) {
  const t = useT();
  const format = useFormat();
  const [reason, setReason] = useState(""),
    [phase, setPhase] = useState("review"),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null);
  const proofread = useProofread();
  const dialog = useRef(null),
    heading = useRef(null),
    payload = useRef(null),
    busy = useRef(false);
  const after = {
    ...proposed,
    active: proposed.enabled,
    workArea: proposed.role === "EMPLOYEE" ? proposed.workArea : null,
  };
  const keys = KEYS.filter((key) => original[key] !== after[key]);
  const newSession =
    !after.active ||
    original.role !== after.role ||
    original.workArea !== after.workArea;
  const display = (key, value) =>
    key === "active"
      ? value
        ? t("users.active")
        : t("users.inactive")
      : key === "workArea"
        ? areas[value]
          ? t(`area.${value}`)
          : t("users.allAreasOrNone")
        : key === "role"
          ? t(`role.${value}`)
          : value || t("ship.notRecorded");
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
  function finish() {
    if (!busy.current) {
      if (result || phase === "unknown" || phase === "conflict") saved();
      else close();
    }
  }
  async function save(event) {
    event?.preventDefault();
    if (busy.current) return;
    // A retry resends the saved request unchanged; only the first send is checked.
    let written = reason.trim();
    if (!payload.current) {
      if (proofread.waiting) return;
      written = (await proofread.confirm(written)).trim();
      setReason(written);
    }
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      ...proposed,
      id: original.id,
      expected: Object.fromEntries(
        KEYS.map((key) => [key === "active" ? "enabled" : key, original[key]]),
      ),
      reason: written,
      actionKey: crypto.randomUUID(),
    };
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("users.change.failed"));
        return;
      }
      if (!data.change?.id) throw Error();
      setResult(data.change);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("users.change.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="account-review-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="account-review-title"
        className="text-2xl font-semibold"
      >
        {result ? t("users.change.saved") : t("users.reviewChanges")}
      </h2>
      <p className="my-3 text-base-content/75">
        {t("users.accountNumber", { id: original.id })} ·{" "}
        {original.username || original.email}
      </p>
      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key} className="rounded-xl bg-base-200/70 p-3 break-words">
            <p className="font-semibold">{t(`users.field.${key}`)}</p>
            <p>{t("ship.before", { value: display(key, original[key]) })}</p>
            <p>{t("ship.after", { value: display(key, after[key]) })}</p>
          </div>
        ))}
      </div>
      {!keys.length && <p className="my-3">{t("users.change.none")}</p>}
      {newSession && (
        <p className="my-4 rounded-xl border border-warning p-3 text-sm">
          {after.active
            ? t("users.change.signInAgain")
            : t("users.change.deactivated")}
        </p>
      )}
      {phase === "review" && (
        <form onSubmit={save} className="mt-4 space-y-3">
          <label className="block text-sm">
            {t("users.change.reason")}
            <textarea
              required
              minLength={3}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <p className="text-sm text-base-content/70">
            {t("users.change.reasonHint")}
          </p>
          <ProofreadPrompt proofread={proofread} />
          <button
            className="btn min-h-11 btn-primary"
            disabled={!keys.length || reason.trim().length < 3 || proofread.waiting}
          >
            {proofread.checking && <ButtonSpinner />}
            {t("users.change.confirm")}
          </button>
        </form>
      )}
      {phase === "saving" && (
        <InlineLoader save className="my-4" label={t("users.change.saving")} />
      )}
      {result && (
        <p role="status" className="operational-confirm my-4 text-success">
          {t("users.change.result", {
            id: result.id,
            time: format.dateTime(result.createdAt),
            actor: result.actorId,
          })}
        </p>
      )}
      <p className="my-4" aria-live="polite">
        {message}
      </p>
      {phase === "unknown" && (
        <button className="btn min-h-11 btn-primary" onClick={() => save()}>
          {t("users.change.check")}
        </button>
      )}
      <div className="mt-5 flex justify-end">
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("users.change.closeReload")
              : phase === "unknown"
                ? t("users.change.closeUnconfirmed")
                : t("users.review.back")}
        </button>
      </div>
    </dialog>
  );
}
