"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { InlineLoader } from "../../loading/loaders";

export default function AccountCreateReview({ proposed, close, saved }) {
  const t = useT();
  const format = useFormat();
  const [phase, setPhase] = useState("review");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(true);
  const dialog = useRef(null),
    heading = useRef(null),
    resume = useRef(null),
    busy = useRef(false);
  const unconfirmed = phase === "unknown";
  useEffect(() => {
    if (!visible) {
      resume.current?.focus();
      return;
    }
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [visible]);
  useEffect(() => {
    if (visible && phase !== "review") heading.current?.focus();
  }, [phase, visible]);
  function finish() {
    if (busy.current) return;
    if (result) saved();
    else if (unconfirmed) setVisible(false);
    else close();
  }
  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposed),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        // A concurrent transaction may have committed this same confirmation.
        if (response.status >= 500 || response.status === 409)
          throw new Error();
        setPhase("error");
        setMessage(data.message || t("users.review.notCreated"));
        return;
      }
      if (!data.creation?.id) throw new Error();
      setResult(data.creation);
      setPhase("success");
      heading.current?.focus();
    } catch {
      setPhase("unknown");
      setMessage(t("users.review.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  if (!visible)
    return (
      <section
        className="rounded-box border border-warning p-4"
        aria-label={t("users.review.pendingLabel")}
      >
        <p role="status">
          {t("users.review.pending", { username: proposed.username })}
        </p>
        <button
          ref={resume}
          className="btn mt-3 min-h-11 btn-outline"
          onClick={() => setVisible(true)}
        >
          {t("users.review.resume")}
        </button>
      </section>
    );
  return (
    <dialog
      ref={dialog}
      aria-busy={phase === "saving"}
      aria-labelledby="account-create-title"
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-6 text-base-content"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        id="account-create-title"
        tabIndex={-1}
        className="text-2xl font-semibold"
      >
        {result ? t("users.review.created") : t("users.reviewNew")}
      </h2>
      <dl className="my-4 grid gap-3 break-words sm:grid-cols-2">
        {[
          ["users.field.displayName", proposed.displayName],
          ["users.field.username", proposed.username],
          ["users.field.email", proposed.email],
          ["users.field.role", t(`role.${proposed.role}`)],
          [
            "users.field.workArea",
            proposed.role === "EMPLOYEE"
              ? t(`area.${proposed.workArea}`)
              : t("users.allAreas"),
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-base-200/70 px-3 py-2.5">
            <dt className="text-xs text-base-content/70">{t(label)}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="rounded-xl bg-base-200 p-3 text-sm">
        {t(`users.review.scope.${proposed.role}`)}
      </p>
      <p className="my-4 text-sm">{t("users.review.note")}</p>
      {phase === "saving" && <InlineLoader save label={t("users.review.saving")} />}
      {message && (
        <p className="my-4" role="alert">
          {message}
        </p>
      )}
      {result && (
        <p role="status" className="operational-confirm my-4 text-success">
          {t("users.review.result", {
            account: result.targetUserId,
            id: result.id,
            time: format.dateTime(result.createdAt),
            actor: result.actorId,
          })}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : unconfirmed
              ? t("users.review.closeKeep")
              : t("users.review.back")}
        </button>
        {(phase === "review" || unconfirmed) && (
          <button className="btn min-h-11 btn-primary" onClick={confirm}>
            {unconfirmed ? t("users.review.check") : t("users.review.confirm")}
          </button>
        )}
      </div>
    </dialog>
  );
}
