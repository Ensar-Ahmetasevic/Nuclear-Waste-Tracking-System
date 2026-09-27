"use client";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useT } from "../../shell/preferences";
import DataFreshness from "../../shared/data-freshness";
import { WORKSPACE_REFRESH_MS } from "../../shared/use-workspace";
import CapacityBar from "../../ui/capacity-bar";
import { Card, CardHeader } from "../../ui/card";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import Segmented from "../../ui/segmented";
import Skeleton from "../../ui/skeleton";
import StatCard from "../../ui/stat-card";
import StatsBarChart from "./charts";
import { LoadingWatch } from "../../loading/loaders";

function Legend({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-base-content/80">
      {series.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 rounded-sm"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// Organization-wide trends: arrivals and container flow, waiting time until
// receipt, condition alerts per week and current occupancy.
export default function Statistics() {
  const t = useT();
  const format = useFormat();
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["statistics", days],
    refetchInterval: WORKSPACE_REFRESH_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await fetch(`/api/statistics?days=${days}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Unable to load statistics");
      return response.json();
    },
  });
  const data = query.data;
  const hours = (value) =>
    value == null
      ? "–"
      : value < 48
        ? t("stats.hours", { value: format.decimal(value) })
        : t("stats.days", { value: format.decimal(value / 24) });
  const daily = [
    {
      key: "arrivals",
      label: t("stats.series.arrivals"),
      color: "var(--color-tone-slate)",
    },
    {
      key: "received",
      label: t("movements.received"),
      color: "var(--color-step-1)",
    },
    { key: "final", label: t("movements.final"), color: "var(--color-step-3)" },
  ];
  const alertSeries = [
    { key: "critical", label: t("cell.critical"), color: "var(--color-error)" },
    { key: "warning", label: t("cell.warning"), color: "var(--color-warning)" },
    {
      key: "overdue",
      label: t("cell.overdue"),
      color: "var(--color-tone-orange)",
    },
  ];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        scene="flow"
        tone="primary"
        position="50% 88%"
        eyebrow={t("nav.section.insights")}
        title={t("stats.title")}
        description={t("stats.desc")}
        actions={
          <Segmented
            label={t("overview.period")}
            value={days}
            onChange={setDays}
            options={[30, 90].map((value) => ({
              value,
              label: t(`stats.period.${value}`),
            }))}
          />
        }
      />
      <DataFreshness query={query} autoRefreshMs={WORKSPACE_REFRESH_MS} />
      {query.isError && !data && (
        <p
          role="alert"
          className="rounded-box border border-error/40 bg-error/10 p-4"
        >
          {t("common.loadError")}
        </p>
      )}
      {!data ? (
        query.isLoading && (
          <div
            className="space-y-6"
            role="status"
            aria-label={t("common.loading")}
          >
            <LoadingWatch />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-80" />
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon="truck"
              tone="step-1"
              label={t("stats.total.arrivals")}
              value={format.number(data.totals.arrivals)}
            />
            <StatCard
              icon="warehouse"
              tone="step-2"
              label={t("stats.total.received")}
              value={format.number(data.totals.received)}
            />
            <StatCard
              icon="layers"
              tone="step-3"
              label={t("stats.total.final")}
              value={format.number(data.totals.final)}
            />
            <StatCard
              icon="alert"
              tone="error"
              label={t("stats.total.alerts")}
              value={format.number(data.totals.alerts)}
            />
          </div>

          <Card
            as="section"
            aria-labelledby="daily-title"
            className="space-y-4"
          >
            <CardHeader
              id="daily-title"
              title={t("stats.daily.title")}
              description={t("stats.daily.desc")}
              action={<Legend series={daily} />}
            />
            {data.totals.arrivals ||
            data.totals.received ||
            data.totals.final ? (
              <StatsBarChart
                data={data.daily.map((row) => ({
                  ...row,
                  label: format.day(row.date, false),
                }))}
                xKey="label"
                series={daily}
              />
            ) : (
              <EmptyState>{t("movements.empty")}</EmptyState>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card
              as="section"
              aria-labelledby="wait-title"
              className="space-y-4"
            >
              <CardHeader
                id="wait-title"
                title={t("stats.wait.title")}
                description={t("stats.wait.desc")}
              />
              <dl className="grid grid-cols-3 gap-2.5">
                {[
                  ["stats.wait.median", hours(data.waiting.medianHours)],
                  ["stats.wait.average", hours(data.waiting.averageHours)],
                  ["stats.wait.receipts", format.number(data.waiting.receipts)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-base-200/70 px-3 py-2.5"
                  >
                    <dt className="text-xs text-base-content/65">{t(label)}</dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {data.waiting.receipts ? (
                <>
                  <StatsBarChart
                    height="h-48"
                    data={data.waiting.buckets.map((row) => ({
                      ...row,
                      label: t(`stats.bucket.${row.key}`),
                    }))}
                    xKey="label"
                    series={[
                      {
                        key: "count",
                        label: t("stats.wait.receipts"),
                        color: "var(--color-step-2)",
                      },
                    ]}
                  />
                  <table className="sr-only">
                    <caption>{t("stats.wait.title")}</caption>
                    <tbody>
                      {data.waiting.buckets.map((row) => (
                        <tr key={row.key}>
                          <th scope="row">{t(`stats.bucket.${row.key}`)}</th>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <EmptyState>{t("stats.wait.empty")}</EmptyState>
              )}
            </Card>

            <Card
              as="section"
              aria-labelledby="alerts-week-title"
              className="space-y-4"
            >
              <CardHeader
                id="alerts-week-title"
                title={t("stats.alerts.title")}
                description={t("stats.alerts.desc")}
                action={<Legend series={alertSeries} />}
              />
              {data.totals.alerts ? (
                <>
                  <StatsBarChart
                    height="h-48"
                    stacked
                    data={data.alertsPerWeek.map((row) => ({
                      ...row,
                      label: format.day(row.week, false),
                    }))}
                    xKey="label"
                    series={alertSeries}
                  />
                  <table className="sr-only">
                    <caption>{t("stats.alerts.title")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("stats.week")}</th>
                        {alertSeries.map((item) => (
                          <th key={item.key} scope="col">
                            {item.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.alertsPerWeek.map((row) => (
                        <tr key={row.week}>
                          <th scope="row">{format.day(row.week, false)}</th>
                          {alertSeries.map((item) => (
                            <td key={item.key}>{row[item.key]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <EmptyState>{t("stats.alerts.empty")}</EmptyState>
              )}
            </Card>
          </div>

          <Card
            as="section"
            aria-labelledby="occupancy-title"
            className="space-y-4"
          >
            <CardHeader
              id="occupancy-title"
              title={t("stats.capacity.title")}
              description={t("stats.capacity.desc")}
            />
            {data.capacity.length ? (
              <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {data.capacity.map((row) => (
                  <li key={`${row.area}-${row.id}`} className="space-y-1.5">
                    <p className="flex justify-between gap-3 text-sm">
                      <span className="font-medium">
                        {row.name}{" "}
                        <span className="text-base-content/60">
                          · {t(`area.${row.area}`)}
                        </span>
                      </span>
                      <span className="font-mono text-base-content/75">
                        {format.number(row.used)} / {format.number(row.slots)} ·{" "}
                        {row.percent}%
                      </span>
                    </p>
                    <CapacityBar
                      percent={row.percent}
                      tone={row.area === "PRE_STORAGE" ? "step-2" : "step-3"}
                      label={t("capacity.aria", {
                        name: row.name,
                        used: row.used,
                        slots: row.slots,
                      })}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t("capacity.empty")}</EmptyState>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
