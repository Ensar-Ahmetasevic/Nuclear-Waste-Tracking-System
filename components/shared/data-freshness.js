"use client";
import { useEffect, useState } from "react";

// A browser connection signal does not prove that the API is available.
export const manualRefreshOptions = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
};

export default function DataFreshness({ query }) {
  const [offline, setOffline] = useState(false);
  const [checkNeeded, setCheckNeeded] = useState(false);
  useEffect(() => {
    const connection = () => {
      setOffline(!navigator.onLine);
      setCheckNeeded(true);
    };
    const visible = () => {
      if (document.visibilityState === "visible") setCheckNeeded(true);
    };
    setOffline(!navigator.onLine);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  async function refresh() {
    const result = await query.refetch();
    if (!result.isError) setCheckNeeded(false);
  }
  return (
    <section
      aria-label="Data freshness"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-content/20 p-3 text-sm"
    >
      <div>
        <p>
          {query.dataUpdatedAt ? (
            <>
              Last successful refresh:{" "}
              <time dateTime={new Date(query.dataUpdatedAt).toISOString()}>
                {new Date(query.dataUpdatedAt).toLocaleString()}
              </time>
            </>
          ) : (
            "No successful refresh yet."
          )}
        </p>
        <p role="status" className="mt-1 text-base-content/70">
          {offline
            ? "Browser reports offline. Displayed data may be outdated."
            : query.isError
              ? "The server could not be reached or returned an error. Previously loaded data may be outdated."
              : query.isFetching
                ? "Refreshing data…"
                : checkNeeded
                  ? "Refresh to check for changes since you last viewed this page."
                  : "Use Refresh to check for updates. This is not a live feed."}
        </p>
      </div>
      <button
        type="button"
        className="operational-control btn min-h-11 btn-outline btn-sm"
        disabled={query.isFetching || offline}
        onClick={refresh}
      >
        {query.isFetching ? "Refreshing…" : "Refresh"}
      </button>
    </section>
  );
}
