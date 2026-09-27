// Dot for one step in a list row.
function Node({ state }) {
  return (
    <span
      aria-hidden="true"
      className={`block size-3 shrink-0 rounded-full ${
        state === "done"
          ? "bg-primary"
          : state === "current"
            ? "bg-base-100 ring-2 ring-primary"
            : state === "blocked"
              ? "bg-error"
              : "bg-base-content/20"
      }`}
    />
  );
}

// Five dots for list rows; the summary text is the accessible name. The full
// journey on the shipment detail is SceneJourney.
export function CompactStepper({ steps, summary }) {
  return (
    <span
      role="img"
      aria-label={summary}
      className="flex items-center"
      title={summary}
    >
      {steps.map((step, index) => (
        <span key={step.key} className="flex items-center">
          {index > 0 && (
            <span
              aria-hidden="true"
              className={`h-0.5 w-4 sm:w-6 ${steps[index - 1].state === "done" ? "bg-primary" : "bg-base-content/20"}`}
            />
          )}
          <Node state={step.state} />
        </span>
      ))}
    </span>
  );
}
