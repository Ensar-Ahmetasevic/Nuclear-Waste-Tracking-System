"use client";
import Link from "next/link";
import { useState } from "react";
import CapacityAndConditions from "../../components/pages/pre-storage/capacity-and-conditions/capacity-and-conditions";
import usePreStorageLocationQuery from "../../requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-location-query";
export default function StorageWorkspace() {
  const { data, isLoading, isError, refetch } = usePreStorageLocationQuery();
  const [page, setPage] = useState(1);
  const rows = [...(data || [])].sort((a, b) => b.id - a.id);
  const totalPages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, totalPages);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link className="text-sm text-base-content/60" href="/">
          ← My workspace
        </Link>
        <p className="mt-4 text-sm text-primary">Step 2</p>
        <h1 className="text-3xl font-bold">Pre-storage Entry</h1>
        <p className="mt-2 text-base-content/70">
          Choose a hall to receive containers, process transfers and record
          conditions.
        </p>
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Storage views"><Link className="btn btn-outline btn-sm" href="/pre-storage/history">Records & history</Link><Link className="btn btn-outline btn-sm" href="/pre-storage/alerts">Conditions overview</Link></nav>
      {isLoading ? (
        <p role="status">Loading halls…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load halls.{" "}
          <button className="btn btn-sm" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : rows.length ? (
        <>
          <div className="flex flex-wrap justify-center gap-6">
            {rows.slice((currentPage - 1) * 10, currentPage * 10).map((row) => (
              <div key={row.id} className="w-full min-w-0 sm:w-auto">
                <CapacityAndConditions data={row} />
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <nav
              aria-label="Location pages"
              className="flex justify-center gap-3"
            >
              <button
                className="btn"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span className="self-center">
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-base-content/15 p-6">
          No halls configured. Ask your administrator to add a location.
        </p>
      )}
    </main>
  );
}
