"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionTransition } from "../loading/session-transition";
import { LuLogOut, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { roleKey } from "../../lib/navigation";
import { useT } from "./preferences";
import { IconTile, RadiationMark, badgeFor } from "./nav-parts";

function Badge({ badge, t, on }) {
  if (!badge) return null;
  return (
    <span
      aria-label={t(badge.critical ? "shell.badgeCritical" : "shell.badge", {
        count: badge.count,
      })}
      className={`inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
        badge.critical
          ? "bg-error text-error-content"
          : on
            ? "bg-primary-content/20"
            : "bg-base-content/15"
      }`}
    >
      {badge.count}
    </span>
  );
}

const COLLAPSED_KEY = "nwts-sidebar-collapsed";

// Tablet (md) shows an icon rail; desktop (lg) shows labels and sections unless
// the person collapses it to the rail for more room (remembered on this device).
export default function Sidebar({ user, sections, active, workspaces }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* Storage may be disabled; the sidebar then starts expanded. */
    }
  }, []);
  const toggle = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch {
        /* Only this page view remembers the choice. */
      }
      return !value;
    });
  // Desktop classes apply only while expanded; collapsed keeps the tablet rail.
  const wide = (base, desktop) => (collapsed ? base : `${base} ${desktop}`);
  const { startSignOut } = useSessionTransition();
  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <nav
      aria-label={t("nav.main")}
      className={wide(
        "sticky top-0 hidden h-dvh w-20 shrink-0 flex-col gap-5 overflow-y-auto border-r border-base-content/10 bg-base-200 px-3 py-5 transition-[width] md:flex",
        "lg:w-64 lg:px-3.5",
      )}
    >
      <Link
        href="/"
        className={wide("flex items-center gap-3 px-1.5", "lg:px-2")}
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/25">
          <RadiationMark className="size-6.5" />
        </span>
        <span className={wide("hidden flex-col", "lg:flex")}>
          <span className="text-lg leading-tight font-bold tracking-wide">
            {t("app.name")}
          </span>
          <span className="text-xs leading-snug text-base-content/65">
            {t("app.fullName")}
          </span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4">
        {sections.map((section) => (
          <div key={section.key} className="flex flex-col gap-0.5">
            {section.key !== "home" && (
              <span
                className={wide(
                  "hidden px-2.5 pb-1.5 text-[11px] font-semibold tracking-widest text-base-content/55 uppercase",
                  "lg:block",
                )}
              >
                {t(`nav.section.${section.key}`)}
              </span>
            )}
            {section.items
              .filter((entry) => !entry.secondary)
              .map((entry) => {
                const on = entry.key === active;
                const badge = badgeFor(entry, workspaces);
                return (
                  <Link
                    key={entry.key}
                    href={entry.href}
                    aria-current={on ? "page" : undefined}
                    title={t(`nav.${entry.key}`)}
                    className={`${wide("operational-control relative flex min-h-11 items-center justify-center gap-3 rounded-xl px-2 py-1.5 text-sm", "lg:justify-start lg:px-2.5")} ${
                      on
                        ? "bg-primary font-semibold text-primary-content shadow-md shadow-primary/25"
                        : "font-medium text-base-content/80 hover:bg-base-content/5 hover:text-base-content"
                    }`}
                  >
                    <IconTile
                      icon={entry.icon}
                      tone={entry.tone}
                      inverse={on}
                      size="sm"
                    />
                    <span
                      className={wide("sr-only", "lg:not-sr-only lg:flex-1")}
                    >
                      {t(`nav.${entry.key}`)}
                    </span>
                    <span
                      className={wide("absolute top-0.5 right-1", "lg:static")}
                    >
                      <Badge badge={badge} t={t} on={on} />
                    </span>
                  </Link>
                );
              })}
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label={t(
          collapsed ? "shell.sidebar.expand" : "shell.sidebar.collapse",
        )}
        aria-expanded={!collapsed}
        title={t(collapsed ? "shell.sidebar.expand" : "shell.sidebar.collapse")}
        onClick={toggle}
        className={`hidden min-h-11 items-center gap-3 self-center rounded-xl px-2.5 text-sm text-base-content/65 hover:bg-base-content/5 hover:text-base-content lg:inline-flex ${collapsed ? "" : "lg:self-stretch"}`}
      >
        {collapsed ? (
          <LuPanelLeftOpen className="size-5" aria-hidden="true" />
        ) : (
          <>
            <LuPanelLeftClose className="size-5" aria-hidden="true" />
            <span>{t("shell.sidebar.collapse")}</span>
          </>
        )}
      </button>
      <div
        className={wide(
          "flex flex-col items-center gap-2 rounded-2xl border border-base-content/10 bg-base-100 p-2",
          "lg:flex-row lg:p-3",
        )}
      >
        <Link
          href="/account"
          aria-current={active === "account" ? "page" : undefined}
          title={t("nav.account")}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-tone-magenta text-sm font-semibold text-white">
            {initials}
          </span>
          <span className={wide("hidden min-w-0 flex-col", "lg:flex")}>
            <span className="truncate text-sm font-semibold">
              {user.name || user.email}
            </span>
            <span className="truncate text-xs text-base-content/65">
              {t(roleKey(user), { area: t(`area.${user.workArea}`) })}
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={t("shell.signOut")}
          title={t("shell.signOut")}
          onClick={() => startSignOut()}
          className="btn btn-square min-h-11 btn-ghost text-base-content/70"
        >
          <LuLogOut className="size-5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
