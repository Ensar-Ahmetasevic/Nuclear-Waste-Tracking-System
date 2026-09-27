"use client";
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MONITORING_PARAMETERS } from "../../../lib/monitoring";
import { useT } from "../../shell/preferences";
import DataFreshness from "../../shared/data-freshness";
import { WORKSPACE_REFRESH_MS } from "../../shared/use-workspace";
import { Card, CardHeader } from "../../ui/card";
import CapacityBar, { capacityLevel } from "../../ui/capacity-bar";
import ConditionMatrix from "../../ui/condition-matrix";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import Segmented from "../../ui/segmented";
import Skeleton from "../../ui/skeleton";
import StatCard from "../../ui/stat-card";
import StatusChip from "../../ui/status-chip";
import TaskItem from "../../ui/task-item";
import FlowHero from "./flow-hero";
import { alertView } from "./labels";
import MovementsChart from "./movements-chart";
import RecentShipments from "./recent-shipments";
import { LoadingWatch } from "../../loading/loaders";

function attentionView(t, item) {
  if (item.type === "alert") return alertView(t, item);
  if (item.type === "return")
    return {
      icon: "truck",
      tone: "warning",
      title: t("attention.return", { id: item.shipmentId, plates: item.plates }),
      meta: t("attention.return.meta", { company: item.company, hall: item.hall, note: item.note }),
    };
  if (item.type === "shipment")
    return {
      icon: "truck",
      tone: "step-1",
      title: t("attention.shipment", { id: item.shipmentId }),
      meta: t("attention.shipment.meta", { company: item.company }),
    };
  return {
    icon: "transfer",
    tone: "step-3",
    title: t("attention.transfer", { id: item.transferId }),
    meta: t(`attention.transfer.${item.status}`, {
      room: item.room,
      quantity: item.quantity,
    }),
  };
}

