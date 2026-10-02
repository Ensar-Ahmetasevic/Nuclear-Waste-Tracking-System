"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LuArrowRight, LuBell, LuCheck, LuCircleCheck } from "react-icons/lu";
import { manages } from "../../lib/workspaces.cjs";
import AlertProblems, { AlertState } from "../shared/alert-problems";
import { useAlerts, useMarkRead } from "../shared/use-alerts";
import { useFormat } from "../ui/format";
import Skeleton from "../ui/skeleton";
import { useT } from "./preferences";

const SHOWN = 5;

// Bell with a small panel: the open hall alerts (new first) with what is wrong,
// a link to each, marking one read for Supervision, and the way to all alerts.
export default function AlertBell({ alerts: counts }) {
  const t = useT();
  const format = useFormat();
  const path = usePathname();
  const { data: session } = useSession();
  const manager = manages(session?.user);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(null);
  const box = useRef(null);
  const { alerts, loading, failed } = useAlerts("open", { enabled: open });
  const markRead = useMarkRead();
  const unread = alerts.filter((alert) => !alert.readAt).length;
  const label = t(counts.open ? "shell.alertsOpen" : "shell.alertsNone", {
    count: counts.open,
  });

  // Closes on navigation, a click outside and Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={`btn relative btn-square min-h-11 border-base-content/10 text-base-content/80 ${open ? "bg-base-200" : "bg-base-100"}`}
      >
        <LuBell className="size-5" aria-hidden="true" />
        {counts.open > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
              counts.critical
                ? "bg-error text-error-content"
                : "bg-warning text-warning-content"
            }`}
          >
            {counts.open}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("halert.title")}
          className="nwts-grid absolute top-full right-0 z-40 mt-2 w-96 overflow-hidden rounded-box border border-base-content/15 bg-base-100 shadow-2xl max-sm:fixed max-sm:inset-x-4 max-sm:top-18 max-sm:w-auto"
        >
          <div className="flex items-center justify-between gap-3 border-b border-base-content/10 px-4 py-3">
            <p className="font-semibold">{t("halert.title")}</p>
            {alerts.length > 0 && (
              <p className="text-xs text-base-content/65">
                {t("halert.panel.summary", {
                  open: alerts.length,
                  unread,
                })}
              </p>
            )}
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : failed && !alerts.length ? (
            <p role="alert" className="p-4 text-sm text-error">
              {t("common.loadError")}
            </p>
          ) : !alerts.length ? (
            <p className="flex items-center gap-2 p-4 text-sm text-success">
              <LuCircleCheck className="size-5" aria-hidden="true" />
              {t("halert.none.open")}
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-base-content/10 overflow-y-auto">
              {alerts.slice(0, SHOWN).map((alert) => (
                <li
                  key={`${alert.path}-${alert.id}`}
                  className={`flex items-start gap-2 px-4 py-3 ${!alert.readAt ? "bg-error/5" : ""}`}
                >
                  <Link
                    href={`/${alert.path}/alerts/${alert.id}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1 space-y-1 hover:underline-offset-2 [&:hover_.hall]:underline"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="hall font-semibold">
                        {alert.locationName}
                      </span>
                      <AlertState alert={alert} />
                    </span>
                    <AlertProblems
                      problems={alert.problems}
                      className="text-sm"
                    />
                    <span className="block text-xs text-base-content/60">
                      {t(`area.${alert.area}`)} · {format.age(alert.changedAt)}
                    </span>
                  </Link>
                  {manager && !alert.readAt && (
                    <button
                      type="button"
                      className="btn btn-square min-h-11 btn-ghost btn-sm text-base-content/70"
                      aria-label={t("halert.markReadFor", {
                        name: alert.locationName,
                      })}
                      title={t("halert.markRead")}
                      disabled={marking === alert.id}
                      onClick={async () => {
                        setMarking(alert.id);
                        await markRead(alert);
                        setMarking(null);
                      }}
                    >
                      <LuCheck className="size-4.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="flex min-h-12 items-center justify-between gap-2 border-t border-base-content/10 px-4 text-sm font-medium text-primary hover:bg-base-content/5"
          >
            {alerts.length > SHOWN
              ? t("halert.panel.more", { count: alerts.length - SHOWN })
              : t("halert.panel.all")}
            <LuArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
