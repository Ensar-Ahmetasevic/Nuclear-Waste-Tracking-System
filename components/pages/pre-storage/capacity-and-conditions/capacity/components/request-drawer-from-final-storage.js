"use client";
import { useState } from "react";
import RequestFromFinalStorage from "./inner-components/request-from-final-storage";
export default function RequestDrawerFromFinalStorage({
  hasPendingContainersFromFinalStorage,
  requestData,
}) {
  const [selectedPage, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(requestData.length / 10));
  const page = Math.min(selectedPage, pages);
  if (!hasPendingContainersFromFinalStorage) return null;
  return (
    <section className="my-4 rounded-xl border border-base-content/20 p-4">
      <h2 className="text-lg font-semibold">
        Work area tasks · Transfer requests
      </h2>
      <p className="mt-1 text-sm text-base-content/70">
        Review requests from final storage. Oldest requests first.
      </p>
      {[...requestData]
        .sort((a, b) => a.id - b.id)
        .slice((page - 1) * 10, page * 10)
        .map((request) => (
          <RequestFromFinalStorage key={request.id} requestData={request} />
        ))}
      {pages > 1 && (
        <nav
          aria-label="Transfer request pages"
          className="flex items-center gap-3"
        >
          <button
            className="btn min-h-11"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="btn min-h-11"
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
