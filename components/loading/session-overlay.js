"use client";
import { useEffect, useRef } from "react";
import { LuCheck, LuLogIn, LuTriangleAlert } from "react-icons/lu";
import { useT } from "../shell/preferences";
import LoadingProblem from "./loading-problem";
import Spinner, { STEP_SEGMENTS, Trefoil, arcPath } from "./spinner";
import { useLoadingWatchdog } from "./use-loading-watchdog";

const TONE_TEXT = {
  "step-1": "text-step-1",
  "step-2": "text-step-2",
  "step-3": "text-step-3",
};

// Signing in walks the custody chain forward (gate, pre-storage, final
// storage); signing out walks it back, so stage i uses segment i or 2 - i.
function segmentOf(mode, stageIndex) {
  return mode === "signin" ? stageIndex : 2 - stageIndex;
}

function stageState(run, index) {
  const finished = run.status === "done" || run.status === "leaving";
  if (run.status === "failed" && index === run.index) return "failed";
  if (finished || index < run.index) return "done";
  if (index === run.index) return "active";
  return "pending";
}

// The containment ring: three segments fill while signing in and drain while
// signing out; the active one carries a light that loops until its step ends.
function CustodyRing({ run }) {
  const finished = run.status === "done" || run.status === "leaving";
  const failed = run.status === "failed";
  const signin = run.mode === "signin";
  return (
    <svg viewBox="0 0 200 200" className="relative size-44 sm:size-52" aria-hidden="true">
      <g className={finished || failed ? "" : "nwts-rotor nwts-scan"}>
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="1 5" />
      </g>
      {STEP_SEGMENTS.map((segment, segmentIndex) => {
        const stageIndex = signin ? segmentIndex : 2 - segmentIndex;
        const state = stageState(run, stageIndex);
        const d = arcPath(100, 100, 80, segment.from, segment.to);
        const common = { d, fill: "none", strokeWidth: 8, strokeLinecap: "round", pathLength: 100 };
        let arc = null;
        if (state === "failed")
          arc = <path {...common} stroke="var(--color-error)" strokeDasharray="4 5" />;
        else if (state === "active")
          arc = (
            <>
              {!signin && <path {...common} stroke={segment.color} strokeOpacity="0.35" />}
              <path
                {...common}
                stroke={segment.color}
                className={`nwts-arc-sweep ${signin ? "" : "nwts-reverse"}`}
              />
            </>
          );
        else if (state === "done")
          arc = <path {...common} stroke={segment.color} className={signin ? "nwts-arc-fill" : "nwts-arc-drain"} />;
        else if (!signin) arc = <path {...common} stroke={segment.color} />;
        return (
          <g key={segment.key}>
            <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" strokeLinecap="round" />
            {arc}
          </g>
        );
      })}
      <circle cx="100" cy="100" r="60" fill="var(--color-base-100)" stroke="currentColor" strokeOpacity="0.1" />
      {finished && (
        <circle
          cx="100"
          cy="100"
          r="66"
          fill="none"
          strokeWidth="3"
          pathLength="100"
          stroke={signin ? "var(--color-success)" : "var(--color-primary)"}
          className="nwts-seal"
        />
      )}
      <g className={failed ? "text-error" : finished && !signin ? "text-base-content/35" : "text-primary"}>
        <Trefoil
          transform="translate(70 70) scale(2.5)"
          className={finished || failed ? "nwts-rotor nwts-settle" : "nwts-rotor nwts-core-slow"}
        />
      </g>
    </svg>
  );
}

function StageIcon({ state }) {
  if (state === "active") return <Spinner size="xs" />;
  if (state === "done") return <LuCheck className="size-4 text-success" aria-hidden="true" />;
  if (state === "failed") return <LuTriangleAlert className="size-4 text-error" aria-hidden="true" />;
  return <span aria-hidden="true" className="size-2 rounded-full bg-base-content/25" />;
}

function headline(t, run) {
  const { mode, status, user, first } = run;
  const finished = status === "done" || status === "leaving";
  if (status === "failed") return t(`${mode}.failed`);
  if (mode === "signout") return t(finished ? "signout.title" : "signout.progress");
  if (!user) return t("signin.progress");
  if (!user.name) return t(first ? "signin.title.firstAnon" : "signin.title.backAnon");
  return t(first ? "signin.title.first" : "signin.title.back", { name: user.name });
}

function lead(t, run) {
  const { mode, status, user, first } = run;
  if (status === "failed") return "";
  if (status === "done" || status === "leaving") return t(`${mode}.lead.done`);
  if (mode === "signout") return t("signout.lead");
  if (!user) return t("signin.lead");
  return t(first ? "signin.lead.first" : "signin.lead.back");
}

