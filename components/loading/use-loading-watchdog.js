"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

// Thresholds shared by every loader: after SLOW the mark keeps turning and a
// note says it takes longer than usual; after STALLED loading is treated as
// stuck and the user gets the problem, its reference and next steps.
export const LOADING_SLOW_MS = 8000;
export const LOADING_STALLED_MS = 30000;

/**
 * Phase of one loading run: "idle" | "loading" | "slow" | "stalled".
 * Changing `key` restarts the clock (a retry).
 */
export function useLoadingWatchdog(
  active,
  { slowAfter = LOADING_SLOW_MS, failAfter = LOADING_STALLED_MS, key } = {},
) {
  const [run, setRun] = useState({ key, phase: active ? "loading" : "idle" });
  const phase =
    !active ? "idle" : run.key === key && run.phase !== "idle" ? run.phase : "loading";
  useEffect(() => {
    if (!active) return;
    setRun({ key, phase: "loading" });
    const slow = setTimeout(() => setRun({ key, phase: "slow" }), slowAfter);
    const stalled =
      failAfter > 0
        ? setTimeout(() => setRun({ key, phase: "stalled" }), failAfter)
        : null;
    return () => {
      clearTimeout(slow);
      clearTimeout(stalled);
    };
  }, [active, slowAfter, failAfter, key]);
  return phase;
}

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Browser's network signal; true on the server.
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
