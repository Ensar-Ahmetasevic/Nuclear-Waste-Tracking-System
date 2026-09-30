"use client";
import { useQuery } from "@tanstack/react-query";
import { languageShort, usePreferences } from "../shell/preferences";

// Every note on a page is asked for in one request, shortly after the page renders.
const waiting = new Map();
function translationOf(text, locale) {
  return new Promise((resolve) => {
    if (!waiting.has(locale)) {
      waiting.set(locale, new Map());
      setTimeout(() => send(locale), 30);
    }
    const texts = waiting.get(locale);
    texts.set(text, [...(texts.get(text) || []), resolve]);
  });
}
async function send(locale) {
  const texts = [...waiting.get(locale)];
  waiting.delete(locale);
  for (let start = 0; start < texts.length; start += 25) {
    const batch = texts.slice(start, start + 25);
    let translations = [];
    try {
      const response = await fetch("/api/texts/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: batch.map(([text]) => text), locale }),
        signal: AbortSignal.timeout(60000),
      });
      if (response.ok) translations = (await response.json()).translations;
    } catch {
      // No translation this time; the original stays readable.
    }
    batch.forEach(([, resolvers], index) => resolvers.forEach((resolve) => resolve(translations[index] ?? null)));
  }
}

// What a person wrote, as written, with an AI translation into the reader's
// language below it when the note is in another language.
export default function MessageText({ text, className = "" }) {
  const { locale, t } = usePreferences();
  const original = typeof text === "string" ? text.trim() : "";
  const { data } = useQuery({
    queryKey: ["text-translation", locale, original],
    enabled: Boolean(original),
    staleTime: Infinity,
    retry: false,
    queryFn: () => translationOf(original, locale),
  });
  if (!original) return null;
  const from = data?.text && data.sourceLanguage;
  return (
    <span className={`break-words whitespace-pre-line ${className}`}>
      {text}
      {from && (
        <span className="mt-1 block text-base-content/70" lang={locale}>
          <span
            className="mr-1.5 rounded border border-base-content/20 px-1 font-mono text-[10px] tracking-wide text-base-content/60"
            title={t("text.aiTranslation", { language: languageName(from, locale) })}
          >
            {languageShort(from)} → {languageShort(locale)} · AI
          </span>
          {data.text}
        </span>
      )}
    </span>
  );
}

function languageName(code, locale) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) || code;
  } catch {
    return code;
  }
}

// A sentence around what someone wrote, such as "Reason: {reason}": the
// interface text stays translated, the note is shown with MessageText.
const MARK = "\u0000";
export function TextIn({ messageKey, name = "reason", text, values }) {
  const { t } = usePreferences();
  const [before, after = ""] = t(messageKey, { ...values, [name]: MARK }).split(MARK);
  return (
    <>
      {before}
      <MessageText text={text} />
      {after}
    </>
  );
}
