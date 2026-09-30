"use client";
import { useCallback, useState } from "react";
import { useT } from "../shell/preferences";

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

// Spelling check when a note is sent: `await proofread.confirm(value)` returns
// the text to save. With mistakes found, it waits until the person picks the
// correction or their own text in <ProofreadPrompt>; otherwise (or when the check
// is unavailable) it returns the text right away. `value` is a string or an
// object of strings, such as the sections of a report. `checking` is true while
// the check runs, for the submit button's spinner.
export function useProofread() {
  const [suggestion, setSuggestion] = useState(null);
  const [checking, setChecking] = useState(false);
  const confirm = useCallback(async (value) => {
    const single = typeof value === "string";
    const values = single ? { text: value } : { ...value };
    const keys = Object.keys(values).filter((key) => typeof values[key] === "string" && values[key].trim());
    setChecking(true);
    const results = await Promise.all(keys.map((key) => check(values[key]))).finally(() => setChecking(false));
    const changes = keys
      .map((key, index) => ({ key, original: values[key].trim(), corrected: results[index]?.changed && results[index].corrected }))
      .filter((row) => row.corrected);
    if (!changes.length) return value;
    const chosen = await new Promise((resolve) => setSuggestion({ changes, resolve }));
    const result = { ...values };
    if (chosen) for (const row of changes) result[row.key] = row.corrected;
    return single ? result.text : result;
  }, []);
  const choose = useCallback(
    (useCorrection) => {
      suggestion?.resolve(useCorrection);
      setSuggestion(null);
    },
    [suggestion],
  );
  return { confirm, checking, suggestion, choose, waiting: checking || Boolean(suggestion) };
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

export function ProofreadPrompt({ proofread, labels = {} }) {
  const t = useT();
  const { suggestion, choose } = proofread;
  if (!suggestion) return null;
  return (
    <div role="status" className="space-y-2 rounded-box border border-info/40 bg-info/5 p-3 text-sm">
      <p className="font-medium">{t("proofread.title")}</p>
      {suggestion.changes.map((row) => (
        <p key={row.key} className="break-words whitespace-pre-line">
          {labels[row.key] && <span className="font-medium">{labels[row.key]}: </span>}
          {changedWords(row.original, row.corrected).map((part, index) =>
            part.changed ? (
              <mark key={index} className="rounded bg-info/20 text-base-content">
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </p>
      ))}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn min-h-11 btn-ghost" onClick={() => choose(false)}>
          {t("proofread.keep")}
        </button>
        <button type="button" className="btn min-h-11 btn-primary" onClick={() => choose(true)}>
          {t("proofread.use")}
        </button>
      </div>
    </div>
  );
}
