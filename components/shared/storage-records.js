"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";
import EmptyState from "../ui/empty-state";
import PageHeader from "../ui/page-header";
import StatusChip from "../ui/status-chip";
import { manualRefreshOptions } from "./data-freshness";
import { InlineLoader, PageLoader } from "../loading/loaders";

const LEVEL_TONE = {
  danger: "error",
  warning: "warning",
  unknown: "neutral",
  optimal: "success",
};
const VALUE_TONE = { danger: "text-error", warning: "text-warning" };
const AREA_KEY = {
  "pre-storage": "PRE_STORAGE",
  "final-storage": "FINAL_STORAGE",
};
const VIEWS = ["measurements", "receipts", "transfers"];

export default function StorageRecords({ area }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Records area={area} />
    </Suspense>
  );
}

function Records({ area }) {
  const t = useT();
  const format = useFormat();
  const pre = area === "pre-storage";
  const areaKey = AREA_KEY[area];
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = VIEWS.includes(params.get("view"))
    ? params.get("view")
    : "measurements";
  function updateFilters(changes) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value == null) next.delete(key);
      else next.set(key, String(value));
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  const rawPage = Number(params.get("page") || 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 2147483647
      ? rawPage
      : 1;
  // Pre-storage transfers are not filtered by hall.
  const byLocation = !(pre && view === "transfers");
  const location = byLocation ? params.get("location") || "" : "";
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["storageRecords", area, view, page, location],
    queryFn: async () => {
      const params = new URLSearchParams({
        view,
        page: String(page),
        ...(location ? { location } : {}),
      });
      const response = await fetch(`/api/${area}-setup/overview?${params}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Unable to load records");
      return response.json();
    },
  });
  const { data, isLoading } = query;
  // Server text stays as fallback when a code is unknown.
  const statusText = (row) => {
    if (!row.statusKey) return row.status;
    const key = `records.status.${row.statusKey}`;
    const text = t(key);
    return text === key ? row.status : text;
  };
  // Transfers and final receipts open their transfer; the rest their hall or room.
  const hrefOf = (row) => {
    const transfer = view === "transfers" ? row.id : row.transferId;
    return transfer ? `/transfers/${transfer}` : row.href;
  };
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <nav
        aria-label={t("ship.breadcrumb")}
        className="flex items-center gap-2 text-sm text-base-content/65"
      >
        <Link
          href={`/${area}`}
          className="hover:text-base-content hover:underline"
        >
          {t(`storage.title.${areaKey}`)}
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="text-base-content/85">
          {t("home.history")}
        </span>
      </nav>
      <PageHeader title={t("home.history")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t("records.type")}
          className="flex flex-wrap gap-1 rounded-field border border-base-content/10 bg-base-200 p-1"
        >
          {VIEWS.map((value) => (
            <button
              type="button"
              className={`operational-control min-h-10 rounded-lg px-3 text-sm ${
                view === value
                  ? "bg-base-100 font-semibold shadow-sm"
                  : "text-base-content/70"
              }`}
              key={value}
              aria-pressed={view === value}
              onClick={() =>
                updateFilters({ view: value, page: 1, location: "" })
              }
            >
              {t(`records.view.${value}`)}
            </button>
          ))}
        </div>
        {byLocation && (
          <select
            aria-label={t("alert.location")}
            className="select min-h-11 w-auto max-w-full"
            value={location}
            onChange={(event) =>
              updateFilters({ location: event.target.value, page: 1 })
            }
          >
            <option value="">{t("alert.allLocations")}</option>
            {data?.locations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLoading ? (
        <InlineLoader />
      ) : !data ? (
        <EmptyState>{t("common.loadError")}</EmptyState>
      ) : !data.rows.length ? (
        <EmptyState>{t("records.none")}</EmptyState>
      ) : (
        <ul className="divide-y divide-base-content/10 overflow-hidden rounded-box border border-base-content/10 bg-base-100">
          {data.rows.map((row) => {
            const href = hrefOf(row);
            const body = (
              <>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">{row.location}</span>
                    <span className="text-xs text-base-content/65">
                      {row.date ? format.dateTime(row.date) : t("cell.nodata")}
                    </span>
                  </p>
                  <p className="text-sm text-base-content/80 tabular-nums">
                    {row.level
                      ? row.values.map((value, index) => (
                          <span key={value.key}>
                            {index > 0 && " · "}
                            <span className={VALUE_TONE[value.level]}>
                              {value.value} {value.unit}
                            </span>
                          </span>
                        ))
                      : `${t("ship.containers", { count: row.quantity })} · ${statusText(row)}`}
                  </p>
                </div>
                {row.level && (
                  <StatusChip tone={LEVEL_TONE[row.level]}>
                    {t(`records.level.${row.level}`)}
                  </StatusChip>
                )}
                {href && (
                  <LuChevronRight
                    className="size-4.5 shrink-0 text-base-content/50"
                    aria-hidden="true"
                  />
                )}
              </>
            );
            return (
              <li key={row.id}>
                {href ? (
                  <Link
                    href={href}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-base-content/5"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data?.totalPages > 1 && (
        <nav
          aria-label={t("records.pages")}
          className="flex items-center justify-center gap-3"
        >
          <button
            className="btn min-h-11"
            disabled={data.page === 1}
            onClick={() => updateFilters({ page: data.page - 1 })}
          >
            {t("ship.previous")}
          </button>
          <span>
            {t("ship.page", { page: data.page, total: data.totalPages })}
          </span>
          <button
            className="btn min-h-11"
            disabled={data.page >= data.totalPages}
            onClick={() => updateFilters({ page: data.page + 1 })}
          >
            {t("ship.next")}
          </button>
        </nav>
      )}
    </main>
  );
}
