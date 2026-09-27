"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "../../shell/preferences";
import AlertActionDialog from "../../shared/alert-action-dialog";
import { AlertCard, AlertHistory } from "../../shared/condition-alerts";
import DataFreshness, {
  manualRefreshOptions,
} from "../../shared/data-freshness";
import { ruleSentence } from "../../shared/rule-sentence";
import { Card, CardHeader } from "../../ui/card";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import HallPlan from "../../ui/hall-plan";
import MeasurementChart from "../../ui/measurement-chart";
import PageHeader from "../../ui/page-header";
import { SceneStat, SceneStats } from "../../ui/scene";
import Skeleton from "../../ui/skeleton";
import StatusChip from "../../ui/status-chip";
import { LoadingWatch } from "../../loading/loaders";

const AREA_KEY = {
  "pre-storage": "PRE_STORAGE",
  "final-storage": "FINAL_STORAGE",
};
const LEVEL_TONE = {
  danger: "error",
  warning: "warning",
  optimal: "success",
  unknown: "neutral",
};

async function read(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Unable to load the alert");
    error.status = response.status;
    throw error;
  }
  return data;
}

// One condition alert in focus: the measurements it is based on against its
// rule, the hall on its schematic plan, all parameters of the latest
// measurement, the handling (existing actions) and the recorded history.
export default function AlertFocus({ area, alertId }) {
  const t = useT();
  const format = useFormat();
  const { data: session } = useSession();
  const manager = ["ADMINISTRATOR", "SUPERVISION"].includes(
    session?.user?.role,
  );
  const areaKey = AREA_KEY[area];
  const [acting, setActing] = useState(null);
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["conditionAlerts", area, "focus", alertId],
    queryFn: () => read(`/api/${area}-setup/monitoring?alertId=${alertId}`),
    retry: (count, error) => error.status !== 404 && count < 2,
  });
  const data = query.data;
  const breadcrumb = (
    <nav
      aria-label={t("ship.breadcrumb")}
      className="flex flex-wrap items-center gap-2 text-sm text-base-content/65"
    >
      <Link
        href={`/${area}`}
        className="hover:text-base-content hover:underline"
      >
        {t(`storage.title.${areaKey}`)}
      </Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page" className="text-base-content/85">
        {t("alert.number", { id: alertId })}
      </span>
    </nav>
  );
  if (!data)
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {breadcrumb}
        {query.isError ? (
          <p
            role="alert"
            className="rounded-box border border-error/40 bg-error/10 p-4"
          >
            {query.error?.status === 404
              ? t("focus.notFound")
              : t("focus.loadError")}
          </p>
        ) : (
          <div
            role="status"
            aria-label={t("common.loading")}
            className="space-y-5"
          >
            <LoadingWatch />
            <Skeleton className="h-60" />
            <Skeleton className="h-72" />
          </div>
        )}
      </main>
    );

  const {
    alert,
    events,
    series,
    seriesFrom,
    seriesTruncated,
    latest,
    location,
  } = data;
  const critical = alert.severity === "CRITICAL";
  const parameter = t(`param.${alert.parameter}`);
  const rule = alert.rule || {};
  const tone = alert.closedAt ? "neutral" : critical ? "error" : "warning";
  const title =
    alert.kind === "MISSING"
      ? t("focus.title.missing", { parameter })
      : t("focus.title.range", {
          value: `${format.measure(alert.lastValue)} ${alert.unit}`,
          parameter,
        });
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {breadcrumb}
      <PageHeader
        scene="alarm"
        tone={tone}
        position="50% 40%"
        eyebrow={`${t(critical ? "cell.critical" : "cell.warning")} · ${alert.locationName} · ${parameter}`}
        title={title}
        description={t("focus.desc", {
          time: format.dateTime(alert.openedAt),
          age: format.age(alert.openedAt),
        })}
        actions={
          <span className="flex flex-wrap gap-2">
            {alert.closedAt ? (
              <StatusChip tone="neutral">{t("alert.closed")}</StatusChip>
            ) : alert.clearedAt ? (
              <StatusChip tone="success">{t("focus.cleared")}</StatusChip>
            ) : (
              <StatusChip tone={critical ? "error" : "warning"}>
                {t("focus.open.state")}
              </StatusChip>
            )}
            {alert.escalatedAt && !alert.closedAt && (
              <StatusChip tone="error">{t("alert.count.escalated")}</StatusChip>
            )}
          </span>
        }
      >
        <SceneStats label={t("focus.figures")}>
          {alert.kind === "OUT_OF_RANGE" && (
            <SceneStat
              label={t("alert.latestValue")}
              value={`${format.measure(alert.lastValue)} ${alert.unit}`}
              note={format.dateTime(alert.lastMeasuredAt)}
              tone={critical ? "error" : "warning"}
            />
          )}
          <SceneStat
            label={t("focus.measurements")}
            value={format.number(alert.measurementCount)}
            note={t("focus.measurements.note")}
          />
          <SceneStat
            label={t("focus.handling")}
            value={
              alert.acknowledgedAt
                ? t("focus.handling.yes")
                : t("focus.handling.no")
            }
            note={
              alert.acknowledgedAt
                ? t("ship.activity.user", { actor: alert.acknowledgedById })
                : null
            }
          />
        </SceneStats>
      </PageHeader>
      <DataFreshness query={query} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card
            as="section"
            aria-labelledby="focus-chart-title"
            className="space-y-4"
          >
            <CardHeader
              id="focus-chart-title"
              title={t("focus.chart", {
                parameter,
                location: alert.locationName,
              })}
              description={ruleSentence(t, rule, alert.unit)}
            />
            {!rule.confirmed && (
              <p className="text-sm text-warning">
                {t("alert.rangeUnconfirmed")}
              </p>
            )}
            {series.length ? (
              <MeasurementChart
                series={series}
                rule={rule}
                unit={alert.unit}
                from={seriesFrom}
                openedAt={alert.openedAt}
                label={`${parameter} · ${alert.locationName}`}
              />
            ) : (
              <EmptyState>{t("focus.noSeries")}</EmptyState>
            )}
            {seriesTruncated && (
              <p className="text-xs text-base-content/65">
                {t("focus.truncated")}
              </p>
            )}
          </Card>
          <ul className="list-none">
            <AlertCard
              area={area}
              alert={alert}
              manager={manager}
              focus
              onAct={(value, action) => setActing({ alert: value, action })}
            />
          </ul>
        </div>

        <div className="space-y-6">
          {location && (
            <Card
              as="section"
              aria-labelledby="focus-plan-title"
              className="space-y-4"
            >
              <CardHeader
                id="focus-plan-title"
                title={location.name}
                action={
                  <Link
                    href={`/${area}/${location.id}`}
                    className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
                  >
                    {t("alert.openLocation")}
                  </Link>
                }
              />
              <HallPlan
                name={location.name}
                used={location.used}
                slots={location.slots}
                tone={areaKey === "PRE_STORAGE" ? "step-2" : "step-3"}
                condition={
                  alert.closedAt || alert.clearedAt
                    ? null
                    : critical
                      ? "critical"
                      : alert.kind === "MISSING"
                        ? "overdue"
                        : "warning"
                }
              />
              <p className="text-xs text-base-content/65">
                {t("focus.planNote")}
              </p>
            </Card>
          )}
          <Card
            as="section"
            aria-labelledby="focus-latest-title"
            className="space-y-3"
          >
            <CardHeader
              id="focus-latest-title"
              title={t("focus.latest")}
              description={
                latest
                  ? t("focus.latest.desc", {
                      time: format.dateTime(latest.at),
                      id: latest.id,
                    })
                  : null
              }
            />
            {latest ? (
              <ul className="divide-y divide-base-content/10 text-sm">
                {latest.values.map((row) => (
                  <li key={row.key} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1">{t(`param.${row.key}`)}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {format.measure(row.value)} {row.unit}
                    </span>
                    <StatusChip tone={LEVEL_TONE[row.level] || "neutral"}>
                      {t(`focus.level.${row.level}`)}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t("cell.nodata")}</EmptyState>
            )}
          </Card>
          <Card
            as="section"
            aria-labelledby="focus-history-title"
            className="space-y-3"
          >
            <CardHeader
              id="focus-history-title"
              title={t("focus.history", { count: events.length })}
            />
            <AlertHistory area={area} alertId={alert.id} />
          </Card>
        </div>
      </div>
      {acting && (
        <AlertActionDialog
          area={area}
          alert={acting.alert}
          action={acting.action}
          onClose={() => setActing(null)}
        />
      )}
    </main>
  );
}
