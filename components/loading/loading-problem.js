"use client";
import { useState } from "react";
import { LuCopy, LuCheck, LuMail, LuRotateCw } from "react-icons/lu";
import { useT } from "../shell/preferences";
import Spinner from "./spinner";
import { problemDetails } from "./problems";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_IT_SUPPORT_EMAIL;

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  }
}

/**
 * Tells the user what stopped loading, what to do next and gives IT a
 * reference. `onRetry` repeats the work; without it the page is reloaded.
 * `retry: false` hides the retry (a save whose outcome is unknown).
 */
export default function LoadingProblem({
  problem,
  title,
  warning,
  onRetry,
  retry = true,
  retryLabel,
  actions,
  compact = false,
  className = "",
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const kind = problem.kind;
  const values = { seconds: problem.seconds ?? "", status: problem.status ?? "" };
  const steps = [1, 2, 3].map((index) => t(`problem.${kind}.step${index}`, values));
  const details = problemDetails(problem);
  const mail = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`NWTS ${problem.reference}`)}&body=${encodeURIComponent(details)}`
    : null;
  return (
    <section
      role="alert"
      className={`operational-panel space-y-4 rounded-box border border-error/40 bg-base-100 text-left text-base-content ${compact ? "p-4" : "p-5 sm:p-6"} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Spinner size="md" state="halted" className="mt-0.5 text-error" />
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-xs font-semibold tracking-widest text-error uppercase">
            {t("problem.eyebrow")}
            {problem.context ? ` · ${problem.context}` : ""}
          </p>
          <h2 className={`font-semibold ${compact ? "text-base" : "text-lg"}`}>
            {title || t(`problem.${kind}.title`, values)}
          </h2>
          <p className="text-sm text-base-content/75">
            {t(`problem.${kind}.body`, values)}
          </p>
        </div>
      </div>
      {warning && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          {warning}
        </p>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("problem.nextSteps")}</h3>
        <ol className="space-y-1.5 text-sm">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2.5">
              <span className="shrink-0 font-mono text-xs leading-5 font-semibold text-base-content/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-base-200 px-3 py-2 text-sm">
        <span className="text-base-content/70">{t("problem.reference")}</span>
        <code className="font-mono font-semibold select-all">{problem.reference}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        {retry && (
          <button
            type="button"
            className="btn min-h-11 btn-primary"
            onClick={onRetry || (() => window.location.reload())}
          >
            <LuRotateCw className="size-4.5" aria-hidden="true" />
            {retryLabel || t(onRetry ? "problem.retry" : "problem.reload")}
          </button>
        )}
        {actions}
        <button
          type="button"
          className="btn min-h-11 border-base-content/20 btn-ghost"
          onClick={async () => setCopied(await copy(details))}
        >
          {copied ? (
            <LuCheck className="size-4.5 text-success" aria-hidden="true" />
          ) : (
            <LuCopy className="size-4.5" aria-hidden="true" />
          )}
          {t(copied ? "problem.copied" : "problem.copy")}
        </button>
        {mail && (
          <a className="btn min-h-11 border-base-content/20 btn-ghost" href={mail}>
            <LuMail className="size-4.5" aria-hidden="true" />
            {t("problem.emailIt")}
          </a>
        )}
      </div>
    </section>
  );
}
