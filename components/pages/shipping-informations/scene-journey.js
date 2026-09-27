"use client";
import { LuCheck } from "react-icons/lu";
import { useT } from "../../shell/preferences";
import { SceneCard } from "../../ui/scene";

// The five journey steps grouped into the three phases of the site, each shown
// with its scene: shipment (arrival, content), pre-storage (receipt,
// departure) and final storage.
export const PHASES = [
  {
    key: "step1",
    scene: "arrival",
    tone: "step-1",
    steps: ["arrival", "content"],
  },
  {
    key: "step2",
    scene: "preStorage",
    tone: "step-2",
    steps: ["receipt", "departure"],
  },
  { key: "step3", scene: "finalStorage", tone: "step-3", steps: ["final"] },
];

export function phaseState(steps) {
  if (steps.some((step) => step.state === "blocked")) return "blocked";
  if (steps.every((step) => step.state === "done")) return "done";
  if (steps.some((step) => step.state === "current" || step.state === "done"))
    return "current";
  return "upcoming";
}

const NODE = {
  done: "bg-primary text-primary-content",
  current: "border-3 border-success bg-base-100",
  blocked: "bg-error text-error-content",
  upcoming: "border-2 border-base-content/25 text-base-content/70",
};

export default function SceneJourney({ label, steps }) {
  const t = useT();
  return (
    <ol aria-label={label} className="grid gap-5 lg:grid-cols-3">
      {PHASES.map((phase, index) => {
        const rows = phase.steps.map((key) =>
          steps.find((step) => step.key === key),
        );
        const state = phaseState(rows);
        return (
          <SceneCard
            key={phase.key}
            scene={phase.scene}
            tone={phase.tone}
            number={String(index + 1).padStart(2, "0")}
            title={t(`flow.${phase.key}.title`)}
            state={state}
            stateLabel={t(`journey.state.${state}`)}
            current={state === "current"}
          >
            <ul className="space-y-3.5 text-sm">
              {rows.map((step) => (
                <li key={step.key} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${NODE[step.state]}`}
                  >
                    {step.state === "done" ? (
                      <LuCheck className="size-3.5" strokeWidth={3} />
                    ) : step.state === "blocked" ? (
                      "!"
                    ) : step.state === "upcoming" ? (
                      steps.indexOf(step) + 1
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span
                      className={`font-medium ${step.state === "upcoming" ? "text-base-content/70" : ""}`}
                    >
                      {step.label}
                      <span className="sr-only">
                        {" "}
                        · {t(`journey.state.${step.state}`)}
                      </span>
                    </span>
                    {step.detail && (
                      <span
                        className={`text-xs ${
                          step.state === "blocked"
                            ? "text-error"
                            : step.state === "current"
                              ? "text-warning"
                              : "text-base-content/70"
                        }`}
                      >
                        {step.detail}
                      </span>
                    )}
                    {step.progress &&
                      step.progress.total > 0 &&
                      step.state !== "done" && (
                        <span
                          role="meter"
                          aria-label={step.progressLabel}
                          aria-valuemin={0}
                          aria-valuemax={step.progress.total}
                          aria-valuenow={step.progress.done}
                          className="mt-1 block h-2 overflow-hidden rounded-full bg-base-content/10"
                        >
                          <span
                            className="block h-full rounded-full bg-success"
                            style={{
                              width: `${Math.min(100, (100 * step.progress.done) / step.progress.total)}%`,
                            }}
                          />
                        </span>
                      )}
                  </span>
                </li>
              ))}
            </ul>
          </SceneCard>
        );
      })}
    </ol>
  );
}
