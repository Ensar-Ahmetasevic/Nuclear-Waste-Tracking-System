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
import EmptyState from "../../components/ui/empty-state";
import {
  shipmentGroup,
  newestShipments,
} from "../../lib/shipping-overview.cjs";
import { shipmentSearchId } from "../../lib/record-codes.cjs";

// Filter chips; labels come from the interface language. `alert` marks the
// ones whose count needs someone.
const views = [
  { id: "all" },
  { id: "missing", alert: "text-warning" },
  { id: "recorded" },
  { id: "out" },
  { id: "returned", alert: "text-error" },
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
  if (isLoading) return <PageLoader />;
  const header = (freshness) => (
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
      footer={freshness}
    />
  );
  if (!data)
    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header(<DataFreshness query={queryState} />)}
      </main>
    );

  const trucks = newestShipments(data.shippingData || []);
  const counts = {
    all: trucks.length,
    missing: 0,
    recorded: 0,
    out: 0,
    returned: 0,
  };
  trucks.forEach((truck) => {
    counts[shipmentGroup(truck)]++;
    // Returned from Pre-storage, at Step 1 or waiting for Supervision; overlaps "recorded".
    if (truck.returnState) counts.returned++;
  });
  const query = searchQuery.trim().toLowerCase();
  // A shipment code (S-000025, NWTS-S-25, #25 …) finds exactly that shipment.
  const codeId = shipmentSearchId(query);
  const filtered = trucks.filter((truck) => {
    if (
      view === "returned"
        ? !truck.returnState
        : view !== "all" && shipmentGroup(truck) !== view
    )
      return false;
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
      {header(<DataFreshness query={queryState} />)}
      <div className="space-y-3 rounded-box border border-base-content/10 bg-base-100 p-4">
        <label htmlFor="searchShippings" className="sr-only">
          {t("ship.search")}
        </label>
        <input
          id="searchShippings"
          type="search"
          className="input w-full border-primary/50 bg-base-200 focus:border-primary"
          placeholder={t("ship.search.placeholder")}
          value={searchQuery}
          onChange={(event) => {
            updateFilters({ search: event.target.value, page: 1 });
          }}
        />
        <div
          role="group"
          className="flex flex-wrap gap-2"
          aria-label={t("ship.filterLabel")}
        >
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              title={t(`ship.view.${option.id}.hint`)}
              onClick={() => {
                updateFilters({ view: option.id, page: 1 });
              }}
              className={`btn min-h-11 rounded-full btn-sm ${
                view === option.id
                  ? "btn-primary"
                  : "border-base-content/15 btn-ghost"
              }`}
            >
              {t(`ship.view.${option.id}`)}
              <span
                className={`font-mono tabular-nums ${
                  view !== option.id && option.alert && counts[option.id]
                    ? option.alert
                    : "opacity-70"
                }`}
              >
                {counts[option.id]}
              </span>
            </button>
          ))}
        </div>
        <p role="status" className="sr-only">
          {t("ship.count", { count: filtered.length, view: viewLabel })}
        </p>
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
