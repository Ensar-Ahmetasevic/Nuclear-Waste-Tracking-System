"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import dayjs from "dayjs";
import DataFreshness, { manualRefreshOptions } from "./data-freshness";
const labels = {
  danger: "Outside configured range",
  warning: "Warning range",
  unknown: "No reading available",
  optimal: "Within configured range",
};
export default function StorageRecords({ area, alerts = false }) {
  return (
    <Suspense fallback={<p className="p-8">Loading records…</p>}>
      <Records area={area} alerts={alerts} />
    </Suspense>
  );
}
function Records({ area, alerts }) {
  const pre = area === "pre-storage";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statuses = pre
    ? ["pending", "accepted", "rejected", "completed"]
    : ["requestPending", "transportPending", "requestRejected", "accepted"];
  const views = pre
    ? ["incoming", "measurements", "receipts", "transfers", "events"]
    : ["measurements", "receipts", "transfers", "events"];
  const view = alerts
    ? "alerts"
    : views.includes(params.get("view"))
      ? params.get("view")
      : "measurements";
  const status =
    view === "transfers" && statuses.includes(params.get("status"))
      ? params.get("status")
      : "";
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
  const location = params.get("location") || "";
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["storageRecords", area, view, page, location, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        view,
        page: String(page),
        ...(status ? { status } : {}),
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
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <header>
        <Link href={`/${area}`} className="text-sm text-base-content/60">
          ← {pre ? "Pre-storage" : "Final storage"}
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          {alerts
            ? "Conditions overview"
            : view === "incoming"
              ? "Work area tasks · Awaiting receipt"
              : view === "events"
                ? "Transfer events"
                : "Records & history"}
        </h1>
        <p className="mt-2 text-sm text-base-content/65">
          {alerts
            ? "Latest recorded reading per location, evaluated using the existing application ranges. Check the measurement time; this is not a live sensor feed."
            : view === "incoming"
              ? "Pending profiles in your work area, oldest first. Open the receiving hall to review the full quantity before confirming receipt."
              : view === "events"
                ? "Recorded requests, decisions and receipts, newest event first. Earlier actions without an event record are not reconstructed. User references identify the account that saved the action."
                : view === "receipts" && !pre
                  ? "Received transfers, newest request first. Receipt time is shown only when a saved confirmation exists; missing times are explicitly marked."
                  : "Saved records, newest first. Transfer dates show request creation, not receipt time; transfer status is the current status, not a change log."}
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        {!alerts && (
          <div className="flex flex-wrap gap-2" aria-label="Record type">
            {views.map((value) => (
              <button
                className={`btn min-h-11 btn-sm ${view === value ? "btn-primary" : "btn-outline"}`}
                key={value}
                aria-pressed={view === value}
                onClick={() => {
                  updateFilters({
                    view: value,
                    page: 1,
                    location: "",
                    status: "",
                  });
                }}
              >
                {
                  {
                    incoming: "Awaiting receipt",
                    measurements: "Measurements",
                    receipts: "Receipts",
                    transfers: "Transfers",
                    events: "Transfer events",
                  }[value]
                }
              </button>
            ))}
          </div>
        )}
        {!(pre && ["transfers", "incoming", "events"].includes(view)) && (
          <label className="flex flex-wrap items-center gap-2 text-sm whitespace-nowrap">
            Location
            <select
              className="select min-h-11 w-auto max-w-full select-sm"
              value={location}
              onChange={(event) => {
                updateFilters({ location: event.target.value, page: 1 });
              }}
            >
              <option value="">All locations</option>
              {data?.locations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {view === "transfers" && (
          <label className="flex flex-wrap items-center gap-2 text-sm whitespace-nowrap">
            Status
            <select
              className="select min-h-11 w-auto max-w-full select-sm"
              value={status}
              onChange={(event) => {
                updateFilters({ status: event.target.value, page: 1 });
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option value={value} key={value}>
                  {
                    {
                      pending: "Awaiting approval",
                      accepted: "Accepted",
                      rejected: "Rejected",
                      completed: "Completed",
                      requestPending: "Awaiting approval",
                      transportPending: "Awaiting receipt",
                      requestRejected: "Rejected",
                    }[value]
                  }
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <DataFreshness
        key={`${area}:${view}:${page}:${location}:${status}`}
        query={query}
      />
      {isLoading ? (
        <p role="status">Loading records…</p>
      ) : !data ? (
        <p>No records loaded. Use Refresh to try again.</p>
      ) : (
        <>
          <p className="text-sm" role="status">
            {data.total} {alerts ? "locations requiring review" : "records"}
          </p>
          {!data.rows.length ? (
            <p className="rounded-lg border border-base-content/20 p-6">
              {alerts
                ? data.locations.length
                  ? "No warnings in the latest recorded readings."
                  : "No locations configured."
                : "No records for this selection."}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.rows.map((row) => (
                <li
                  key={row.id}
                  className={`rounded-xl border border-l-4 border-base-content/15 bg-base-100 p-4 ${row.level === "danger" ? "border-l-red-500" : row.level === "warning" ? "border-l-amber-400" : "border-l-base-content/30"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-semibold">{row.location}</h2>
                    <span className="text-xs text-base-content/60">
                      {row.date
                        ? `${row.dateLabel ? row.dateLabel + ": " : ""}${dayjs(row.date).format("DD-MM-YYYY · HH:mm:ss")}`
                        : row.missingDateLabel || "No measurement recorded"}
                    </span>
                  </div>
                  {row.level ? (
                    <>
                      <p className="mt-2 text-sm font-medium">
                        {labels[row.level]}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {row.values.map((value) => (
                          <div key={value.key} className="text-sm">
                            <p className="text-base-content/65 capitalize">
                              {value.key}
                            </p>
                            <p>
                              {value.value} {value.unit}
                            </p>
                            <p className="text-xs">{labels[value.level]}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm">
                      {row.quantity} containers · {row.status}
                    </p>
                  )}
                  {view === "receipts" && !pre && (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>Transfer #{row.transferId}</p>
                      <p>
                        Request created:{" "}
                        {dayjs(row.requestCreatedAt).format(
                          "DD-MM-YYYY · HH:mm:ss",
                        )}
                      </p>
                      {row.confirmationId && (
                        <p>
                          Confirmation #{row.confirmationId} · User #
                          {row.actorId}
                        </p>
                      )}
                    </div>
                  )}
                  {view === "events" && (
                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        Transfer #{row.transferId} · Event #{row.id} · User #
                        {row.actorId}
                      </p>
                      {row.reason && (
                        <p className="break-words">Reason: {row.reason}</p>
                      )}
                    </div>
                  )}
                  {row.note && (
                    <p className="mt-2 text-sm text-base-content/65">
                      {row.note}
                    </p>
                  )}
                  {row.href && (
                    <Link
                      href={row.href}
                      className="btn mt-4 btn-outline btn-sm"
                    >
                      Open location →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {data.totalPages > 1 && (
            <nav
              aria-label="Record pages"
              className="flex items-center justify-center gap-3"
            >
              <button
                className="btn btn-sm"
                disabled={data.page === 1}
                onClick={() => updateFilters({ page: data.page - 1 })}
              >
                Previous
              </button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={data.page >= data.totalPages}
                onClick={() => updateFilters({ page: data.page + 1 })}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
