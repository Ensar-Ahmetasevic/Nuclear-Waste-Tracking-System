"use client";
import { useState } from "react";
import { LuCheck, LuSparkles } from "react-icons/lu";
import { useT } from "../shell/preferences";
import { ButtonSpinner } from "../loading/spinner";

async function check(text) {
  try {
    const response = await fetch("/api/texts/proofread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Word-level differences, so the person sees exactly what would change.
function changedWords(original, corrected) {
  const a = original.split(/(\s+)/);
  const b = corrected.split(/(\s+)/);
  const lengths = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lengths[i][j] = a[i] === b[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const parts = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      parts.push({ text: b[j], changed: false });
      i++;
      j++;
    } else if (i < a.length && lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else parts.push({ text: b[j++], changed: true });
  }
  return parts;
}

// A textarea with its own "AI check" button. Nothing is sent to the AI until the
// person presses it; the suggested text is shown under the field, inside the same
// frame, and is used only when accepted. Takes the props of <textarea>.
export function AiTextarea({ value, onChange, className = "", ...props }) {
  const t = useT();
  const [state, setState] = useState(null); // null | "checking" | "clean" | "failed" | { original, corrected }
  const text = String(value ?? "");
  // A suggestion belongs to the text it was made for.
  const suggestion = state?.original === text.trim() ? state : null;
  const run = async () => {
    const original = text.trim();
    setState("checking");
    const result = await check(original);
    setState(!result ? "failed" : result.changed && result.corrected ? { original, corrected: result.corrected } : "clean");
  };
  const accept = () => {
    onChange?.({ target: { value: suggestion.corrected, name: props.name } });
    setState(null);
  };
  const status = state === "clean" || state === "failed" ? state : null;
  return (
    <span className="relative block">
      <textarea
        {...props}
        value={value}
        onChange={(event) => {
          if (status) setState(null);
          onChange?.(event);
        }}
        className={`${className} ${suggestion ? "rounded-b-none" : "pb-11"}`}
      />
      {!suggestion && (
        <button
          type="button"
          className="btn absolute right-2 bottom-2 h-8 min-h-8 gap-1.5 border-secondary/40 bg-secondary/10 px-2.5 text-xs text-secondary btn-sm hover:bg-secondary/20"
          disabled={!text.trim() || state === "checking" || props.disabled}
          onClick={run}
        >
          {state === "checking" ? (
            <ButtonSpinner />
          ) : status === "clean" ? (
            <LuCheck className="size-3.5" aria-hidden="true" />
          ) : (
            <LuSparkles className="size-3.5" aria-hidden="true" />
          )}
          <span role="status">{t(status ? `proofread.${status}` : "proofread.check")}</span>
        </button>
      )}
      {suggestion && (
        <span
          role="status"
          className="-mt-px block space-y-2 rounded-b-xl border border-secondary/50 bg-secondary/10 p-3 text-sm font-normal"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <LuSparkles className="size-3.5 shrink-0" aria-hidden="true" />
            {t("proofread.title")}
          </span>
          <span className="block break-words whitespace-pre-line">
            {changedWords(suggestion.original, suggestion.corrected).map((part, index) =>
              part.changed ? (
                <mark key={index} className="rounded bg-secondary/30 px-0.5 text-base-content">
                  {part.text}
                </mark>
              ) : (
                part.text
              ),
            )}
          </span>
          <span className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState(null)}>
              {t("proofread.keep")}
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={accept}>
              {t("proofread.use")}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
