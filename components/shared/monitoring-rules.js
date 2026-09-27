"use client";

import { useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MONITORING_PARAMETERS,
  parameterInfo,
  ruleProblem,
} from "@/lib/monitoring";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import EmptyState from "../ui/empty-state";
import IconTile from "../ui/icon-tile";
import StatusChip from "../ui/status-chip";
import DataFreshness, { manualRefreshOptions } from "./data-freshness";
import { ruleSentence } from "./rule-sentence";
import useReviewDialog, { sendAttempt } from "./use-review-dialog";
import { InlineLoader } from "../loading/loaders";

// Labels: rules.bound.<key>.
const BOUNDS = [
  ["lowerDanger"],
  ["lowerWarning"],
  ["upperWarning"],
  ["upperDanger"],
];
// ruleProblem (shared with the server) answers in English; these keys translate it.
const PROBLEMS = {
  "Range values must be numbers": "rules.problem.numbers",
  "The expected interval must be 1–720 whole hours": "rules.problem.interval",
  "Give at least one bound of the acceptable range": "rules.problem.oneBound",
  "A lower danger bound needs a lower range bound": "rules.problem.lowerDanger",
  "An upper danger bound needs an upper range bound":
    "rules.problem.upperDanger",
  "The lower range bound must not exceed the upper one": "rules.problem.order",
  "The lower danger bound must be below the lower range bound":
    "rules.problem.lowerBelow",
  "The upper danger bound must be above the upper range bound":
    "rules.problem.upperAbove",
};

async function read(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(data.message || "Unable to load monitoring rules.");
  return data;
}

