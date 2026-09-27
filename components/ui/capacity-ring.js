import { capacityLevel } from "./capacity-bar";

const STROKE = {
  "step-2": "stroke-step-2",
  "step-3": "stroke-step-3",
  "step-1": "stroke-step-1",
  "tone-blue": "stroke-tone-blue",
  "tone-magenta": "stroke-tone-magenta",
  "tone-teal": "stroke-tone-teal",
  "tone-orange": "stroke-tone-orange",
  primary: "stroke-primary",
};

// Occupancy as a ring with the percentage in the middle.
export default function CapacityRing({
  percent,
  tone = "primary",
  label,
  caption,
}) {
  const level = capacityLevel(percent);
  const colour =
    level === "full"
      ? "stroke-error"
      : level === "near"
        ? "stroke-warning"
        : STROKE[tone] || STROKE.primary;
  const radius = 52;
  const length = 2 * Math.PI * radius;
  return (
    <div role="img" aria-label={label} className="relative size-40 shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="12"
          className="stroke-base-content/10"
        />
        {percent > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className={colour}
            strokeDasharray={`${(Math.min(100, percent) / 100) * length} ${length}`}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-3xl font-semibold tabular-nums">{percent}%</span>
        <span className="text-xs text-base-content/65">{caption}</span>
      </span>
    </div>
  );
}
