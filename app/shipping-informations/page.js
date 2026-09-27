"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import AllShippingData from "../../components/pages/shipping-informations/all-shipping-data";
import useShippingInformationQuery from "../../requests/request-shipping-information/use-fetch-shipping-informations-query";
import { PageLoader } from "../../components/loading/loaders";
import DataFreshness, {
  manualRefreshOptions,
} from "../../components/shared/data-freshness";
import { useT } from "../../components/shell/preferences";
import PageHeader from "../../components/ui/page-header";
import IconTile from "../../components/ui/icon-tile";
import EmptyState from "../../components/ui/empty-state";
import {
  shipmentGroup,
  newestShipments,
} from "../../lib/shipping-overview.cjs";
import { shipmentSearchId } from "../../lib/record-codes.cjs";

// Filter tiles; labels come from the interface language.
const views = [
  { id: "all", tone: "step-1", icon: "truck" },
  { id: "missing", tone: "warning", icon: "box" },
  { id: "recorded", tone: "success", icon: "box" },
  { id: "out", tone: "neutral", icon: "truck" },
  { id: "returned", tone: "error", icon: "alert" },
];

export default function ShippingInformations() {
  const t = useT();
  return (
    <Suspense fallback={<p className="p-8">{t("ship.loading")}</p>}>
      <ShippingList />
    </Suspense>
  );
}

function ShippingList() {
  const t = useT();
  const { data: session } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const rawPage = Number(params.get("page") || 1);
  const currentPage =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const searchQuery = params.get("search") || "";
  function updateFilters(changes) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") next.delete(key);
      else next.set(key, String(value));
    }
    router.replace(`/shipping-informations?${next}`, { scroll: false });
  }
  const view = views.some((option) => option.id === params.get("view"))
    ? params.get("view")
    : "all";
  const queryState = useShippingInformationQuery(manualRefreshOptions);
  const { data, isLoading } = queryState;
  if (isLoading)
    return (
      <PageLoader />
    );
  const header = (
    <PageHeader
      scene="gate"
      tone="step-1"
      position="55% 62%"
      eyebrow={t("ship.eyebrow")}
      title={t("ship.title")}
      description={t("ship.desc")}
      actions={
        ["ADMINISTRATOR", "SUPERVISION"].includes(session?.user?.role) && (
          <Link
            href="/shipping-informations/deletions"
            className="btn min-h-11 border-base-content/20 btn-ghost"
          >
            {t("ship.deletions")}
          </Link>
        )
      }
    />
  );
  if (!data)
    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <DataFreshness query={queryState} />
      </main>
    );

  const trucks = newestShipments(data.shippingData || []);
  const counts = { all: trucks.length, missing: 0, recorded: 0, out: 0, returned: 0 };
  trucks.forEach((truck) => {
    counts[shipmentGroup(truck)]++;
    // Returned from Pre-storage, at Step 1 or waiting for Supervision; overlaps "recorded".
    if (truck.returnState) counts.returned++;
  });
  const query = searchQuery.trim().toLowerCase();
  // A shipment code (S-000025, NWTS-S-25, #25 …) finds exactly that shipment.
  const codeId = shipmentSearchId(query);
  const filtered = trucks.filter((truck) => {
    if (view === "returned" ? !truck.returnState : view !== "all" && shipmentGroup(truck) !== view) return false;
    if (codeId) return truck.id === codeId;
    const date = dayjs(truck.entryDateTime);
    // Only numeric D/M/Y shortcuts are dates; company names remain searchable.
    if (/^d\d{1,2}$/.test(query)) return date.date() === Number(query.slice(1));
    if (/^m\d{1,2}$/.test(query))
      return date.month() + 1 === Number(query.slice(1));
    if (/^y\d{4}$/.test(query)) return date.year() === Number(query.slice(1));
    // A plain number is the shipment number itself, never a part of another one.
    if (/^\d+$/.test(query) && truck.id === Number(query)) return true;
    return [
      truck.companyName,
      truck.driverName,
      truck.registrationPlates,
      truck.truckStatus,
      date.format("DD.MM.YYYY"),
      date.format("DD-MM-YYYY"),
      date.format("YYYY-MM-DD"),
    ].some((value) => value?.toLowerCase().includes(query));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(currentPage, totalPages);
  const items = filtered.slice((page - 1) * 10, page * 10);

  const viewLabel = t(`ship.view.${view}`);
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {header}
      <DataFreshness query={queryState} />
      <div
        role="group"
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
        aria-label={t("ship.filterLabel")}
      >
        {views.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => {
              updateFilters({ view: option.id, page: 1 });
            }}
            className={`operational-control flex flex-col gap-2 rounded-box border p-4 text-left ${
              view === option.id
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-base-content/10 bg-base-100 hover:border-base-content/30"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <IconTile icon={option.icon} tone={option.tone} size="sm" />
              <span className="text-sm font-semibold">
                {t(`ship.view.${option.id}`)}
              </span>
            </span>
            <span className="text-3xl font-semibold tabular-nums">
              {counts[option.id]}
            </span>
            <span className="text-xs text-base-content/70">
              {t(`ship.view.${option.id}.hint`)}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-box border border-base-content/10 bg-base-100 p-4">
        <label
          htmlFor="searchShippings"
          className="mb-2 block text-sm font-semibold"
        >
          {t("ship.search")}
        </label>
        <input
          id="searchShippings"
          type="search"
          className="input w-full"
          placeholder={t("ship.search.placeholder")}
          value={searchQuery}
          onChange={(event) => {
            updateFilters({ search: event.target.value, page: 1 });
          }}
        />
        <p className="mt-2 text-xs text-base-content/65">
          {t("ship.search.hint")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p role="status">
          {t("ship.count", { count: filtered.length, view: viewLabel })}
        </p>
        <p className="text-base-content/65">{t("ship.newestFirst")}</p>
      </div>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((truck) => (
            <li key={truck.id}>
              <AllShippingData truck={truck} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="space-y-3">
          <span className="block font-semibold">{t("ship.empty.title")}</span>
          <span className="block">{t("ship.empty.body")}</span>
          <button
            type="button"
            className="btn min-h-11 btn-ghost"
            onClick={() => {
              updateFilters({ view: "all", search: "", page: 1 });
            }}
          >
            {t("ship.empty.reset")}
          </button>
        </EmptyState>
      )}
      {totalPages > 1 && (
        <nav
          aria-label={t("ship.pages")}
          className="flex items-center justify-center gap-4"
        >
          <button
            className="btn min-h-11"
            disabled={page === 1}
            onClick={() => updateFilters({ page: page - 1 })}
          >
            {t("ship.previous")}
          </button>
          <span>{t("ship.page", { page, total: totalPages })}</span>
          <button
            className="btn min-h-11"
            disabled={page === totalPages}
            onClick={() => updateFilters({ page: page + 1 })}
          >
            {t("ship.next")}
          </button>
        </nav>
      )}
    </main>
  );
}
