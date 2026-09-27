// Occupancy bar. From NEAR_CAPACITY percent the bar turns amber, at 100 % red;
// the threshold is a display aid, not a safety limit.
export const NEAR_CAPACITY = 85;

export function capacityLevel(percent) {
  return percent >= 100 ? "full" : percent >= NEAR_CAPACITY ? "near" : "normal";
}

const FILL = {
  "step-2": "bg-step-2",
  "step-3": "bg-step-3",
  "step-1": "bg-step-1",
  "tone-blue": "bg-tone-blue",
  "tone-magenta": "bg-tone-magenta",
  "tone-teal": "bg-tone-teal",
  "tone-orange": "bg-tone-orange",
  primary: "bg-primary",
};

export default function CapacityBar({
  percent,
  tone = "primary",
  label,
  size = "md",
}) {
  const level = capacityLevel(percent);
  const fill =
    level === "full"
      ? "bg-error"
      : level === "near"
        ? "bg-warning"
        : FILL[tone] || FILL.primary;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, percent)}
      className={`w-full overflow-hidden rounded-full bg-base-content/10 ${size === "sm" ? "h-1.5" : "h-2.5"}`}
    >
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