export default function SessionOverlay({ run, stages, actions }) {
  const t = useT();
  const root = useRef(null);
  const heading = useRef(null);
  const slow =
    useLoadingWatchdog(run.status === "running", {
      key: `${run.attempt}:${run.index}`,
      slowAfter: 6000,
      failAfter: 0,
    }) === "slow";

  // Everything behind the overlay is out of reach while it is open.
  useEffect(() => {
    const others = [...document.body.children].filter(
      (element) => element !== root.current && !element.inert,
    );
    others.forEach((element) => (element.inert = true));
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      others.forEach((element) => (element.inert = false));
      document.documentElement.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [run.status, run.user]);

  const { mode, status } = run;
  const failedStage = status === "failed" ? stages[run.index] : null;
  const stageLabel = (key) => t(`${mode}.stage.${key}`);
  const current = stages[Math.min(run.index, stages.length - 1)];
  const announcement =
    status === "running"
      ? `${stageLabel(current)} · ${t("session.status.active")}`
      : headline(t, run);
  const eyebrow =
    mode === "signin" && run.user?.role
      ? `${t("signin.eyebrow")} · ${t(`role.${run.user.role}`)}`
      : t(`${mode}.eyebrow`);

  let problemActions = null;
  if (failedStage) {
    const ghost = "btn min-h-11 border-base-content/20 btn-ghost";
    problemActions =
      mode === "signin" ? (
        <>
          {failedStage === "workspace" && (
            <button type="button" className={ghost} onClick={actions.skip}>
              {t("signin.skip")}
            </button>
          )}
          {failedStage === "enter" && (
            <button type="button" className={ghost} onClick={actions.reload}>
              {t("problem.reload")}
            </button>
          )}
          <button type="button" className={ghost} onClick={actions.backToSignIn}>
            <LuLogIn className="size-4.5" aria-hidden="true" />
            {t("signin.back")}
          </button>
        </>
      ) : failedStage === "exit" ? (
        <button
          type="button"
          className={ghost}
          // A full page load is the recovery when client navigation stalled.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          onClick={() => window.location.assign("/login")}
        >
          <LuLogIn className="size-4.5" aria-hidden="true" />
          {t("signout.openLogin")}
        </button>
      ) : (
        <button type="button" className={ghost} onClick={actions.dismiss}>
          {t("signout.dismiss")}
        </button>
      );
  }

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-overlay-title"
      aria-busy={status === "running"}
      data-mode={mode}
      className={`nwts-blueprint fixed inset-0 z-[100] overflow-y-auto bg-base-300 text-base-content ${status === "leaving" ? "nwts-overlay-out" : "nwts-overlay-in"}`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-7 px-4 py-10">
        <div className="relative grid place-items-center">
          {status !== "failed" && (
            <span aria-hidden="true" className="nwts-glow absolute inset-6 rounded-full" />
          )}
          <CustodyRing run={run} />
        </div>
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            {eyebrow}
          </p>
          <h2
            ref={heading}
            tabIndex={-1}
            id="session-overlay-title"
            className="nwts-headline text-2xl font-semibold text-balance outline-none sm:text-3xl"
            key={headline(t, run)}
          >
            {headline(t, run)}
          </h2>
          {lead(t, run) && <p className="text-base-content/75">{lead(t, run)}</p>}
        </div>
        <ol className="w-full space-y-1.5">
          {stages.map((key, index) => {
            const state = stageState(run, index);
            const tone = STEP_SEGMENTS[segmentOf(mode, index)].key;
            return (
              <li
                key={key}
                className={`operational-control flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2 ${state === "active" || state === "failed" ? "border-base-content/15 bg-base-100" : "border-transparent"} ${state === "pending" ? "text-base-content/55" : ""}`}
              >
                <span className={`shrink-0 font-mono text-xs font-semibold ${TONE_TEXT[tone]}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm font-medium">{stageLabel(key)}</span>
                <span className="grid size-5 place-items-center">
                  <StageIcon state={state} />
                </span>
                <span className="sr-only">{t(`session.status.${state}`)}</span>
              </li>
            );
          })}
        </ol>
        {slow && (
          <p className="flex items-center gap-2 text-sm text-warning">
            <Spinner size="xs" state="slow" />
            {t("session.slow")}
          </p>
        )}
        {failedStage && (
          <LoadingProblem
            compact
            className="w-full"
            problem={run.problem}
            warning={mode === "signout" && failedStage !== "exit" ? t("signout.warning") : undefined}
            onRetry={actions.retry}
            actions={problemActions}
          />
        )}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  );
}
