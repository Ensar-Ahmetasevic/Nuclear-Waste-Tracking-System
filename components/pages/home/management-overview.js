"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MONITORING_PARAMETERS } from "../../../lib/monitoring";
import { useT } from "../../shell/preferences";
import DataFreshness from "../../shared/data-freshness";
import { WORKSPACE_REFRESH_MS } from "../../shared/use-workspace";
import { Card, CardHeader } from "../../ui/card";
import CapacityBar from "../../ui/capacity-bar";
import ConditionMatrix from "../../ui/condition-matrix";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import Skeleton from "../../ui/skeleton";
import TaskItem from "../../ui/task-item";
import FlowHero from "./flow-hero";
import { alertView } from "./labels";
import RecentShipments from "./recent-shipments";
import { LoadingWatch } from "../../loading/loaders";

function attentionView(t, format, item) {
  if (item.type === "alert") return alertView(t, format, item);
  if (item.type === "return")
    return {
      icon: "truck",
      tone: "warning",
      title: t("attention.return", {
        id: item.shipmentId,
        plates: item.plates,
      }),
      meta: t("attention.return.meta", {
        company: item.company,
        hall: item.hall,
        note: item.note,
      }),
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

// Management home: the flow of the three steps, what needs someone, and one row
// per location with its occupancy and conditions. Trends live in Statistics.
export default function ManagementOverview({ user }) {
  const t = useT();
  const format = useFormat();
  const query = useQuery({
    queryKey: ["overview", user.id],
    refetchInterval: WORKSPACE_REFRESH_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await fetch("/api/overview", {
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
  const locations =
    data?.conditions.map((row) => ({
      ...row,
      capacity: data.capacity.find(
        (item) => item.area === row.area && item.id === row.id,
      ),
    })) || [];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={
          <span suppressHydrationWarning>{format.longDate(new Date())}</span>
        }
        title={t("overview.greeting", { name: user.name || user.email })}
        actions={
          <DataFreshness query={query} autoRefreshMs={WORKSPACE_REFRESH_MS} />
        }
      />
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
            <Skeleton className="h-72" />
          </div>
        )
      ) : (
        <>
          <FlowHero pipeline={data.pipeline} kpis={data.kpis} />

          <div className="grid gap-5 xl:grid-cols-3">
            <Card
              as="section"
              aria-labelledby="attention-title"
              className="space-y-4"
            >
              <CardHeader id="attention-title" title={t("attention.title")} />
              {data.attention.length ? (
                <ul className="space-y-2">
                  {data.attention.map((item) => {
                    const view = attentionView(t, format, item);
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

            <Card
              as="section"
              aria-labelledby="locations-title"
              className="space-y-4 xl:col-span-2"
            >
              <CardHeader id="locations-title" title={t("locations.title")} />
              {locations.length ? (
                <ConditionMatrix
                  caption={t("locations.title")}
                  rows={locations}
                  parameters={parameters}
                  stateLabel={(state) => t(`cell.${state}`)}
                  lead={{
                    label: t("locations.occupancy"),
                    render: ({ name, capacity }) =>
                      capacity && (
                        <span className="flex items-center gap-3">
                          <CapacityBar
                            percent={capacity.percent}
                            tone={
                              capacity.area === "PRE_STORAGE"
                                ? "step-2"
                                : "step-3"
                            }
                            size="sm"
                            label={t("capacity.aria", {
                              name,
                              used: capacity.used,
                              slots: capacity.slots,
                            })}
                          />
                          <span className="shrink-0 font-mono text-xs text-base-content/75">
                            {format.number(capacity.used)} /{" "}
                            {format.number(capacity.slots)}
                          </span>
                        </span>
                      ),
                  }}
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
            </Card>
          </div>

          <RecentShipments rows={data.recent || []} />
        </>
      )}
    </main>
  );
}
