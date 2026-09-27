const STYLES = {
  info: "bg-step-1/12 text-step-1 border-step-1/35",
  success: "bg-success/12 text-success border-success/35",
  warning: "bg-warning/12 text-warning border-warning/40",
  error: "bg-error/12 text-error border-error/40",
  neutral: "bg-base-content/8 text-base-content/75 border-base-content/20",
  muted:
    "bg-transparent text-base-content/70 border-dashed border-base-content/35",
};

// Status is always a word as well as a colour.
export default function StatusChip({
  tone = "neutral",
  children,
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[tone] || STYLES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
