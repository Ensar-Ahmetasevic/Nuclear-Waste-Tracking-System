"use client";
import Link from "next/link";
import { LuArrowRight, LuHistory } from "react-icons/lu";
import { MONITORING_PARAMETERS } from "../../../lib/monitoring";
import { areas } from "../../../lib/workspaces.cjs";
import { useT } from "../../shell/preferences";
import DataFreshness from "../../shared/data-freshness";
import { useWorkspace, WORKSPACE_REFRESH_MS } from "../../shared/use-workspace";
import CapacityBar, { capacityLevel } from "../../ui/capacity-bar";
import ConditionChips from "../../ui/condition-chips";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import IconTile from "../../ui/icon-tile";
import PageHeader from "../../ui/page-header";
import { LOCATION_BORDERS, locationTone } from "../../../lib/location-colors";
import Skeleton from "../../ui/skeleton";
import StatusChip from "../../ui/status-chip";
import { LoadingWatch } from "../../loading/loaders";

const AREA = {
  PRE_STORAGE: {
    step: 2,
    tone: "step-2",
    icon: "warehouse",
    scene: "hall",
    position: "50% 60%",
  },
  FINAL_STORAGE: {
    step: 3,
    tone: "step-3",
    icon: "layers",
    scene: "finalStorage",
    position: "50% 45%",
  },
};


// What waits in a hall or room, shortest first; "action" marks work for this area.
function signalsOf(t, format, area, signals = {}) {
  const items =
    area === "PRE_STORAGE"
      ? [
          signals.deliveries > 0 && {
            key: "deliveries",
            tone: "warning",
            action: true,
            text: t("storage.signal.deliveries", {
              count: signals.deliveries,
              containers: t("ship.containers", {
                count: format.number(signals.containers),
              }),
            }),
          },
          signals.transfers > 0 && {
            key: "transfers",
            tone: "warning",
            action: true,
            text: t("storage.signal.transfers", { count: signals.transfers }),
          },
        ]
      : [
          signals.arriving > 0 && {
            key: "arriving",
            tone: "warning",
            action: true,
            text: t("storage.signal.arriving", { count: signals.arriving }),
          },
          signals.requested > 0 && {
            key: "requested",
            tone: "neutral",
            text: t("storage.signal.requested", { count: signals.requested }),
          },
        ];
  items.push(
    signals.alerts > 0 && {
      key: "alerts",
      tone: "error",
      action: true,
      text: t("storage.signal.alerts", { count: signals.alerts }),
    },
  );
  return items.filter(Boolean);
}

// Landing page of Pre-storage or Final storage: counters of the area and one card per hall
// or room with its occupancy and the state of its conditions.
export default function StorageArea({ area }) {
  const t = useT();
  const format = useFormat();
  const { query } = useWorkspace();
  const style = AREA[area];
  const data = query.data?.workspaces?.find((row) => row.key === area);
  const parameters = MONITORING_PARAMETERS.map(({ key }) => ({
    key,
    label: t(`param.${key}`),
  }));
  const locations = data?.locations || [];
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        scene={style.scene}
        tone={style.tone}
        position={style.position}
        eyebrow={t(`storage.eyebrow.${area}`)}
        title={t(`storage.title.${area}`)}
        description={t(`storage.desc.${area}`)}
        actions={
          <Link
            href={`${areas[area].href}/history`}
            className="btn min-h-11 border-base-content/20 bg-base-100/80 backdrop-blur"
          >
            <LuHistory className="size-4.5" aria-hidden="true" />
            {t("home.history")}
          </Link>
        }
        footer={
          <DataFreshness
            query={query}
            autoRefreshMs={WORKSPACE_REFRESH_MS}
            compact
          />
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
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            role="status"
            aria-label={t("common.loading")}
          >
            <LoadingWatch className="md:col-span-2 xl:col-span-3" />
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-64" />
            ))}
          </div>
        )
      ) : (
        <>
          <section aria-labelledby="locations-title" className="space-y-4">
            <h2 id="locations-title" className="text-lg font-semibold">
              {t(area === "PRE_STORAGE" ? "metric.halls" : "metric.rooms")}{" "}
              <span className="text-base-content/60">({locations.length})</span>
            </h2>
            {locations.length ? (
              <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {locations.map((row) => {
                  const level = capacityLevel(row.percent);
                  const waiting = signalsOf(t, format, area, row.signals);
                  const tone = locationTone(row.id);
                  const border = LOCATION_BORDERS[tone];
                  return (
                    <li key={row.id}>
                      <article
                        className={`flex h-full flex-col gap-4 rounded-box border bg-base-100 p-5 ${
                          waiting.some((item) => item.action)
                            ? `border-2 ${border}`
                            : "border-base-content/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <IconTile icon={style.icon} tone={tone} />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold break-words">
                              {row.name}
                            </h3>
                            <p className="text-sm text-base-content/70">
                              {[
                                row.detail,
                                row.depth != null &&
                                  t("storage.depth", { depth: row.depth }),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <StatusChip
                            tone={
                              level === "full"
                                ? "error"
                                : level === "near"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {level === "full"
                              ? t("capacity.full")
                              : level === "near"
                                ? t("capacity.near")
                                : t("capacity.used", { percent: row.percent })}
                          </StatusChip>
                        </div>
                        {waiting.length > 0 && (
                          <ul
                            aria-label={t("storage.waiting", {
                              name: row.name,
                            })}
                            className="flex flex-wrap gap-2"
                          >
                            {waiting.map((item) => (
                              <li key={item.key}>
                                <StatusChip tone={item.tone}>
                                  {item.text}
                                </StatusChip>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="space-y-2">
                          <CapacityBar
                            percent={row.percent}
                            tone={tone}
                            label={t("capacity.aria", {
                              name: row.name,
                              used: row.used,
                              slots: row.slots,
                            })}
                          />
                          <p className="flex justify-between gap-2 text-sm">
                            <span className="font-mono">
                              {t("storage.slots", {
                                used: format.number(row.used),
                                slots: format.number(row.slots),
                              })}
                            </span>
                            <span className="text-base-content/70">
                              {t("storage.free", {
                                count: format.number(
                                  Math.max(0, row.slots - row.used),
                                ),
                              })}
                            </span>
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold tracking-wide text-base-content/65 uppercase">
                            {t("conditions.title")}
                          </p>
                          <ConditionChips
                            cells={row.cells}
                            parameters={parameters}
                            stateLabel={(state) => t(`cell.${state}`)}
                          />
                        </div>
                        <Link
                          href={row.href}
                          className="btn mt-auto min-h-11 btn-primary"
                          aria-label={t("storage.open", { name: row.name })}
                        >
                          {t("home.openTask")}
                          <LuArrowRight
                            className="size-4.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState>{t(`storage.empty.${area}`)}</EmptyState>
            )}
          </section>
        </>
      )}
    </main>
  );
}
