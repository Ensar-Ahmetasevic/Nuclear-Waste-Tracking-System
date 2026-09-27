"use client";
import {
  LuArrowRightLeft,
  LuBox,
  LuChartColumn,
  LuClipboardCheck,
  LuClock,
  LuDroplet,
  LuGauge,
  LuLayers,
  LuLayoutGrid,
  LuRadiation,
  LuScanLine,
  LuSettings,
  LuSlidersHorizontal,
  LuThermometer,
  LuTriangleAlert,
  LuTruck,
  LuUser,
  LuUsers,
  LuWarehouse,
} from "react-icons/lu";

export const ICONS = {
  grid: LuLayoutGrid,
  truck: LuTruck,
  warehouse: LuWarehouse,
  layers: LuLayers,
  alert: LuTriangleAlert,
  sliders: LuSlidersHorizontal,
  settings: LuSettings,
  clipboard: LuClipboardCheck,
  users: LuUsers,
  chart: LuChartColumn,
  user: LuUser,
  box: LuBox,
  transfer: LuArrowRightLeft,
  gauge: LuGauge,
  clock: LuClock,
  scan: LuScanLine,
  TEMPERATURE: LuThermometer,
  RADIATION: LuRadiation,
  HUMIDITY: LuDroplet,
  PRESSURE: LuGauge,
};

// Full class names so Tailwind generates them: tinted and solid background, text
// colour and border for each tone.
export const TONES = {
  primary: {
    tint: "bg-primary/15",
    solid: "bg-primary",
    text: "text-primary",
    edge: "border-primary/35",
  },
  "step-1": {
    tint: "bg-step-1/15",
    solid: "bg-step-1",
    text: "text-step-1",
    edge: "border-step-1/35",
  },
  "step-2": {
    tint: "bg-step-2/15",
    solid: "bg-step-2",
    text: "text-step-2",
    edge: "border-step-2/35",
  },
  "step-3": {
    tint: "bg-step-3/15",
    solid: "bg-step-3",
    text: "text-step-3",
    edge: "border-step-3/35",
  },
  success: {
    tint: "bg-success/15",
    solid: "bg-success",
    text: "text-success",
    edge: "border-success/35",
  },
  warning: {
    tint: "bg-warning/15",
    solid: "bg-warning",
    text: "text-warning",
    edge: "border-warning/35",
  },
  error: {
    tint: "bg-error/15",
    solid: "bg-error",
    text: "text-error",
    edge: "border-error/35",
  },
  neutral: {
    tint: "bg-base-content/10",
    solid: "bg-base-content/60",
    text: "text-base-content/70",
    edge: "border-base-content/20",
  },
  "tone-orange": {
    tint: "bg-tone-orange/15",
    solid: "bg-tone-orange",
    text: "text-tone-orange",
    edge: "border-tone-orange/35",
  },
  "tone-blue": {
    tint: "bg-tone-blue/15",
    solid: "bg-tone-blue",
    text: "text-tone-blue",
    edge: "border-tone-blue/35",
  },
  "tone-teal": {
    tint: "bg-tone-teal/15",
    solid: "bg-tone-teal",
    text: "text-tone-teal",
    edge: "border-tone-teal/35",
  },
  "tone-magenta": {
    tint: "bg-tone-magenta/15",
    solid: "bg-tone-magenta",
    text: "text-tone-magenta",
    edge: "border-tone-magenta/35",
  },
  "tone-slate": {
    tint: "bg-tone-slate/15",
    solid: "bg-tone-slate",
    text: "text-tone-slate",
    edge: "border-tone-slate/35",
  },
};
export const toneOf = (name) => TONES[name] || TONES.primary;

// Coloured square behind an icon; solid with a white glyph when highlighted,
// `inverse` on a primary surface (the active navigation item).
export default function IconTile({
  icon,
  tone: name,
  solid = false,
  inverse = false,
  size = "md",
}) {
  const Icon = ICONS[icon];
  const colours = toneOf(name);
  const box = {
    sm: "size-8 rounded-lg",
    md: "size-10 rounded-xl",
    lg: "size-13 rounded-2xl",
    xl: "size-15 rounded-full",
  }[size];
  const glyph = { sm: "size-4.5", md: "size-5", lg: "size-6", xl: "size-7" }[
    size
  ];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${box} ${
        inverse
          ? "bg-primary-content/15 text-primary-content"
          : solid
            ? `${colours.solid} text-white shadow-lg`
            : `${colours.tint} ${colours.text}`
      }`}
    >
      {Icon && <Icon className={glyph} />}
    </span>
  );
}