function RuleDialog({ area, hall, parameter, current, onClose }) {
  const t = useT();
  const format = useFormat();
  const info = parameterInfo(parameter);
  const label = t(`param.${parameter}`);
  const [form, setForm] = useState(() =>
    Object.fromEntries([
      ...BOUNDS.map(([key]) => [
        key,
        current[key] == null ? "" : String(current[key]),
      ]),
      ["intervalHours", String(current.intervalHours)],
      ["approvalReference", current.approvalReference || ""],
      ["reason", ""],
    ]),
  );
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const payload = useRef(null),
    busy = useRef(false),
    fields = useRef({});
  const titleId = useId(),
    client = useQueryClient();
  const { dialog, heading, first, keepFocus } = useReviewDialog(
    phase,
    "edit",
    "monitoring-rules-heading",
  );
  // Links the message to the field it concerns and moves focus there.
  const field = (key) => ({
    ref: (node) => {
      fields.current[key] = node;
      if (key === "lowerDanger") first.current = node;
    },
    "aria-invalid":
      error?.field === key ||
      (error?.field === "bounds" && BOUNDS.some(([bound]) => bound === key)),
    "aria-describedby":
      error &&
      (error.field === key ||
        (error.field === "bounds" && BOUNDS.some(([bound]) => bound === key)))
        ? `${titleId}-error`
        : undefined,
  });
  const values = {
    ...Object.fromEntries(
      BOUNDS.map(([key]) => [
        key,
        form[key].trim() === "" ? null : Number(form[key]),
      ]),
    ),
    intervalHours: Number(form.intervalHours),
  };
  const update = (key) => (event) => {
    const value = event.target.value;
    setForm((existing) => ({ ...existing, [key]: value }));
  };

  function review(event) {
    event.preventDefault();
    const ruleError = ruleProblem(values);
    const problem = ruleError
      ? {
          field: ruleError.includes("interval") ? "intervalHours" : "bounds",
          message: PROBLEMS[ruleError] ? t(PROBLEMS[ruleError]) : ruleError,
        }
      : form.approvalReference.trim().length < 3 ||
          form.approvalReference.trim().length > 1000
        ? {
            field: "approvalReference",
            message: t("rules.error.reference"),
          }
        : form.reason.trim().length < 3 || form.reason.trim().length > 1000
          ? {
              field: "reason",
              message: t("rules.error.reason"),
            }
          : null;
    setError(problem);
    if (problem) {
      (
        fields.current[
          problem.field === "bounds" ? "lowerDanger" : problem.field
        ] || first.current
      )?.focus();
      return;
    }
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
      locationId: hall.id,
      parameter,
      values,
      approvalReference: form.approvalReference.trim(),
      reason: form.reason.trim(),
      expectedRuleId: current.ruleId,
      actionKey: crypto.randomUUID(),
    };
    const outcome = await sendAttempt(
      `/api/${area}-setup/monitoring-rules`,
      payload.current,
      "rule",
    );
    busy.current = false;
    setPhase(outcome.phase);
    setResult(outcome.result || null);
    setMessage(
      outcome.phase === "unknown"
        ? t("rules.unconfirmed")
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
        {result
          ? t("rules.saved")
          : phase === "edit"
            ? t("rules.editTitle", { parameter: label })
            : t("rules.reviewTitle", { parameter: label })}
      </h2>
      <p className="my-3 [overflow-wrap:anywhere]">
        {hall.name} · {label} ({info.unit})
      </p>
      <p className="my-3 text-sm">{t("rules.procedureNote")}</p>
      {phase === "edit" ? (
        <form noValidate className="space-y-3" onSubmit={review}>
          {error && (
            <p id={`${titleId}-error`} role="alert" className="text-error">
              {error.message}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {BOUNDS.map(([key]) => (
              <label key={key} className="block text-sm">
                {t(`rules.bound.${key}`)}
                <input
                  {...field(key)}
                  type="number"
                  step="any"
                  className="input mt-1 w-full"
                  value={form[key]}
                  onChange={update(key)}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            {t("rules.interval")}
            <input
              {...field("intervalHours")}
              type="number"
              min="1"
              max="720"
              step="1"
              required
              className="input mt-1 w-full"
              value={form.intervalHours}
              onChange={update("intervalHours")}
            />
          </label>
          <label className="block text-sm">
            {t("rules.reference")}
            <textarea
              {...field("approvalReference")}
              required
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={form.approvalReference}
              onChange={update("approvalReference")}
            />
          </label>
          <label className="block text-sm">
            {t("def.reason")}
            <textarea
              {...field("reason")}
              required
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={form.reason}
              onChange={update("reason")}
            />
          </label>
          <button type="submit" className="btn min-h-11 btn-primary">
            {t("rules.review")}
          </button>
        </form>
      ) : (
        <>
          <dl className="space-y-3">
            <div className="rounded-xl bg-base-200/70 p-3">
              <dt className="font-semibold">{t("rules.before")}</dt>
              <dd>
                {ruleSentence(t, current, info.unit)}{" "}
                {current.confirmed
                  ? t("meas.confirmed", {
                      reference: current.approvalReference,
                    })
                  : t("alert.rangeUnconfirmed")}
              </dd>
            </div>
            <div className="rounded-xl bg-base-200/70 p-3">
              <dt className="font-semibold">{t("rules.after")}</dt>
              <dd>
                {ruleSentence(t, values, info.unit)}{" "}
                {t("meas.confirmed", {
                  reference: form.approvalReference.trim(),
                })}
              </dd>
            </div>
            <div className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]">
              <dt className="font-semibold">{t("def.reason")}</dt>
              <dd>{form.reason.trim()}</dd>
            </div>
          </dl>
          <p className="my-4">{t("rules.effect")}</p>
          {phase === "review" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={save}
            >
              {t("rules.save", { parameter: label })}
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
              {t("rules.result", {
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
              {t("users.change.check")}
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
              ? t("rules.closeReload")
              : phase === "unknown"
                ? t("users.change.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}

// Administrator view of the ranges and intervals that classify measurements of each hall.
export default function MonitoringRules({ area }) {
  const t = useT();
  const format = useFormat();
  const [hallId, setHallId] = useState("");
  const [editing, setEditing] = useState(null);
  const query = useQuery({
    queryKey: ["monitoringRules", area, "all"],
    queryFn: () => read(`/api/${area}-setup/monitoring-rules`),
    ...manualRefreshOptions,
  });
  const halls = query.data?.locations || [];
  const hall = halls.find((row) => String(row.id) === hallId) || halls[0];
  const versions = (query.data?.versions || []).filter(
    (row) => row.locationId === hall?.id,
  );
  return (
    <section
      className="w-full space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5"
      aria-labelledby="monitoring-rules-heading"
    >
      <h2
        id="monitoring-rules-heading"
        tabIndex={-1}
        className="text-lg font-semibold"
      >
        {t("rules.title")}
      </h2>
      <p className="text-sm text-base-content/70">{t("rules.intro")}</p>
      <DataFreshness query={query} />
      {query.isPending ? (
        <InlineLoader />
      ) : query.isError && !query.data ? (
        <p role="alert">
          {query.error.message}{" "}
          <button
            type="button"
            className="btn min-h-11"
            onClick={() => query.refetch()}
          >
            {t("alert.retry")}
          </button>
        </p>
      ) : !halls.length ? (
        <EmptyState>{t("rules.noLocations")}</EmptyState>
      ) : (
        <>
          <label className="flex max-w-sm flex-col gap-1 text-sm">
            {t("alert.location")}
            <select
              className="select min-h-11 w-full"
              value={String(hall.id)}
              onChange={(event) => setHallId(event.target.value)}
            >
              {halls.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <ul className="grid gap-3 md:grid-cols-2">
            {MONITORING_PARAMETERS.map((parameter) => {
              const rule = hall.rules[parameter.key];
              const label = t(`param.${parameter.key}`);
              return (
                <li
                  key={parameter.key}
                  className="flex flex-col gap-2 rounded-xl border border-base-content/15 p-4 [overflow-wrap:anywhere]"
                >
                  <div className="flex items-center gap-3">
                    <IconTile icon={parameter.key} tone="primary" size="sm" />
                    <h3 className="flex-1 font-semibold">{label}</h3>
                    <StatusChip tone={rule.confirmed ? "success" : "warning"}>
                      {t(rule.confirmed ? "rules.confirmed" : "rules.default")}
                    </StatusChip>
                  </div>
                  <p className="text-sm">
                    {ruleSentence(t, rule, parameter.unit)}
                  </p>
                  {rule.confirmed && (
                    <p className="text-sm text-base-content/70">
                      {t("rules.version", {
                        reference: rule.approvalReference,
                        id: rule.ruleId,
                        time: format.dateTime(rule.createdAt),
                        actor: rule.actorId,
                      })}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn mt-auto min-h-11 self-start border-base-content/20 btn-ghost btn-sm"
                    aria-label={t("rules.editFor", {
                      parameter: label,
                      name: hall.name,
                    })}
                    onClick={() =>
                      setEditing({ parameter: parameter.key, current: rule })
                    }
                  >
                    {t("rules.edit")}
                  </button>
                </li>
              );
            })}
          </ul>
          <details className="rounded-xl border border-base-content/15 px-4">
            <summary className="min-h-11 cursor-pointer py-3 font-medium">
              {t("rules.versions", { name: hall.name, count: versions.length })}
            </summary>
            {!versions.length ? (
              <p className="pb-3 text-sm">{t("rules.noVersions")}</p>
            ) : (
              <ol className="space-y-2 pb-3">
                {versions.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl bg-base-200/70 p-3 text-sm [overflow-wrap:anywhere]"
                  >
                    <p className="font-semibold">
                      {t("rules.versionTitle", {
                        id: row.id,
                        parameter: t(`param.${row.parameter}`),
                        time: format.dateTime(row.createdAt),
                        actor: row.actorId,
                      })}
                    </p>
                    <p>
                      {ruleSentence(t, row, parameterInfo(row.parameter).unit)}
                    </p>
                    <p>
                      {t("rules.confirmedBy", {
                        reference: row.approvalReference,
                      })}
                    </p>
                    <p>{t("ship.reason", { reason: row.reason })}</p>
                  </li>
                ))}
              </ol>
            )}
          </details>
        </>
      )}
      {editing && hall && (
        <RuleDialog
          area={area}
          hall={hall}
          parameter={editing.parameter}
          current={editing.current}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
