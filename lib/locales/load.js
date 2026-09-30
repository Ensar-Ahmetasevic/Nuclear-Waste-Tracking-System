// Browser side: fetch only the language being switched to (plus English for gaps).
import { DEFAULT_LOCALE, pickLocale } from "../i18n.js";

const load = {
  en: () => import("./en.js"),
  de: () => import("./de.js"),
  tr: () => import("./tr.js"),
  ru: () => import("./ru.js"),
  pl: () => import("./pl.js"),
  uk: () => import("./uk.js"),
  bs: () => import("./bs.js"),
};

export async function loadMessages(locale) {
  const chosen = pickLocale(locale);
  const [fallback, own] = await Promise.all([load[DEFAULT_LOCALE](), load[chosen]()]);
  return { ...fallback.default, ...own.default };
}
