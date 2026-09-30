"use client";
import { useState } from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { useT } from "../../shell/preferences";
import AlertProblems, { AlertState } from "../../shared/alert-problems";
import { useAlerts } from "../../shared/use-alerts";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import Skeleton from "../../ui/skeleton";

// Alerts of every hall and room this person may see: unresolved ones (new
// first) or the resolved history.
export default function AlertInbox() {
  const t = useT();
  const format = useFormat();
  const [view, setView] = useState("open");
  const { alerts, loading, failed } = useAlerts(view);
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title={t("halert.title")} />
      <div
        role="group"
        aria-label={t("halert.title")}
        className="inline-flex gap-1 rounded-field border border-base-content/10 bg-base-200 p-1"
      >
        {["open", "resolved"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={`operational-control min-h-10 rounded-lg px-3 text-sm ${
              view === value
                ? "bg-base-100 font-semibold shadow-sm"
                : "text-base-content/70"
            }`}
          >
            {t(`halert.view.${value}`)}
          </button>
        ))}
      </div>
      {failed && (
        <p role="alert" className="rounded-box border border-error/40 bg-error/10 p-4">
          {t("common.loadError")}
        </p>
      )}
      {loading ? (
        <Skeleton className="h-40" />
      ) : !alerts.length ? (
        <EmptyState>{t(`halert.none.${view}`)}</EmptyState>
      ) : (
        <ul className="divide-y divide-base-content/10 overflow-hidden rounded-box border border-base-content/10 bg-base-100">
          {alerts.map((alert) => (
            <li key={`${alert.path}-${alert.id}`}>
              <Link
                href={`/${alert.path}/alerts/${alert.id}`}
                className={`flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-base-content/5 ${
                  !alert.readAt && !alert.resolvedAt ? "bg-error/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">{alert.locationName}</span>
                    <span className="text-xs text-base-content/65">
                      {t(`area.${alert.area}`)} ·{" "}
                      {format.dateTime(alert.resolvedAt || alert.changedAt)}
                    </span>
                  </p>
                  <AlertProblems
                    problems={alert.resolvedAt ? alert.seen : alert.problems}
                    className="text-sm"
                  />
                </div>
                <AlertState alert={alert} />
                <LuChevronRight
                  className="size-4.5 shrink-0 text-base-content/50"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
