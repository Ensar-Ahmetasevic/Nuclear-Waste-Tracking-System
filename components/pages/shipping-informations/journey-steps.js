"use client";
import { LuCheck } from "react-icons/lu";
import { useT } from "../../shell/preferences";

const NODE = {
  done: "bg-primary text-primary-content",
  current: "border-3 border-success bg-base-100",
  blocked: "bg-error text-error-content",
  upcoming: "border-2 border-base-content/25 text-base-content/70",
};

const DETAIL = {
  blocked: "text-error",
  current: "text-warning",
  done: "text-base-content/70",
  upcoming: "text-base-content/60",
};

// The five journey steps of a shipment in one row (a column on phones).
export default function JourneySteps({ label, steps }) {
  const t = useT();
  return (
    <ol
      aria-label={label}
      className="grid gap-4 rounded-box border border-base-content/10 bg-base-100 p-4 sm:p-5 md:grid-cols-5 md:gap-3"
    >
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3 md:flex-col md:gap-2">
          <span className="flex items-center md:w-full">
            <span
              aria-hidden="true"
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${NODE[step.state]}`}
            >
              {step.state === "done" ? (
                <LuCheck className="size-4" strokeWidth={3} />
              ) : step.state === "blocked" ? (
                "!"
              ) : step.state === "upcoming" ? (
                index + 1
              ) : null}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`ml-2 hidden h-0.5 flex-1 md:block ${step.state === "done" ? "bg-primary" : "bg-base-content/15"}`}
              />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
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
              <span className={`text-xs ${DETAIL[step.state]}`}>
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
                  className="mt-1 block h-1.5 overflow-hidden rounded-full bg-base-content/10"
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
    </ol>
  );
}
