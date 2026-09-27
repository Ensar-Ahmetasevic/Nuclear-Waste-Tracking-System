"use client";

import { useEffect, useRef } from "react";

// Opens a native dialog, keeps Tab inside it and returns focus to the trigger on close.
export default function useReviewDialog(
  phase,
  editPhase = "edit",
  fallbackId = "reconciliation-heading",
) {
  const dialog = useRef(null),
    heading = useRef(null),
    first = useRef(null);
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected && !trigger.disabled) trigger.focus();
        else document.getElementById(fallbackId)?.focus();
      });
    };
  }, [fallbackId]);
  useEffect(() => {
    if (phase === editPhase && first.current) first.current.focus();
    else heading.current?.focus();
  }, [phase, editPhase]);
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), summary",
      ),
    ];
    const firstControl = controls[0],
      last = controls.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === firstControl ||
        document.activeElement === heading.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      firstControl.focus();
    }
  }
  return { dialog, heading, first, keepFocus };
}

// Sends one confirmed attempt; the same payload is reused after an unknown outcome.
export async function sendAttempt(path, payload, resultKey) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status >= 500) return { phase: "unknown" };
      return {
        phase: [404, 409].includes(response.status) ? "conflict" : "error",
        message: data.message || "The change could not be saved.",
      };
    }
    return data[resultKey]?.id
      ? { phase: "success", result: data[resultKey] }
      : { phase: "unknown" };
  } catch {
    return { phase: "unknown" };
  }
}
