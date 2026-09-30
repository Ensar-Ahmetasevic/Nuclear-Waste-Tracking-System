// Translations of what people write, stored once per text and language
// (TextTranslation). The same sentence in two places is translated once.
import { createHash } from "node:crypto";
import dbModule from "./database.cjs";
import { AI_MODEL, translate } from "./ai-text.js";

export const TEXT_LIMIT = 4000;
const BATCH = 20;
const { database } = dbModule;

export const textHash = (text) => createHash("sha256").update(text).digest("hex");

// Distinct, non-empty texts of at most TEXT_LIMIT characters.
export function cleanTexts(texts) {
  return [...new Set(texts.filter((text) => typeof text === "string").map((text) => text.trim()))].filter(
    (text) => text && text.length <= TEXT_LIMIT,
  );
}

// → Map(text → { sourceLanguage, text }); `text` is null when the original already
// is in `locale`. Texts the AI could not translate this time are left out.
export async function ensureTranslations(organizationId, texts, locale) {
  const wanted = cleanTexts(texts).map((text) => ({ text, hash: textHash(text) }));
  const result = new Map();
  if (!wanted.length) return result;
  const rows = await database.textTranslation.findMany({
    where: { organizationId, sourceHash: { in: wanted.map((item) => item.hash) } },
    select: { sourceHash: true, sourceLanguage: true, targetLanguage: true, text: true },
  });
  const missing = [];
  for (const item of wanted) {
    const own = rows.filter((row) => row.sourceHash === item.hash);
    const hit = own.find((row) => row.targetLanguage === locale);
    // A translation into another language already tells us the text's own language.
    if (hit) result.set(item.text, { sourceLanguage: hit.sourceLanguage, text: hit.text });
    else if (own.some((row) => row.sourceLanguage === locale)) result.set(item.text, { sourceLanguage: locale, text: null });
    else missing.push(item);
  }
  for (let start = 0; start < missing.length; start += BATCH) {
    const batch = missing.slice(start, start + BATCH);
    const translated = await translate(batch.map((item) => item.text), locale);
    if (!translated) break;
    // Only what was really translated is stored; the rest is tried again later.
    const data = batch.flatMap((item, index) => {
      if (!translated[index]) return [];
      const { sourceLanguage, translation } = translated[index];
      const text = sourceLanguage === locale ? null : translation;
      result.set(item.text, { sourceLanguage, text });
      return [{ organizationId, sourceHash: item.hash, sourceLanguage, targetLanguage: locale, text, model: AI_MODEL }];
    });
    if (data.length) await database.textTranslation.createMany({ data, skipDuplicates: true });
  }
  return result;
}
