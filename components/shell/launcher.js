"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionTransition } from "../loading/session-transition";
import {
  LuArrowRight,
  LuCompass,
  LuLogOut,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { canAccess } from "../../lib/workspaces.cjs";
import { newestShipments } from "../../lib/shipping-overview.cjs";
import useShippingInformationQuery from "../../requests/request-shipping-information/use-fetch-shipping-informations-query";
import { manualRefreshOptions } from "../shared/data-freshness";
import { parseScan, shipmentSearchId } from "../../lib/record-codes.cjs";
import { roleKey } from "../../lib/navigation";
import { useT } from "./preferences";
import { SceneImage } from "../ui/scene";
import { IconTile, TONES, badgeFor } from "./nav-parts";

// Search (Ctrl K and the top bar field): one field and one list of results,
// Spotlight-style, driven by the keyboard. Menu ("Menu" on phones): the same
// search above large cards of every work area. Both are filtered by role.
export default function Launcher({
  open,
  mode = "menu",
  onClose,
  user,
  sections,
  workspaces,
}) {
  const t = useT();
  const router = useRouter();
  const { startSignOut } = useSessionTransition();
  const dialog = useRef(null);
  const search = useRef(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    // showModal focuses the first control (Close); searching is the common action.
    if (open && !element.open) {
      element.showModal();
      search.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);
  const close = () => {
    setQuery("");
    setActive(0);
    onClose();
  };
  const needle = query.trim().toLowerCase();
  // The search also opens records: a label code or link typed or scanned in
  // (S-000025, P-00034) or a shipment number (#25, 25).
  const record = (() => {
    const id =
      shipmentSearchId(needle) ??
      (/^\d{1,9}$/.test(needle) ? Number(needle) : null);
    if (id)
      return { kind: "shipment", id, path: `/shipping-informations/${id}` };
    return typeof window === "undefined"
      ? null
      : parseScan(query, window.location.origin);
  })();
  const target =
    record &&
    !record.foreignHost &&
    (record.kind === "profile" || canAccess(user, "SHIPPING"))
      ? record
      : null;
  // Trucks by plates, driver or company, from any page. The list is loaded
  // only once someone types, and only for roles that see Shipments.
  const shipping = canAccess(user, "SHIPPING");
  const trucksQuery = useShippingInformationQuery({
    ...manualRefreshOptions,
    enabled: open && shipping && needle.length >= 2,
  });
  const compact = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[\s-]/g, "");
  const trucks =
    shipping && needle.length >= 2 && !target
      ? newestShipments(trucksQuery.data?.shippingData || [])
          .filter(
            (truck) =>
              [truck.companyName, truck.driverName].some((value) =>
                value?.toLowerCase().includes(needle),
              ) ||
              // Plates match with or without spaces and dashes: "23ts" finds "23 TS 5047".
              compact(truck.registrationPlates).includes(compact(needle)),
          )
          .slice(0, 6)
      : [];
  const first =
    target?.path || (trucks[0] && `/shipping-informations/${trucks[0].id}`);
  const visible = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (entry) =>
          !needle ||
          `${t(`nav.${entry.key}`)} ${t(`nav.${entry.key}.desc`)}`
            .toLowerCase()
            .includes(needle),
      ),
    }))
    .filter((section) => section.items.length);
  if (mode === "search") {
    // One flat list: the typed code, matching trucks, then pages.
    const results = [
      target && {
        key: "target",
        href: target.path,
        icon: target.kind === "profile" ? "box" : "truck",
        tone: "step-1",
        title: t(
          target.kind === "profile"
            ? "launcher.openProfile"
            : "launcher.openShipment",
          { id: target.id },
        ),
        subtitle: t(
          target.kind === "profile"
            ? "launcher.openProfile.desc"
            : "launcher.openShipment.desc",
        ),
      },
      ...trucks.map((truck) => ({
        key: `truck-${truck.id}`,
        group: "trucks",
        href: `/shipping-informations/${truck.id}`,
        icon: "truck",
        tone: "step-1",
        title: truck.companyName,
        subtitle: `${t("ship.number", { id: truck.id })} · ${truck.driverName}`,
        aside: (
          <>
            <span className="rounded bg-base-content px-1.5 font-mono text-xs font-semibold text-base-100">
              {truck.registrationPlates}
            </span>
            <span
              className={`w-8 text-right text-xs font-semibold ${truck.truckStatus === "OUT" ? "text-base-content/60" : "text-warning"}`}
            >
              {t(`ship.status.${truck.truckStatus}`)}
            </span>
          </>
        ),
      })),
      ...visible.flatMap((section) =>
        section.items.map((entry) => {
          const badge = badgeFor(entry, workspaces);
          return {
            key: entry.key,
            group: "pages",
            href: entry.href,
            icon: entry.icon,
            tone: entry.tone,
            title: t(`nav.${entry.key}`),
            subtitle: t(`nav.${entry.key}.desc`),
            aside: badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.critical ? "bg-error text-error-content" : "bg-base-content/15"}`}
              >
                {t("shell.badge", { count: badge.count })}
              </span>
            ),
          };
        }),
      ),
    ].filter(Boolean);
    const current = Math.min(active, Math.max(0, results.length - 1));
    const go = (href) => {
      close();
      router.push(href);
    };
    return (
      <dialog
        ref={dialog}
        onClose={close}
        aria-label={t("launcher.searchLabel")}
        className="mx-auto mt-[12vh] mb-auto max-h-[76dvh] w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-base-content/15 bg-base-100 p-0 text-base-content shadow-2xl backdrop:bg-black/60"
      >
        <div className="flex max-h-[76dvh] flex-col">
          <label className="flex h-16 shrink-0 items-center gap-3 border-b border-base-content/10 px-5">
            <LuSearch
              className="size-5 text-base-content/60"
              aria-hidden="true"
            />
            <span className="sr-only">{t("launcher.searchLabel")}</span>
            <input
              ref={search}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="launcher-results"
              aria-activedescendant={
                results[current]
                  ? `launcher-${results[current].key}`
                  : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              // A hand scanner types the code and presses Enter.
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (!results.length) return;
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActive((current + step + results.length) % results.length);
                }
                if (event.key === "Enter" && results[current]) {
                  event.preventDefault();
                  go(results[current].href);
                }
              }}
              placeholder={t("launcher.search")}
              className="min-w-0 flex-1 bg-transparent text-lg text-base-content outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="button"
              aria-label={t("launcher.close")}
              onClick={close}
              className="btn btn-square min-h-11 btn-ghost btn-sm"
            >
              <LuX className="size-5" aria-hidden="true" />
            </button>
          </label>
          <ul
            id="launcher-results"
            role="listbox"
            aria-label={t("launcher.searchLabel")}
            className="flex-1 overflow-y-auto p-2"
          >
            {results.map((item, index) => (
              <li key={item.key} role="presentation">
                {item.group && item.group !== results[index - 1]?.group && (
                  <p
                    aria-hidden="true"
                    className="px-3 pt-3 pb-1 text-xs font-semibold tracking-widest text-base-content/55 uppercase"
                  >
                    {t(`launcher.${item.group}`)}
                  </p>
                )}
                <Link
                  id={`launcher-${item.key}`}
                  role="option"
                  aria-selected={index === current}
                  href={item.href}
                  onClick={close}
                  onMouseMove={() => index !== current && setActive(index)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${index === current ? "bg-primary/12" : ""}`}
                >
                  <IconTile icon={item.icon} tone={item.tone} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.title}
                    </span>
                    <span className="block truncate text-sm text-base-content/65">
                      {item.subtitle}
                    </span>
                  </span>
                  {item.aside}
                  <LuArrowRight
                    className={`size-4 shrink-0 ${index === current ? "text-primary" : "invisible"}`}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
            {!results.length && !trucksQuery.isFetching && (
              <li
                role="status"
                className="py-8 text-center text-base-content/70"
              >
                {t("launcher.empty", { query })}
              </li>
            )}
          </ul>
          <div className="hidden shrink-0 items-center gap-5 border-t border-base-content/10 px-5 py-2.5 text-xs text-base-content/60 md:flex">
            {[
              ["↵", "launcher.hint.open"],
              ["↑ ↓", "launcher.hint.select"],
              ["Esc", "launcher.hint.close"],
            ].map(([key, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-base-content/20 px-1.5 py-0.5 font-mono text-[11px]">
                  {key}
                </kbd>
                {t(label)}
              </span>
            ))}
          </div>
        </div>
      </dialog>
    );
  }
  return (
    <dialog
      ref={dialog}
      onClose={close}
      aria-labelledby="launcher-title"
      className="m-auto max-h-[88dvh] w-[min(44rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border-2 border-primary bg-base-100 p-0 text-base-content shadow-2xl shadow-primary/10 backdrop:bg-black/60 max-md:mb-0 max-md:w-full max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center gap-3.5 border-b border-base-content/10 px-5 py-4 sm:px-6">
          <span className="inline-flex size-11 items-center justify-center rounded-xl border border-base-content/15 bg-base-200 text-primary">
            <LuCompass className="size-5.5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 id="launcher-title" className="text-xl font-semibold">
              {t("launcher.title")}
            </h2>
            <p className="text-sm text-base-content/70">
              {t("launcher.subtitle")}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("launcher.close")}
            onClick={close}
            className="btn btn-square min-h-11 btn-ghost"
          >
            <LuX className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4 sm:px-6">
          <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-base-content/15 bg-base-200 px-3.5 text-base-content/65 focus-within:border-primary">
            <LuSearch className="size-4.5" aria-hidden="true" />
            <span className="sr-only">{t("launcher.searchLabel")}</span>
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // A hand scanner types the code and presses Enter.
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !first) return;
                event.preventDefault();
                close();
                router.push(first);
              }}
              placeholder={t("launcher.search")}
              className="min-w-0 flex-1 bg-transparent text-base text-base-content outline-none"
            />
          </label>
          {target && (
            <Tile
              href={target.path}
              title={t(
                target.kind === "profile"
                  ? "launcher.openProfile"
                  : "launcher.openShipment",
                { id: target.id },
              )}
              description={t(
                target.kind === "profile"
                  ? "launcher.openProfile.desc"
                  : "launcher.openShipment.desc",
              )}
              icon={target.kind === "profile" ? "box" : "truck"}
              tone="step-1"
              onClose={close}
            />
          )}
          {trucks.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-widest text-base-content/60 uppercase">
                {t("launcher.trucks")}
              </h3>
              <ul className="divide-y divide-base-content/10 rounded-2xl border border-base-content/10">
                {trucks.map((truck) => (
                  <li key={truck.id}>
                    <Link
                      href={`/shipping-informations/${truck.id}`}
                      onClick={close}
                      className="operational-control flex items-center gap-3 px-4 py-3 hover:bg-base-200"
                    >
                      <IconTile icon="truck" tone="step-1" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {truck.companyName}
                        </span>
                        <span className="block truncate text-sm text-base-content/70">
                          {t("ship.number", { id: truck.id })} ·{" "}
                          {truck.driverName}
                        </span>
                      </span>
                      <span className="rounded bg-base-content px-1.5 font-mono text-xs font-semibold text-base-100">
                        {truck.registrationPlates}
                      </span>
                      <span
                        className={`text-xs font-semibold ${truck.truckStatus === "OUT" ? "text-base-content/60" : "text-warning"}`}
                      >
                        {t(`ship.status.${truck.truckStatus}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {visible.map((section) => (
            <section key={section.key} className="flex flex-col gap-3">
              {section.key !== "home" && (
                <h3 className="text-xs font-semibold tracking-widest text-base-content/60 uppercase">
                  {t(`nav.section.${section.key}`)}
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {section.items.map((entry) => (
                  <Tile
                    key={entry.key}
                    href={entry.href}
                    title={t(`nav.${entry.key}`)}
                    description={t(`nav.${entry.key}.desc`)}
                    icon={entry.icon}
                    tone={entry.tone}
                    scene={entry.scene}
                    badge={badgeFor(entry, workspaces)}
                    onClose={close}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ))}
          {!visible.length &&
            !target &&
            !trucks.length &&
            !trucksQuery.isFetching && (
              <p
                role="status"
                className="py-6 text-center text-base-content/70"
              >
                {t("launcher.empty", { query })}
              </p>
            )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-content/10 px-5 py-3 text-sm text-base-content/70 sm:px-6">
          <span>
            {t("launcher.footer", {
              role: t(roleKey(user), { area: t(`area.${user.workArea}`) }),
            })}
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            {t("launcher.shortcut")}
            <kbd className="rounded-md border border-base-content/20 px-1.5 py-0.5 font-mono text-[11px]">
              Ctrl K
            </kbd>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              startSignOut();
            }}
            className="btn min-h-11 btn-ghost btn-sm md:hidden"
          >
            <LuLogOut className="size-4.5" aria-hidden="true" />
            {t("shell.signOut")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Tile({
  href,
  title,
  description,
  icon,
  tone,
  scene,
  badge,
  onClose,
  t,
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`operational-control relative flex min-h-28 flex-col gap-3 overflow-hidden rounded-2xl border bg-base-200/60 p-4 hover:bg-base-200 ${(TONES[tone] || TONES.primary).edge}`}
    >
      {scene && (
        <span
          data-theme="nwts-dark"
          className="relative -mx-4 -mt-4 block h-24 bg-base-300"
        >
          <SceneImage scene={scene} sizes="(min-width: 640px) 320px, 100vw" />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-base-300/70 to-transparent"
          />
        </span>
      )}
      <span className="flex items-center gap-3.5 pr-14">
        <IconTile icon={icon} tone={tone} solid size="lg" />
        <span className="text-lg font-semibold">{title}</span>
      </span>
      <span className="text-sm leading-snug text-base-content/70">
        {description}
      </span>
      {badge && (
        <span
          aria-label={t(
            badge.critical ? "shell.badgeCritical" : "shell.badge",
            { count: badge.count },
          )}
          className={`absolute top-4 right-4 z-10 rounded-full px-2 py-0.5 text-xs font-semibold ${
            badge.critical
              ? "bg-error text-error-content"
              : "bg-base-content/15"
          }`}
        >
          {t("shell.badge", { count: badge.count })}
        </span>
      )}
    </Link>
  );
}
