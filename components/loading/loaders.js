"use client";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "../shell/preferences";
import LoadingProblem from "./loading-problem";
import { createProblem } from "./problems";
import Spinner, { ButtonSpinner } from "./spinner";
import {
  LOADING_SLOW_MS,
  LOADING_STALLED_MS,
  useLoadingWatchdog,
  useOnline,
} from "./use-loading-watchdog";

// A problem report made once when loading stalls; offline wins over "stalled".
function useStalledProblem(phase, { kind = "stalled", context, failAfter }) {
  const online = useOnline();
  return useMemo(
    () =>
      phase === "stalled"
        ? createProblem({
            kind: online ? kind : "offline",
            context,
            seconds: Math.round(failAfter / 1000),
          })
        : null,
    [phase, online, kind, context, failAfter],
  );
}

// A first load that never answered. refetch() would only rejoin its request,
// so it is cancelled and started again; with nothing to restart, the page is
// reloaded.
async function retryStuckQueries(client) {
  const stuck = (query) =>
    query.state.data === undefined && query.state.fetchStatus === "fetching";
  const queries = client.getQueryCache().findAll({ predicate: stuck });
  if (!queries.length) return window.location.reload();
  await client.cancelQueries({ predicate: stuck });
  await Promise.all(
    queries.map((query) =>
      client.refetchQueries({ queryKey: query.queryKey, exact: true }),
    ),
  );
}

// A retry starts a new run: the watchdog clock restarts with it.
function useRetryRun(onRetry) {
  const client = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setAttempt((value) => value + 1);
    if (onRetry) onRetry();
    else retryStuckQueries(client);
  };
  return [attempt, retry];
}

function SlowNote({ save, className = "" }) {
  const t = useT();
  const online = useOnline();
  return (
    <p className={`text-sm text-warning ${className}`}>
      {online ? t(save ? "loading.slow.save" : "loading.slow") : t("loading.offline")}
    </p>
  );
}

/**
 * Loading or saving line for sections, dialogs and forms. It is mounted only
 * while the work runs, so the watchdog clock is its lifetime. A save that
 * stalls offers no retry: the first attempt may still have been recorded.
 */
export function InlineLoader({
  label,
  save = false,
  onRetry,
  context,
  size = "sm",
  className = "",
  slowAfter = LOADING_SLOW_MS,
  failAfter = save ? 45000 : LOADING_STALLED_MS,
}) {
  const t = useT();
  const [attempt, retry] = useRetryRun(onRetry);
  const phase = useLoadingWatchdog(true, { slowAfter, failAfter, key: attempt });
  const problem = useStalledProblem(phase, {
    kind: save ? "timeout" : "stalled",
    context,
    failAfter,
  });
  if (problem)
    return (
      <LoadingProblem compact problem={problem} onRetry={retry} retry={!save} className={className} />
    );
  return (
    <div role="status" aria-live="polite" className={`flex flex-col gap-1 py-1 ${className}`}>
      <span className="flex items-center gap-2.5">
        <Spinner size={size} state={phase === "slow" ? "slow" : "spin"} />
        <span>{label || t(save ? "common.saving" : "common.loading")}</span>
      </span>
      {phase === "slow" && <SlowNote save={save} />}
    </div>
  );
}

/**
 * Disabled button shown while a confirmed change is being saved. It warns when
 * the save is slow and, if no answer comes, reports it without a retry: the
 * first attempt may already be recorded.
 */
export function SavingButton({ className = "btn min-h-11", label, context }) {
  const t = useT();
  const failAfter = 45000;
  const phase = useLoadingWatchdog(true, { failAfter });
  const problem = useStalledProblem(phase, { kind: "timeout", context, failAfter });
  return (
    <>
      <button type="button" className={className} disabled aria-busy="true">
        <ButtonSpinner />
        {label || t("common.saving")}
      </button>
      {phase === "slow" && <SlowNote save className="basis-full" />}
      {problem && <LoadingProblem compact problem={problem} retry={false} className="basis-full" />}
    </>
  );
}

// Watches a skeleton region: nothing at first, a note when slow, the problem
// with a retry when loading stalls. Place it inside the region.
export function LoadingWatch({ onRetry, context, failAfter = LOADING_STALLED_MS, className = "" }) {
  const [attempt, retry] = useRetryRun(onRetry);
  const phase = useLoadingWatchdog(true, { failAfter, key: attempt });
  const problem = useStalledProblem(phase, { context, failAfter });
  if (problem)
    return <LoadingProblem compact problem={problem} onRetry={retry} className={className} />;
  if (phase !== "slow") return null;
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 ${className}`}>
      <Spinner size="sm" state="slow" />
      <SlowNote />
    </div>
  );
}

// Loader for a whole page or panel.
export function PageLoader({ label, onRetry, context, className = "" }) {
  const t = useT();
  const [attempt, retry] = useRetryRun(onRetry);
  const phase = useLoadingWatchdog(true, { key: attempt });
  const problem = useStalledProblem(phase, { context, failAfter: LOADING_STALLED_MS });
  const body = problem ? (
    <div className="w-full max-w-lg">
      <LoadingProblem problem={problem} onRetry={retry} />
    </div>
  ) : (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-box px-8 py-6 text-center"
    >
      <Spinner size="lg" state={phase === "slow" ? "slow" : "spin"} />
      <p className="font-medium">{label || t("loading.page")}</p>
      {phase === "slow" && <SlowNote className="max-w-xs" />}
    </div>
  );
  return (
    <div className={`grid min-h-[50dvh] place-items-center px-4 py-10 ${className}`}>{body}</div>
  );
}

// Big containment mark used by the start-up screen and the session overlay.
export function BrandMark({ state = "spin", className = "" }) {
  const halted = state === "halted";
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      {!halted && <span aria-hidden="true" className="nwts-glow absolute inset-3 rounded-full" />}
      <Spinner size="xl" state={state} className="relative" />
    </span>
  );
}

// Full-screen start-up screen while the session is checked.
export function BootLoader({ label, context }) {
  const t = useT();
  const phase = useLoadingWatchdog(true, { failAfter: 25000 });
  const problem = useStalledProblem(phase, { context: context || t("loading.boot"), failAfter: 25000 });
  return (
    <div className="nwts-blueprint fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-base-300 p-4">
      {problem ? (
        <div className="w-full max-w-lg">
          <LoadingProblem problem={problem} />
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-5 text-center">
          <BrandMark state={phase === "slow" ? "slow" : "spin"} />
          <div className="space-y-1">
            <p className="font-mono text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              {t("app.name")}
            </p>
            <p className="text-lg font-semibold">{label || t("loading.boot.session")}</p>
          </div>
          {phase === "slow" && <SlowNote className="max-w-xs" />}
        </div>
      )}
    </div>
  );
}
