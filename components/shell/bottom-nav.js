"use client";
import Link from "next/link";
import { LuMenu } from "react-icons/lu";
import { useT } from "./preferences";
import { ICONS, badgeFor } from "./nav-parts";

// Phones: home, the step areas the user may open, and the full menu.
export default function BottomNav({
  sections,
  active,
  workspaces,
  onOpenLauncher,
}) {
  const t = useT();
  const home = sections.find((section) => section.key === "home")?.items[0];
  const steps =
    sections
      .find((section) => section.key === "operations")
      ?.items.filter((entry) => entry.step) || [];
  const tabs = [home, ...steps].filter(Boolean);
  const menuActive =
    Boolean(active) && !tabs.some((entry) => entry.key === active);
  const tabClass = (on) =>
    `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
      on ? "text-base-content" : "text-base-content/65"
    }`;
  const pill = (on) =>
    `inline-flex h-7.5 w-12 items-center justify-center rounded-full ${on ? "bg-primary/20 text-primary" : ""}`;
  return (
    <nav
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-base-content/10 bg-base-200/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((entry) => {
        const Icon = ICONS[entry.icon];
        const on = entry.key === active;
        const badge = badgeFor(entry, workspaces);
        return (
          <Link
            key={entry.key}
            href={entry.href}
            aria-current={on ? "page" : undefined}
            className={tabClass(on)}
          >
            <span className={pill(on)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {entry.key === "overview" || entry.key === "workspace"
              ? t("nav.home")
              : t(`nav.${entry.key}`)}
            {badge && (
              <span
                aria-label={t(
                  badge.critical ? "shell.badgeCritical" : "shell.badge",
                  { count: badge.count },
                )}
                className="absolute top-1.5 left-[calc(50%+8px)] inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-error-content"
              >
                {badge.count}
              </span>
            )}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenLauncher}
        aria-current={menuActive ? "page" : undefined}
        className={tabClass(menuActive)}
      >
        <span className={pill(menuActive)}>
          <LuMenu className="size-5" aria-hidden="true" />
        </span>
        {t("nav.menu")}
      </button>
    </nav>
  );
}
