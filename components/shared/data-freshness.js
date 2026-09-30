"use client";
import { useEffect, useState } from "react";
import { LuRefreshCw } from "react-icons/lu";
import { useT } from "../shell/preferences";
import { useFormat } from "../ui/format";

// A browser connection signal does not prove that the API is available.
export const manualRefreshOptions = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
};

// One quiet line (dot, time, refresh icon) on every page; problems stay visible.
export default function DataFreshness({ query, autoRefreshMs }) {
  const t = useT();
  const format = useFormat();
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
  const problem = offline || query.isError;
  const dot = problem
    ? "bg-error"
    : checkNeeded && !autoRefreshMs
      ? "bg-warning"
      : "bg-success";
  const status = offline
    ? t("fresh.offline")
    : query.isError
      ? t("fresh.error")
      : query.isFetching
        ? t("fresh.fetching")
        : autoRefreshMs
          ? t("fresh.auto", { seconds: Math.round(autoRefreshMs / 1000) })
          : checkNeeded
            ? t("fresh.check")
            : t("fresh.manual");
  return (
    <section
      aria-label={t("fresh.label")}
      className="flex items-center gap-2 text-sm text-base-content/70"
      title={status}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${dot}`}
      />
      {query.dataUpdatedAt ? (
        <time dateTime={new Date(query.dataUpdatedAt).toISOString()}>
          {t("fresh.last", { time: format.dateTime(query.dataUpdatedAt) })}
        </time>
      ) : (
        t("fresh.none")
      )}
      <span role="status" className={problem ? "text-error" : "sr-only"}>
        {status}
      </span>
      <button
        type="button"
        aria-label={
          query.isFetching ? t("fresh.refreshing") : t("fresh.refresh")
        }
        title={t("fresh.refresh")}
        className="operational-control btn btn-square min-h-11 btn-ghost btn-sm"
        disabled={query.isFetching || offline}
        onClick={refresh}
      >
        <LuRefreshCw
          className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}
