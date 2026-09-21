"use client";
import Link from "next/link";
import { useState } from "react";
import FinalStorageCapacityAndConditions from "../../components/pages/final-storage/setup/capacity-and-conditions/final-storage-capacity-and-conditions";
import useFinalStorageLocationQuery from "../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-location-query";
export default function StorageWorkspace() {
  const { data, isLoading, isError, refetch } = useFinalStorageLocationQuery();
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
        <p className="mt-4 text-sm text-primary">Step 3</p>
        <h1 className="text-3xl font-bold">Final Storage Entry</h1>
        <p className="mt-2 text-base-content/70">
          Choose a room to request transfers, confirm receipt and record
          conditions.
        </p>
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Storage views"><Link className="btn btn-outline btn-sm" href="/final-storage/history">Records & history</Link><Link className="btn btn-outline btn-sm" href="/final-storage/alerts">Conditions overview</Link></nav>
      {isLoading ? (
        <p role="status">Loading rooms…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load rooms.{" "}
          <button className="btn btn-sm" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : rows.length ? (
        <>
          <div className="flex flex-wrap justify-center gap-6">
            {rows.slice((currentPage - 1) * 10, currentPage * 10).map((row) => (
              <div key={row.id} className="w-full min-w-0 sm:w-auto">
                <FinalStorageCapacityAndConditions data={row} />
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
          No rooms configured. Ask your administrator to add a location.
        </p>
      )}
    </main>
  );
}
