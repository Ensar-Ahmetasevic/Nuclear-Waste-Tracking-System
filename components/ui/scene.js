"use client";
import Image from "next/image";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { useT } from "../shell/preferences";

// Photographic scenes of the site, in public/scenes. None carries text, so the
// labels on top of them follow the interface language.
export const SCENES = {
  flow: { src: "/scenes/flow.webp", width: 2172, height: 724 },
  gate: { src: "/scenes/gate.webp", width: 1672, height: 941 },
  scan: { src: "/scenes/scan-wide.webp", width: 1672, height: 941 },
  hall: { src: "/scenes/hall-wide.webp", width: 1672, height: 941 },
  worker: { src: "/scenes/worker.webp", width: 540, height: 640 },
  transfer: { src: "/scenes/transfer.webp", width: 1012, height: 941 },
  alarm: { src: "/scenes/alarm-v2.webp", width: 852, height: 392 },
  arrival: { src: "/scenes/stage-arrival.webp", width: 800, height: 510 },
  preStorage: {
    src: "/scenes/stage-pre-storage.webp",
    width: 800,
    height: 489,
  },
  finalStorage: {
    src: "/scenes/stage-final-storage.webp",
    width: 800,
    height: 550,
  },
};

// Accent of a scene header; stays light because the header is always dark.
const ACCENTS = {
  error: { text: "text-error", bar: "bg-error" },
  warning: { text: "text-warning", bar: "bg-warning" },
  primary: { text: "text-primary", bar: "bg-primary" },
  "step-1": { text: "text-step-1", bar: "bg-step-1" },
  "step-2": { text: "text-step-2", bar: "bg-step-2" },
  "step-3": { text: "text-step-3", bar: "bg-step-3" },
  "tone-blue": { text: "text-tone-blue", bar: "bg-tone-blue" },
  "tone-magenta": { text: "text-tone-magenta", bar: "bg-tone-magenta" },
  "tone-teal": { text: "text-tone-teal", bar: "bg-tone-teal" },
  "tone-orange": { text: "text-tone-orange", bar: "bg-tone-orange" },
  neutral: { text: "text-base-content/70", bar: "bg-base-content/30" },
};
export const sceneAccent = (tone) => ACCENTS[tone] || ACCENTS.neutral;

// Fills its positioned parent. `preload` for the first image on a page.
export function SceneImage({
  scene,
  sizes = "100vw",
  position = "center",
  preload = false,
  className = "",
}) {
  const t = useT();
  const image = SCENES[scene];
  return (
    <Image
      src={image.src}
      alt={t(`scene.alt.${scene}`)}
      fill
      sizes={sizes}
      preload={preload}
      className={`object-cover ${className}`}
      style={{ objectPosition: position }}
    />
  );
}

// Page header on a photo. Always rendered in the dark theme so text, buttons
// and chips on the image keep their contrast in both themes.
export default function SceneHeader({
  scene,
  tone = "neutral",
  position,
  eyebrow,
  title,
  description,
  actions,
  children,
  footer,
  top = false,
  preload = true,
}) {
  const accent = sceneAccent(tone);
  return (
    <header
      data-theme="nwts-dark"
      className="relative isolate overflow-hidden rounded-box border border-base-content/10 bg-base-300 text-base-content"
    >
      <SceneImage
        scene={scene}
        position={position}
        preload={preload}
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="-z-20"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-base-300 via-base-300/80 to-base-300/20 sm:bg-linear-to-r sm:from-base-300/95 sm:via-base-300/75 sm:to-base-300/30"
      />
      {/* With a footer (or `top`) the title sits at the top of the photo. */}
      <div
        className={`flex min-h-56 flex-col gap-5 p-5 sm:min-h-64 sm:p-8 ${footer ? "justify-between" : top ? "justify-start" : "justify-end"}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl min-w-0 space-y-2">
            {eyebrow && (
              <p
                className={`font-mono text-xs font-semibold tracking-widest uppercase ${accent.text}`}
              >
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="text-base-content/80 sm:text-lg">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 [&_.btn-ghost]:bg-base-300/75 [&_.btn-ghost]:backdrop-blur">
              {actions}
            </div>
          )}
        </div>
        {children}
        {footer && (
          <div className="self-start rounded-xl bg-base-300/75 px-3 backdrop-blur">
            {footer}
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-1 ${accent.bar}`}
      />
    </header>
  );
}

// Figures on a scene header.
export function SceneStats({ label, children }) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap"
    >
      {children}
    </ul>
  );
}

export function SceneStat({ label, value, note, tone, href }) {
  const body = (
    <>
      <span className="text-xs text-base-content/75">{label}</span>
      <span
        className={`font-mono text-2xl font-semibold tabular-nums ${tone ? sceneAccent(tone).text : ""}`}
      >
        {value}
      </span>
      {note && <span className="text-xs text-base-content/70">{note}</span>}
    </>
  );
  const className =
    "flex h-full min-w-36 flex-col gap-0.5 rounded-xl border border-base-content/10 bg-base-300/75 px-4 py-3 backdrop-blur";
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className={`${className} operational-control hover:border-base-content/35`}
        >
          {body}
        </Link>
      ) : (
        <span className={className}>{body}</span>
      )}
    </li>
  );
}

// "Open" link used on scene chips.
export function SceneArrow() {
  return <LuArrowRight className="size-4 shrink-0" aria-hidden="true" />;
}
