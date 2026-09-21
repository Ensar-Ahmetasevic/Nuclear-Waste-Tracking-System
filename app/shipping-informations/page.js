"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import dayjs from "dayjs";
import AllShippingData from "../../components/pages/shipping-informations/all-shipping-data";
import useShippingInformationQuery from "../../requests/request-shipping-information/use-fetch-shipping-informations-query";
import LoadingSpinnerPage from "../../components/shared/loading-spiner-page";
import DataFreshness, {
  manualRefreshOptions,
} from "../../components/shared/data-freshness";
import {
  shipmentGroup,
  newestShipments,
} from "../../lib/shipping-overview.cjs";

const views = [
  { id: "all", label: "All shipments", hint: "Arrival and departure records" },
  {
    id: "missing",
    label: "IN · Content missing",
    hint: "No Container Profile recorded",
  },
  {
    id: "recorded",
    label: "IN · Content recorded",
    hint: "Container Profiles added",
  },
  {
    id: "out",
    label: "OUT · Departed",
    hint: "Trucks that have left the site",
  },
];

export default function ShippingInformations() {
  return (
    <Suspense fallback={<p className="p-8">Loading shipments…</p>}>
      <ShippingList />
    </Suspense>
  );
}

function ShippingList() {
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
      <div className="flex min-h-96 items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="mb-4 text-3xl font-bold">Shipping information</h1>
        <DataFreshness query={queryState} />
      </main>
    );

  const trucks = newestShipments(data.shippingData || []);
  const counts = { all: trucks.length, missing: 0, recorded: 0, out: 0 };
  trucks.forEach((truck) => {
    counts[shipmentGroup(truck)]++;
  });
  const query = searchQuery.trim().toLowerCase();
  const filtered = trucks.filter((truck) => {
    if (view !== "all" && shipmentGroup(truck) !== view) return false;
    const date = dayjs(truck.entryDateTime);
    // Only numeric D/M/Y shortcuts are dates; company names remain searchable.
    if (/^d\d{1,2}$/.test(query)) return date.date() === Number(query.slice(1));
    if (/^m\d{1,2}$/.test(query))
      return date.month() + 1 === Number(query.slice(1));
    if (/^y\d{4}$/.test(query)) return date.year() === Number(query.slice(1));
    return [
      truck.companyName,
      truck.driverName,
      truck.registrationPlates,
      String(truck.id),
      truck.truckStatus,
      date.format("DD-MM-YYYY"),
      date.format("YYYY-MM-DD"),
    ].some((value) => value?.toLowerCase().includes(query));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const page = Math.min(currentPage, totalPages);
  const items = filtered.slice((page - 1) * 10, page * 10);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Step 1 · Arrivals</p>
        <h1 className="mt-1 text-3xl font-bold">Shipping information</h1>
        <p className="mt-2 text-sm text-base-content/70">
          Track trucks on site, identify missing content and review departures.
        </p>
      </header>
      <DataFreshness query={queryState} />
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Filter shipments by progress"
      >
        {views.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => {
              updateFilters({ view: option.id, page: 1 });
            }}
            className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${view === option.id ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500" : "border-base-content/15 bg-base-100 hover:border-primary/60"}`}
          >
            <span
              className={`block text-sm font-semibold ${option.id === "missing" ? "text-amber-400" : ""}`}
            >
              {option.label}
              {view === option.id && (
                <span className="ml-2" aria-hidden="true">
                  ✓
                </span>
              )}
            </span>
            <span className="my-1 block text-3xl font-bold">
              {counts[option.id]}
            </span>
            <span className="block text-xs text-base-content/65">
              {option.hint}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-base-content/15 bg-base-100 p-4">
        <label
          htmlFor="searchShippings"
          className="mb-2 block text-sm font-semibold"
        >
          Search shipments
        </label>
        <input
          id="searchShippings"
          type="search"
          className="input-bordered input w-full"
          placeholder="Company, driver, plates, ID or date"
          value={searchQuery}
          onChange={(event) => {
            updateFilters({ search: event.target.value, page: 1 });
          }}
        />
        <p className="mt-2 text-xs text-base-content/60">
          Date: DD-MM-YYYY · Shortcuts: D11, M09, Y2026
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p role="status">
          {filtered.length} shipments ·{" "}
          {views.find((option) => option.id === view).label}
        </p>
        <p className="text-base-content/60">Newest entries first</p>
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
        <div className="rounded-xl border border-dashed border-base-content/25 p-8 text-center">
          <p className="font-semibold">No shipments in this view</p>
          <p className="mt-2 text-sm text-base-content/65">
            Choose another status or clear your search.
          </p>
          <button
            className="btn mt-3 btn-ghost"
            onClick={() => {
              updateFilters({ view: "all", search: "", page: 1 });
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      {totalPages > 1 && (
        <nav
          aria-label="Shipment pages"
          className="flex items-center justify-center gap-4"
        >
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => updateFilters({ page: page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn"
            disabled={page === totalPages}
            onClick={() => updateFilters({ page: page + 1 })}
          >
            Next
          </button>
        </nav>
      )}
    </main>
  );
}
