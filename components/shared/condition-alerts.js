"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import IconTile from "../ui/icon-tile";
import StatusChip from "../ui/status-chip";
import { ruleSentence } from "./rule-sentence";

async function read(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(data.message || "Unable to load condition alerts.");
  return data;
}

// Time in the interface language, or "Not recorded".
function useTime() {
  const t = useT();
  const format = useFormat();
  return (value) => (value ? format.dateTime(value) : t("ship.notRecorded"));
}

export function AlertHistory({ area, alertId }) {
  const t = useT();
  const time = useTime();
  const query = useQuery({
    queryKey: ["conditionAlerts", area, "detail", alertId],
    queryFn: () => read(`/api/${area}-setup/monitoring?alertId=${alertId}`),
    refetchOnWindowFocus: false,
  });
  if (query.isPending) return <p role="status">{t("alert.history.loading")}</p>;
  if (query.isError)
    return (
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
    );
  return (
    <ol className="space-y-2">
      {query.data.events.map((event) => (
        <li
          key={event.id}
          className="rounded-xl bg-base-200/70 px-3 py-2.5 text-sm [overflow-wrap:anywhere]"
        >
          <p className="font-semibold">
            {t(`alert.event.${event.type}`)} · {time(event.effectiveAt)} ·{" "}
            {event.actorId
              ? t("ship.activity.user", { actor: event.actorId })
              : t("alert.system")}
          </p>
          {event.value != null && (
            <p>
              {t("alert.value", { value: event.value })}
              {event.measurementId
                ? ` · ${t("alert.measurementRef", { id: event.measurementId })}`
                : ""}
            </p>
          )}
          {event.note && <p>{event.note}</p>}
          {new Date(event.createdAt) - new Date(event.effectiveAt) > 60000 && (
            <p className="text-base-content/70">
              {t("alert.recordedLater", { time: time(event.createdAt) })}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, children }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-base-content/65">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function AlertCard({ area, alert, manager, onAct, focus = false }) {
  const t = useT();
  const time = useTime();
  const [historyOpen, setHistoryOpen] = useState(false);
  const noteId = `alert-${alert.id}-blocked`;
  const critical = alert.severity === "CRITICAL";
  const closeBlocked = alert.closedAt
    ? null
    : !alert.clearedAt
      ? alert.kind === "MISSING"
        ? t("alert.closeBlocked.missing")
        : t("alert.closeBlocked.range")
      : critical && !manager
        ? t("alert.closeBlocked.critical")
        : null;
  const rule = alert.rule || {};
  const parameter = alert.parameter
    ? t(`param.${alert.parameter}`)
    : alert.label;
  return (
    <li
      className={`space-y-4 rounded-box border bg-base-100 p-5 [overflow-wrap:anywhere] ${
        alert.closedAt
          ? "border-base-content/10"
          : critical
            ? "border-error/60"
            : "border-warning/50"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <IconTile
          icon={alert.kind === "MISSING" ? "clock" : alert.parameter || "alert"}
          tone={alert.closedAt ? "neutral" : critical ? "error" : "warning"}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {parameter} · {alert.locationName}
          </h2>
          <p className="font-mono text-xs text-base-content/65">
            {t("alert.number", { id: alert.id })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusChip tone={critical ? "error" : "warning"}>
            {t(critical ? "cell.critical" : "cell.warning")} ·{" "}
            {t(`alert.kind.${alert.kind}`)}
          </StatusChip>
          {alert.escalatedAt && !alert.closedAt && (
            <StatusChip tone="error">{t("alert.count.escalated")}</StatusChip>
          )}
          {alert.closedAt && (
            <StatusChip tone="neutral">{t("alert.closed")}</StatusChip>
          )}
        </div>
      </div>
      <dl className="space-y-1.5 text-sm">
        {alert.kind === "OUT_OF_RANGE" ? (
          <Field label={t("alert.latestValue")}>
            {t("alert.latestValue.text", {
              value: alert.lastValue,
              unit: alert.unit,
              id: alert.lastMeasurementId,
              time: time(alert.lastMeasuredAt),
              count: alert.measurementCount,
            })}
          </Field>
        ) : (
          <Field label={t("alert.lastMeasurement")}>
            {t("alert.lastMeasurement.text", {
              id: alert.lastMeasurementId,
              time: time(alert.lastMeasuredAt),
              hours: rule.intervalHours,
            })}
          </Field>
        )}
        <Field label={t("alert.range")}>
          {ruleSentence(t, rule, alert.unit)}
          {!rule.confirmed && (
            <span className="block text-warning">
              {t("alert.rangeUnconfirmed")}
            </span>
          )}
        </Field>
        <Field label={t("alert.opened")}>{time(alert.openedAt)}</Field>
        <Field label={t("alert.condition")}>
          {alert.clearedAt
            ? t(
                alert.kind === "MISSING"
                  ? "alert.condition.received"
                  : "alert.condition.back",
                {
                  time: time(alert.clearedAt),
                  id: alert.clearedByMeasurementId,
                },
              )
            : t(
                alert.kind === "MISSING"
                  ? "alert.condition.noNew"
                  : "alert.condition.still",
              )}
        </Field>
        <Field label={t("alert.handling")}>
          {alert.acknowledgedAt
            ? t("alert.ack.by", {
                actor: alert.acknowledgedById,
                time: time(alert.acknowledgedAt),
              })
            : t("alert.ack.none")}
        </Field>
        {alert.escalatedAt && (
          <Field label={t("alert.escalatedTo")}>
            {time(alert.escalatedAt)} · {alert.escalationReason}
          </Field>
        )}
        {alert.closedAt && (
          <Field label={t("alert.closedBy")}>
            {t("alert.closedBy.text", {
              actor: alert.closedById,
              time: time(alert.closedAt),
              note: alert.closeNote,
            })}
          </Field>
        )}
      </dl>
      {!alert.closedAt && closeBlocked && (
        <p id={noteId} className="text-sm text-base-content/80">
          {closeBlocked}
        </p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-base-content/10 pt-3">
        {!alert.closedAt && !alert.acknowledgedAt && (
          <button
            type="button"
            className="btn min-h-11 btn-primary"
            aria-label={t("alert.acknowledge.aria", { id: alert.id })}
            onClick={() => onAct(alert, "ACKNOWLEDGE")}
          >
            {t("alert.acknowledge")}
          </button>
        )}
        {!alert.closedAt && (
          <button
            type="button"
            className="btn min-h-11 border-base-content/20 btn-ghost"
            aria-label={t("alert.addNote.aria", { id: alert.id })}
            onClick={() => onAct(alert, "NOTE")}
          >
            {t("alert.addNote")}
          </button>
        )}
        {!alert.closedAt && (
          <button
            type="button"
            className="btn min-h-11 border-base-content/20 btn-ghost"
            disabled={Boolean(closeBlocked)}
            aria-describedby={closeBlocked ? noteId : undefined}
            aria-label={t("alert.close.aria", { id: alert.id })}
            onClick={() => onAct(alert, "CLOSE")}
          >
            {t("alert.close")}
          </button>
        )}
        {!focus && (
          <button
            type="button"
            className="btn min-h-11 border-base-content/20 btn-ghost"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            {historyOpen ? t("alert.hideHistory") : t("alert.showHistory")}
          </button>
        )}
        {!focus && (
          <Link
            className="btn min-h-11 border-base-content/20 btn-ghost"
            href={`/${area}/alerts/${alert.id}`}
            aria-label={t("focus.openAria", { id: alert.id })}
          >
            {t("focus.open")}
          </Link>
        )}
        <Link
          className="btn min-h-11 btn-ghost"
          href={`/${area}/${alert.locationId}`}
        >
          {t("alert.openLocation")}
        </Link>
      </div>
      {historyOpen && <AlertHistory area={area} alertId={alert.id} />}
    </li>
  );
}

