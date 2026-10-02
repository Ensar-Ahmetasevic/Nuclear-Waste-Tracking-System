"use client";
import { useQuery } from "@tanstack/react-query";
import { usePreferences } from "../shell/preferences";
import { ButtonSpinner } from "../loading/spinner";

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

// What a person wrote or the server recorded, shown in the reader's language:
// the original with a small "translating" mark until the AI translation
// arrives, then the translation (the original stays on hover). Without a
// translation the original is shown.
export default function MessageText({ text, className = "" }) {
  const { locale, t } = usePreferences();
  const original = typeof text === "string" ? text.trim() : "";
  const { data, isPending } = useQuery({
    queryKey: ["text-translation", locale, original],
    enabled: Boolean(original),
    staleTime: Infinity,
    retry: false,
    queryFn: () => translationOf(original, locale),
  });
  if (!original) return null;
  const from = data?.text && data.sourceLanguage;
  return (
    <span
      className={`break-words whitespace-pre-line ${className}`}
      lang={from ? locale : undefined}
      title={
        from
          ? `${t("text.aiTranslation", { language: languageName(from, locale) })}: ${original}`
          : undefined
      }
      aria-busy={isPending}
    >
      {from ? data.text : text}
      {isPending && (
        <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-xs text-base-content/60">
          <ButtonSpinner />
          {t("text.translating")}
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
