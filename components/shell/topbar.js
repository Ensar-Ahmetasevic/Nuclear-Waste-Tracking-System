"use client";
import Link from "next/link";
import { LuBell, LuMoon, LuPlus, LuSearch, LuSun } from "react-icons/lu";
import { usePreferences } from "./preferences";
import { RadiationMark } from "./nav-parts";

export default function Topbar({ alerts, onOpenLauncher, onRecordArrival }) {
  const { t, locale, theme, setLocale, setTheme } = usePreferences();
  const dark = theme === "nwts-dark";
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-base-content/10 bg-base-300/85 px-4 backdrop-blur sm:gap-3 md:h-18 md:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2.5 md:hidden">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-content">
          <RadiationMark className="size-6" />
        </span>
        <span className="font-bold tracking-wide">{t("app.name")}</span>
      </Link>
      <button
        type="button"
        onClick={onOpenLauncher}
        className="operational-control hidden h-11 w-full max-w-md items-center gap-3 rounded-field border border-base-content/10 bg-base-100 px-3.5 text-left text-sm text-base-content/65 hover:border-base-content/25 md:flex"
      >
        <LuSearch className="size-4.5" aria-hidden="true" />
        <span className="flex-1">{t("shell.search")}</span>
        <kbd className="rounded-md border border-base-content/20 px-1.5 py-0.5 font-mono text-[11px]">
          Ctrl K
        </kbd>
      </button>
      <div className="flex-1" />
      <label className="sr-only" htmlFor="shell-language">
        {t("shell.language")}
      </label>
      <select
        id="shell-language"
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="select h-11 w-auto min-w-0 border-base-content/10 bg-base-100 pr-8 text-sm font-medium"
      >
        <option value="en">EN</option>
        <option value="de">DE</option>
      </select>
      <button
        type="button"
        aria-label={t(dark ? "shell.themeToLight" : "shell.themeToDark")}
        title={t(dark ? "shell.themeToLight" : "shell.themeToDark")}
        onClick={() => setTheme(dark ? "nwts-light" : "nwts-dark")}
        className="btn btn-square min-h-11 border-base-content/10 bg-base-100 text-base-content/80"
      >
        {dark ? (
          <LuSun className="size-5" aria-hidden="true" />
        ) : (
          <LuMoon className="size-5" aria-hidden="true" />
        )}
      </button>
      {alerts?.href && (
        <Link
          href={alerts.href}
          aria-label={t(alerts.open ? "shell.alertsOpen" : "shell.alertsNone", {
            count: alerts.open,
          })}
          title={t(alerts.open ? "shell.alertsOpen" : "shell.alertsNone", {
            count: alerts.open,
          })}
          className="btn relative btn-square min-h-11 border-base-content/10 bg-base-100 text-base-content/80"
        >
          <LuBell className="size-5" aria-hidden="true" />
          {alerts.open > 0 && (
            <span
              aria-hidden="true"
              className={`absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                alerts.critical
                  ? "bg-error text-error-content"
                  : "bg-warning text-warning-content"
              }`}
            >
              {alerts.open}
            </span>
          )}
        </Link>
      )}
      {onRecordArrival && (
        <button
          type="button"
          onClick={onRecordArrival}
          aria-label={t("shell.recordArrival")}
          className="btn min-h-11 btn-primary max-sm:btn-square sm:px-4"
        >
          <LuPlus className="size-5" aria-hidden="true" />
          <span className="max-sm:hidden">{t("shell.recordArrival")}</span>
        </button>
      )}
    </header>
  );
}
