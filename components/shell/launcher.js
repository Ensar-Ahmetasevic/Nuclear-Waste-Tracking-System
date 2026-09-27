"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSessionTransition } from "../loading/session-transition";
import { LuCompass, LuLogOut, LuSearch, LuX } from "react-icons/lu";
import { canAccess } from "../../lib/workspaces.cjs";
import { roleKey } from "../../lib/navigation";
import { useT } from "./preferences";
import { SceneImage } from "../ui/scene";
import { IconTile, TONES, badgeFor } from "./nav-parts";

// Module launcher (Ctrl K on desktop, "Menu" on phones), filtered by role.
export default function Launcher({
  open,
  onClose,
  user,
  sections,
  workspaces,
}) {
  const t = useT();
  const { startSignOut } = useSessionTransition();
  const dialog = useRef(null);
  const search = useRef(null);
  const [query, setQuery] = useState("");
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
    onClose();
  };
  const needle = query.trim().toLowerCase();
  const shipmentId =
    /^#?\d{1,9}$/.test(needle) && canAccess(user, "SHIPPING")
      ? Number(needle.replace("#", ""))
      : null;
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
              placeholder={t("launcher.search")}
              className="min-w-0 flex-1 bg-transparent text-base text-base-content outline-none"
            />
          </label>
          {shipmentId !== null && (
            <Tile
              href={`/shipping-informations/${shipmentId}`}
              title={t("launcher.openShipment", { id: shipmentId })}
              description={t("launcher.openShipment.desc")}
              icon="truck"
              tone="step-1"
              onClose={close}
            />
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
          {!visible.length && shipmentId === null && (
            <p role="status" className="py-6 text-center text-base-content/70">
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
