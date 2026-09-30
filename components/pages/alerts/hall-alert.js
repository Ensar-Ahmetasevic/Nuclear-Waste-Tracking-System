"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LuArrowRight, LuCheck, LuSend } from "react-icons/lu";
import { useT } from "../../shell/preferences";
import AlertProblems, {
  AlertState,
  problemText,
} from "../../shared/alert-problems";
import { personLabel } from "../../shared/person-label";
import { Card, CardHeader } from "../../ui/card";
import { useFormat } from "../../ui/format";
import Skeleton from "../../ui/skeleton";
import Breadcrumb from "../../ui/breadcrumb";
import MessageText from "../../ui/message-text";
import { ProofreadPrompt, useProofread } from "../../ui/proofread";
import { ButtonSpinner } from "../../loading/spinner";

async function request(path, options) {
  const response = await fetch(path, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

// One alert of a hall: what is wrong there now, marking it read, messages
// between Supervision and the workers, and resolving it once the hall is back
// within range. Everything done stays in its history.
export default function HallAlert({ area, alertId }) {
  const t = useT();
  const format = useFormat();
  const client = useQueryClient();
  const { data: session } = useSession();
  const manager = ["ADMINISTRATOR", "SUPERVISION"].includes(
    session?.user?.role,
  );
  const path = `/api/${area}-setup/alerts`;
  const [message, setMessage] = useState("");
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const checkNote = useProofread();
  const checkMessage = useProofread();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["hallAlerts", area, alertId],
    queryFn: () => request(`${path}?alertId=${alertId}`),
    refetchInterval: 30_000,
  });

  async function act(action, text = "") {
    setBusy(true);
    setError("");
    try {
      await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action, text }),
      });
      if (action === "MESSAGE") setMessage("");
      if (action === "RESOLVE") setResolving(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["hallAlerts"] }),
        client.invalidateQueries({ queryKey: ["workspace"] }),
      ]);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  const data = query.data;
  const alert = data?.alert;
  const person = (id) => personLabel(t, data?.people?.[id], id);
  // Alerts belong to their hall or room: back to it in one click.
  const breadcrumb = (
    <Breadcrumb
      items={[
        {
          href: `/${area}`,
          label: t(
            `storage.title.${area === "final-storage" ? "FINAL_STORAGE" : "PRE_STORAGE"}`,
          ),
        },
        alert && {
          href: `/${area}/${alert.locationId}`,
          label: alert.locationName,
        },
        { label: t("alert.number", { id: alertId }) },
      ]}
    />
  );
  if (!alert)
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {breadcrumb}
        {query.isError ? (
          <p
            role="alert"
            className="rounded-box border border-error/40 bg-error/10 p-4"
          >
            {query.error.message}
          </p>
        ) : (
          <Skeleton className="h-64" />
        )}
      </main>
    );

  const open = !alert.resolvedAt;
  const normal = !alert.problems.length;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {breadcrumb}
      {/* The breadcrumb names the page; the status sits on the card. */}
      <h1 className="sr-only">
        {alert.locationName} · {t("alert.number", { id: alertId })}
      </h1>

      <Card as="section" aria-labelledby="problems-title" className="space-y-4">
        <CardHeader
          id="problems-title"
          title={t("halert.problems")}
          action={<AlertState alert={alert} />}
        />
        {normal ? (
          <p className="rounded-xl border border-success/40 bg-success/10 p-4 text-success">
            {t("halert.allNormal")}
          </p>
        ) : (
          <ul className="space-y-2">
            {alert.problems.map((problem) => (
              <li
                key={problem.key}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                  problem.level === "danger"
                    ? "border-error/50 bg-error/10"
                    : "border-warning/50 bg-warning/10"
                }`}
              >
                <span className="font-semibold">
                  {problemText(t, format, problem)}
                </span>
                <span className="text-sm">
                  {problem.key === "OVERDUE"
                    ? t("halert.overdueSince", {
                        time: format.dateTime(problem.since),
                      })
                    : t(
                        `cell.${problem.level === "danger" ? "critical" : "warning"}`,
                      )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${area}/${alert.locationId}`}
            className="btn min-h-11 border-base-content/20 btn-ghost"
          >
            {t("alert.openLocation")}
            <LuArrowRight className="size-4" aria-hidden="true" />
          </Link>
          {manager && open && !alert.readAt && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              disabled={busy}
              onClick={() => act("READ")}
            >
              <LuCheck className="size-4" aria-hidden="true" />
              {t("halert.markRead")}
            </button>
          )}
          {manager && open && !resolving && (
            <button
              type="button"
              className="btn min-h-11 btn-success"
              disabled={busy || !normal}
              onClick={() => setResolving(true)}
            >
              {t("halert.resolve")}
            </button>
          )}
        </div>
        {manager && open && !normal && (
          <p className="text-sm text-base-content/70">
            {t("halert.resolveHint")}
          </p>
        )}
        {resolving && (
          <form
            className="space-y-3 rounded-xl border border-success/40 p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (checkNote.waiting) return;
              const text = await checkNote.confirm(note);
              setNote(text);
              act("RESOLVE", text);
            }}
          >
            <label className="block text-sm">
              {t("halert.resolveNote")}
              <textarea
                className="textarea mt-1 w-full"
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <ProofreadPrompt proofread={checkNote} />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn min-h-11 btn-success"
                disabled={busy || checkNote.waiting}
              >
                {checkNote.checking && <ButtonSpinner />}
                {t("halert.resolveConfirm")}
              </button>
              <button
                type="button"
                className="btn min-h-11 btn-ghost"
                onClick={() => setResolving(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
        {alert.resolvedAt && alert.resolveNote && (
          <p className="rounded-xl bg-base-200/70 p-3 text-sm">
            <MessageText text={alert.resolveNote} />
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </Card>

      <Card as="section" aria-labelledby="history-title" className="space-y-4">
        <CardHeader id="history-title" title={t("halert.history")} />
        <ol className="space-y-3">
          {data.entries.map((entry) =>
            entry.type === "MESSAGE" ? (
              <li
                key={entry.id}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3"
              >
                <p className="text-xs text-base-content/65">
                  <span className="font-semibold text-base-content">
                    {person(entry.authorId)}
                  </span>{" "}
                  · {format.dateTime(entry.createdAt)}
                </p>
                <p className="mt-1">
                  <MessageText text={entry.text} />
                </p>
              </li>
            ) : (
              <li key={entry.id} className="px-1 text-sm text-base-content/75">
                <span className="text-xs text-base-content/55">
                  {format.dateTime(entry.createdAt)}
                </span>{" "}
                {entry.type === "READ"
                  ? t("halert.entry.READ", { person: person(entry.authorId) })
                  : entry.type === "RESOLVED"
                    ? t("halert.entry.RESOLVED", {
                        person: person(entry.authorId),
                      })
                    : entry.type === "MEASURED" && !entry.problems?.length
                      ? t("halert.entry.NORMAL")
                      : t(`halert.entry.${entry.type}`)}
                {entry.problems?.length > 0 && (
                  <AlertProblems problems={entry.problems} className="mt-0.5" />
                )}
                {entry.type === "RESOLVED" && entry.text && (
                  <MessageText text={entry.text} className="mt-0.5 block text-base-content" />
                )}
              </li>
            ),
          )}
        </ol>
        {open && (
          <form
            className="flex items-end gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!message.trim() || checkMessage.waiting) return;
              const text = await checkMessage.confirm(message);
              setMessage(text);
              act("MESSAGE", text);
            }}
          >
            <label className="flex-1 text-sm">
              <span className="sr-only">{t("halert.message")}</span>
              <textarea
                className="textarea w-full"
                rows={2}
                maxLength={1000}
                placeholder={t(
                  manager
                    ? "halert.messageToWorkers"
                    : "halert.messageToSupervision",
                )}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn min-h-11 btn-primary"
              disabled={busy || !message.trim() || checkMessage.waiting}
            >
              {checkMessage.checking ? <ButtonSpinner /> : <LuSend className="size-4" aria-hidden="true" />}
              {t("halert.send")}
            </button>
          </form>
        )}
        {open && <ProofreadPrompt proofread={checkMessage} />}
      </Card>
    </main>
  );
}
