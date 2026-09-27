"use client";
import { useState } from "react";
import { LuRotateCcw, LuRotateCw } from "react-icons/lu";
import { useT } from "../shell/preferences";
import { useFormat } from "./format";
import Segmented from "./segmented";

// Colours of occupied slots (top face, side) per area; fixed values so the
// extruded sides can be drawn with box-shadow in both themes.
const FILL = {
  "step-2": ["#2ed3a0", "#1a7d61"],
  "step-3": ["#9d84ff", "#5b47b8"],
  "step-1": ["#2bb8f2", "#0a78b5"],
  "tone-blue": ["#5b8cff", "#2f55d4"],
  "tone-magenta": ["#e26bff", "#9a30d6"],
  "tone-teal": ["#46c8d8", "#127a8a"],
  "tone-orange": ["#ff9f43", "#c25a0a"],
};
const FRAME = {
  critical: "border-error bg-error/10",
  warning: "border-warning bg-warning/10",
  overdue: "border-warning/70 bg-base-200/60",
  default: "border-base-content/10 bg-base-200/60",
};
const MAX_CELLS = 120;

// Largest group size that keeps the plan readable: one field stands for
// `per` container slots when a hall has more than MAX_CELLS slots.
function layout(slots) {
  const per = Math.max(1, Math.ceil(slots / MAX_CELLS));
  const cells = Math.ceil(slots / per);
  const cols = Math.min(16, Math.max(5, Math.round(Math.sqrt(cells * 1.8))));
  return { per, cells, cols };
}

// Schematic plan of a hall or room: slots = surface ÷ container footprint,
// filled from the recorded stock. Positions are not recorded, so the plan does
// not claim where a container stands. 2D by default; 2.5D turns only when the
// user asks, and the global reduced-motion rules remove the transition.
export default function HallPlan({
  name,
  used,
  slots,
  tone = "step-2",
  condition,
}) {
  const t = useT();
  const format = useFormat();
  const [view, setView] = useState("flat");
  const [angle, setAngle] = useState(-40);
  if (!slots)
    return <p className="text-sm text-base-content/70">{t("plan.noSlots")}</p>;
  const { per, cells, cols } = layout(slots);
  const full = Math.floor(Math.min(used, slots) / per);
  const partial = Math.min(used, slots) % per ? 1 : 0;
  const state = (index) =>
    index < full ? "full" : index < full + partial ? "partial" : "free";
  const [top, side] = FILL[tone] || FILL["step-2"];
  const frame = FRAME[condition] || FRAME.default;
  const summary = t("plan.summary", {
    name,
    used: format.number(used),
    slots: format.number(slots),
    free: format.number(Math.max(0, slots - used)),
  });

  // 2.5D: the plane is tilted and turned; the boxes are raised along the
  // in-plane direction that points up on screen, so they stay upright.
  const size = Math.max(14, Math.min(34, Math.floor(520 / cols) - 8));
  const rad = (angle * Math.PI) / 180;
  const vx = -Math.sin(rad),
    vy = -Math.cos(rad);
  const height = Math.round(size * 0.55);
  const shadow = Array.from(
    { length: height },
    (_, k) =>
      `${(-vx * (k + 1)).toFixed(1)}px ${(-vy * (k + 1)).toFixed(1)}px 0 ${side}`,
  ).join(", ");
  const depth = (index) => {
    const col = index % cols,
      row = Math.floor(index / cols);
    return (
      Math.round(col * Math.sin(rad) * 10 + row * Math.cos(rad) * 10) + 1000
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("plan.view")}
          value={view}
          onChange={setView}
          options={[
            { value: "flat", label: t("plan.view.flat") },
            { value: "iso", label: t("plan.view.iso") },
          ]}
        />
        {view === "iso" && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={t("plan.rotateLeft")}
              title={t("plan.rotateLeft")}
              className="btn btn-square min-h-11 border-base-content/15 btn-ghost"
              onClick={() => setAngle((value) => value - 90)}
            >
              <LuRotateCcw className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t("plan.rotateRight")}
              title={t("plan.rotateRight")}
              className="btn btn-square min-h-11 border-base-content/15 btn-ghost"
              onClick={() => setAngle((value) => value + 90)}
            >
              <LuRotateCw className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <div
        role="img"
        aria-label={summary}
        className={`relative overflow-hidden rounded-box border-2 ${frame} ${view === "iso" ? "flex min-h-96 items-center justify-center py-10" : "p-4"}`}
      >
        {view === "flat" ? (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cells }, (_, index) => {
              const cell = state(index);
              return (
                <span
                  key={index}
                  className={`aspect-[1.4] rounded-[4px] ${cell === "free" ? "border-2 border-dashed border-base-content/20" : ""}`}
                  style={
                    cell === "full"
                      ? { background: top }
                      : cell === "partial"
                        ? {
                            background: `linear-gradient(to top, ${top} 50%, transparent 50%)`,
                            outline: `2px solid ${top}`,
                            outlineOffset: -2,
                          }
                        : undefined
                  }
                />
              );
            })}
          </div>
        ) : (
          <div
            className="grid rounded-xl bg-base-300/80 p-4 transition-transform duration-500"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${size}px)`,
              gap: Math.max(4, Math.round(size / 4)),
              transform: `rotateX(56deg) rotateZ(${angle}deg)`,
            }}
          >
            {Array.from({ length: cells }, (_, index) => {
              const cell = state(index);
              return cell === "free" ? (
                <span
                  key={index}
                  className="rounded-[3px] border-2 border-dashed border-base-content/25"
                  style={{ width: size, height: size }}
                />
              ) : (
                <span
                  key={index}
                  className="relative rounded-[3px] transition-[transform,box-shadow] duration-500"
                  style={{
                    width: size,
                    height: size,
                    zIndex: depth(index),
                    background: top,
                    opacity: cell === "partial" ? 0.55 : 1,
                    transform: `translate(${(vx * height).toFixed(1)}px, ${(vy * height).toFixed(1)}px)`,
                    boxShadow: shadow,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-base-content/80">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 rounded-[3px]"
            style={{ background: top }}
          />
          {t("plan.legend.used", { count: format.number(used) })}
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 rounded-[3px] border-2 border-dashed border-base-content/30"
          />
          {t("plan.legend.free", {
            count: format.number(Math.max(0, slots - used)),
          })}
        </li>
        {per > 1 && <li>{t("plan.legend.group", { count: per })}</li>}
        {condition && condition !== "clear" && (
          <li
            className={condition === "critical" ? "text-error" : "text-warning"}
          >
            {t(`plan.condition.${condition}`)}
          </li>
        )}
      </ul>
    </div>
  );
}