export default function ManagementOverview({ user }) {
  const t = useT();
  const format = useFormat();
  const [days, setDays] = useState(7);
  const [area, setArea] = useState("ALL");
  const query = useQuery({
    queryKey: ["overview", user.id, days],
    refetchInterval: WORKSPACE_REFRESH_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await fetch(`/api/overview?days=${days}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Unable to load overview");
      return response.json();
    },
  });
  const data = query.data;
  const parameters = MONITORING_PARAMETERS.map(({ key }) => ({
    key,
    label: t(`param.${key}`),
    short: t(`param.${key}.short`),
  }));
  const attention = data?.attentionTotal ?? 0;
  const capacity =
    data?.capacity.filter((row) => area === "ALL" || row.area === area) || [];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={
          <span suppressHydrationWarning>{format.longDate(new Date())}</span>
        }
        title={t("overview.greeting", { name: user.name || user.email })}
        description={
          <>
            {t("overview.tagline")}{" "}
            {data && (
              <span className={attention ? "font-medium text-warning" : ""}>
                {attention === 0
                  ? t("overview.attention.none")
                  : attention === 1
                    ? t("overview.attention.one")
                    : t("overview.attention.many", { count: attention })}
              </span>
            )}
          </>
        }
        actions={
          <Segmented
            label={t("overview.period")}
            value={days}
            onChange={setDays}
            options={[7, 30].map((value) => ({
              value,
              label: t(`overview.period.${value}`),
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
            <Skeleton className="h-56" />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-36" />
              ))}
            </div>
            <Skeleton className="h-72" />
          </div>
        )
      ) : (
        <>
          <FlowHero pipeline={data.pipeline} kpis={data.kpis} />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="truck"
              tone="step-1"
              label={t("kpi.trucks")}
              value={format.number(data.kpis.trucksOnSite)}
              unit={t("kpi.trucks.unit")}
              href="/shipping-informations"
            >
              {t("kpi.trucks.today", { count: data.kpis.arrivedToday })}
            </StatCard>
            <StatCard
              icon="gauge"
              tone="step-2"
              label={t("kpi.capacity")}
              value={`${data.kpis.capacity.percent}%`}
              unit={t("kpi.capacity.unit")}
            >
              <span className="flex flex-col gap-2">
                <CapacityBar
                  percent={data.kpis.capacity.percent}
                  tone="step-2"
                  label={t("kpi.capacity")}
                  size="sm"
                />
                {t("kpi.capacity.foot", {
                  used: format.number(data.kpis.capacity.used),
                  slots: format.number(data.kpis.capacity.slots),
                })}
              </span>
            </StatCard>
            <StatCard
              icon="alert"
              tone="error"
              label={t("kpi.alerts")}
              value={format.number(data.kpis.alerts.open)}
              unit={t("kpi.alerts.unit", { count: data.kpis.alerts.locations })}
              highlight={data.kpis.alerts.critical > 0}
            >
              <span className="flex flex-wrap gap-1.5">
                <StatusChip
                  tone={data.kpis.alerts.critical ? "error" : "neutral"}
                >
                  {t("chip.critical", { count: data.kpis.alerts.critical })}
                </StatusChip>
                <StatusChip
                  tone={data.kpis.alerts.escalated ? "warning" : "neutral"}
                >
                  {t("chip.escalated", { count: data.kpis.alerts.escalated })}
                </StatusChip>
              </span>
            </StatCard>
            <StatCard
              icon="transfer"
              tone="step-3"
              label={t("kpi.transfers")}
              value={format.number(data.kpis.transfers.requests)}
              unit={t("kpi.transfers.unit", {
                count: format.number(data.kpis.transfers.containers),
              })}
              href="/final-storage/history?view=transfers"
            >
              {data.kpis.transfers.oldestAt
                ? t("kpi.transfers.oldest", {
                    age: format.age(data.kpis.transfers.oldestAt),
                  })
                : t("kpi.transfers.none")}
            </StatCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <RecentShipments rows={data.recent || []} />
            </div>
            <Card
              as="section"
              aria-labelledby="attention-title"
              className="space-y-4"
            >
              <CardHeader id="attention-title" title={t("attention.title")} />
              {data.attention.length ? (
                <ul className="space-y-2">
                  {data.attention.map((item) => {
                    const view = attentionView(t, item);
                    return (
                      <TaskItem
                        key={item.id}
                        href={item.href}
                        aside={format.age(item.at)}
                        {...view}
                      />
                    );
                  })}
                </ul>
              ) : (
                <EmptyState>{t("attention.empty")}</EmptyState>
              )}
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card
              as="section"
              aria-labelledby="capacity-title"
              className="space-y-2 xl:col-span-2"
            >
              <CardHeader
                id="capacity-title"
                title={t("capacity.title")}
                description={t("capacity.desc")}
                action={
                  <Segmented
                    label={t("capacity.filter")}
                    value={area}
                    onChange={setArea}
                    options={[
                      { value: "ALL", label: t("capacity.all") },
                      { value: "PRE_STORAGE", label: t("area.PRE_STORAGE") },
                      {
                        value: "FINAL_STORAGE",
                        label: t("area.FINAL_STORAGE"),
                      },
                    ]}
                  />
                }
                className="pb-2"
              />
              {capacity.length ? (
                <ul className="divide-y divide-base-content/10">
                  {capacity.map((row) => {
                    const level = capacityLevel(row.percent);
                    return (
                      <li
                        key={`${row.area}-${row.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3.5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_6rem_7.5rem]"
                      >
                        <Link
                          href={row.href}
                          className="min-w-0 hover:underline"
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className={`size-2.5 shrink-0 rounded-sm ${row.area === "PRE_STORAGE" ? "bg-step-2" : "bg-step-3"}`}
                            />
                            <span className="truncate font-semibold">
                              {row.name}
                            </span>
                          </span>
                          <span className="block truncate pl-5 text-xs text-base-content/65">
                            {t(`area.${row.area}`)} · {row.detail}
                          </span>
                        </Link>
                        <span className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                          <CapacityBar
                            percent={row.percent}
                            tone={
                              row.area === "PRE_STORAGE" ? "step-2" : "step-3"
                            }
                            label={t("capacity.aria", {
                              name: row.name,
                              used: row.used,
                              slots: row.slots,
                            })}
                          />
                        </span>
                        <span className="text-right font-mono text-sm text-base-content/80 max-md:hidden">
                          {format.number(row.used)} / {format.number(row.slots)}
                        </span>
                        <StatusChip
                          tone={
                            level === "full"
                              ? "error"
                              : level === "near"
                                ? "warning"
                                : "neutral"
                          }
                          className="justify-self-end"
                        >
                          {level === "full"
                            ? t("capacity.full")
                            : level === "near"
                              ? t("capacity.near")
                              : t("capacity.used", { percent: row.percent })}
                        </StatusChip>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState>{t("capacity.empty")}</EmptyState>
              )}
            </Card>

            <Card
              as="section"
              aria-labelledby="conditions-title"
              className="space-y-4"
            >
              <CardHeader
                id="conditions-title"
                title={t("conditions.title")}
                description={t("conditions.desc")}
              />
              {data.conditions.length ? (
                <ConditionMatrix
                  caption={t("conditions.title")}
                  rows={data.conditions}
                  parameters={parameters}
                  stateLabel={(state) => t(`cell.${state}`)}
                />
              ) : (
                <EmptyState>{t("conditions.empty")}</EmptyState>
              )}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-base-content/75">
                {[
                  ["clear", "bg-success"],
                  ["warning", "bg-warning"],
                  ["critical", "bg-error"],
                  ["overdue", "border border-dashed border-warning"],
                  ["nodata", "border border-dashed border-base-content/50"],
                ].map(([state, swatch]) => (
                  <li key={state} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-sm ${swatch}`}
                    />
                    {t(`cell.${state}`)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-base-content/65">
                {t("conditions.note")}
              </p>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card
              as="section"
              aria-labelledby="movements-title"
              className="space-y-4 xl:col-span-3"
            >
              <CardHeader
                id="movements-title"
                title={t("movements.title")}
                description={t("movements.desc", {
                  received: format.number(data.movements.received),
                  final: format.number(data.movements.final),
                })}
                action={
                  <ul className="flex flex-wrap gap-4 text-sm text-base-content/80">
                    <li className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-sm bg-step-1"
                      />
                      {t("movements.received")}
                    </li>
                    <li className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-sm bg-step-3"
                      />
                      {t("movements.final")}
                    </li>
                  </ul>
                }
              />
              {data.movements.received || data.movements.final ? (
                <MovementsChart movements={data.movements} />
              ) : (
                <EmptyState>{t("movements.empty")}</EmptyState>
              )}
              <p className="text-xs text-base-content/65">
                {t("movements.note")}
              </p>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
