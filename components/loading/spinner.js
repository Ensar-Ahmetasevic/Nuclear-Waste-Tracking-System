"use client";

// The loading mark: the radiation trefoil inside a containment ring whose three
// segments are the three steps of custody (shipping, pre-storage, final
// storage). The ring turns while work runs; the trefoil turns the other way.
export const TREFOIL_BLADE =
  "M10.7 9.75 7.5 4.21A9 9 0 0 1 16.5 4.21L13.3 9.75A2.6 2.6 0 0 0 10.7 9.75Z";

// Arc on a circle, angles in degrees clockwise from twelve o'clock.
export function arcPath(cx, cy, r, from, to) {
  const point = (angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(radians)).toFixed(2)} ${(cy + r * Math.sin(radians)).toFixed(2)}`;
  };
  return `M ${point(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to)}`;
}

// Trefoil drawn in a 24 px box and placed with `transform`, centred in the
// SVG. The class (rotation) sits on the untransformed outer group so it turns
// around the centre of the viewBox.
export function Trefoil({ transform, className = "" }) {
  return (
    <g className={className}>
      <g transform={transform}>
        <g fill="currentColor" transform="rotate(60 12 12)">
          <circle cx="12" cy="12" r="1.8" />
          <path d={TREFOIL_BLADE} />
          <path d={TREFOIL_BLADE} transform="rotate(120 12 12)" />
          <path d={TREFOIL_BLADE} transform="rotate(240 12 12)" />
        </g>
      </g>
    </g>
  );
}

export const STEP_SEGMENTS = [
  { key: "step-1", from: 8, to: 112, color: "var(--nwts-step-1)" },
  { key: "step-2", from: 128, to: 232, color: "var(--nwts-step-2)" },
  { key: "step-3", from: 248, to: 352, color: "var(--nwts-step-3)" },
];

const SIZES = { xs: 16, sm: 20, md: 32, lg: 56, xl: 88 };
const CURRENT_OPACITY = [1, 0.6, 0.3];

/**
 * state: "spin" while loading, "slow" once it takes longer than usual (the
 * ring turns slower and warms to amber), "halted" when loading has stopped
 * (no motion, error colour). tone: "flow" uses the step colours, "current"
 * inherits the text colour (buttons).
 */
export default function Spinner({
  size = "md",
  tone = "flow",
  state = "spin",
  className = "",
  label,
}) {
  const px = SIZES[size] || size;
  const halted = state === "halted";
  // Below 24 px the trefoil is not legible; the ring alone carries the mark.
  const small = px < 24;
  const stroke = small ? 6 : 3.5;
  const colour = (segment, index) => {
    if (halted) return "var(--color-error)";
    if (state === "slow" && tone === "flow")
      return index === 0 ? "var(--color-warning)" : segment.color;
    return tone === "current" ? "currentColor" : segment.color;
  };
  return (
    <svg
      viewBox="0 0 48 48"
      width={px}
      height={px}
      className={`nwts-spinner shrink-0 ${className}`}
      data-state={state}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeOpacity={tone === "current" ? 0.22 : 0.12}
        strokeWidth={stroke}
      />
      <g className={halted ? "" : "nwts-rotor nwts-ring"}>
        {STEP_SEGMENTS.map((segment, index) => (
          <path
            key={segment.key}
            d={arcPath(24, 24, 20, segment.from, segment.to)}
            fill="none"
            stroke={colour(segment, index)}
            strokeOpacity={tone === "current" ? CURRENT_OPACITY[index] : 1}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={halted ? "3 5" : undefined}
          />
        ))}
      </g>
      {!small && (
        <Trefoil
          transform="translate(13 13) scale(0.9167)"
          className={`${halted ? "" : "nwts-rotor nwts-core"} ${tone === "flow" ? (halted ? "text-error" : "text-primary") : ""}`}
        />
      )}
    </svg>
  );
}

// Button-sized mark that inherits the button's text colour. The button keeps a
// text label next to it, so the state never depends on the motion.
export function ButtonSpinner({ className = "" }) {
  return <Spinner size="xs" tone="current" className={className} />;
}
