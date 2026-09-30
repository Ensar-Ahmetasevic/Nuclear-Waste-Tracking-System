// Server side: every language, for server-rendered text and the first paint.
import { DEFAULT_LOCALE, formatMessage, pickLocale } from "../i18n.js";
import en from "./en.js";
import de from "./de.js";
import tr from "./tr.js";
import ru from "./ru.js";
import pl from "./pl.js";
import uk from "./uk.js";
import bs from "./bs.js";

const ALL = { en, de, tr, ru, pl, uk, bs };
const merged = {};

export function messagesFor(locale) {
  const chosen = pickLocale(locale);
  return (merged[chosen] ??= { ...ALL[DEFAULT_LOCALE], ...ALL[chosen] });
}

export function translate(locale, key, values, options) {
  return formatMessage(messagesFor(locale), pickLocale(locale), key, values, options);
}
