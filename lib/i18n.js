// Interface languages. Pages are moved to these keys step by step; untranslated
// pages keep their English copy until then. The text itself lives in
// lib/locales/<locale>.js: the server reads them all (lib/locales/index.js), the
// browser only loads the one in use (lib/locales/load.js).
import recordCodes from "./record-codes.cjs";

const { recordCode } = recordCodes;
export const LOCALES = ["en", "de", "tr", "ru", "pl", "uk", "bs"];
export const DEFAULT_LOCALE = "en";
// Each language in its own name, so a worker finds theirs without reading the others.
export const LANGUAGE_NAMES = {
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
  ru: "Русский",
  pl: "Polski",
  uk: "Українська",
  bs: "Bosanski",
};
export const THEMES = ["nwts-dark", "nwts-light"];
export const DEFAULT_THEME = "nwts-dark";
export const LOCALE_COOKIE = "nwts-locale";
export const THEME_COOKIE = "nwts-theme";

export const pickLocale = (value) =>
  LOCALES.includes(value) ? value : DEFAULT_LOCALE;
export const pickTheme = (value) =>
  THEMES.includes(value) ? value : DEFAULT_THEME;

const pluralRules = {};
const pluralOf = (locale, count) =>
  (pluralRules[locale] ??= new Intl.PluralRules(locale)).select(count);

// `messages` is one locale's text with English already filled in for missing keys.
// With a numeric `count`, a key may have plural forms "<key>.one", "<key>.few" and
// "<key>.many" (the language's Intl plural category); "<key>" itself is the rest.
// "{id:S}" and "{id:P}" print a shipment or Container Profile code (S-000025, P-00202);
// "{actor:U}" prints the person's name from `people`, or "User #id" when unknown.
const CODE_KINDS = { S: "shipment", P: "profile" };
export function formatMessage(messages, locale, key, values, { people } = {}) {
  const count = values?.count == null ? NaN : Number(values.count);
  const text =
    (Number.isFinite(count) && messages[`${key}.${pluralOf(locale, count)}`]) ||
    messages[key] ||
    key;
  return values
    ? text.replace(/\{(\w+)(?::([SPU]))?\}/g, (match, name, code) =>
        values[name] == null
          ? match
          : code === "U"
            ? people?.[values[name]] ?? formatMessage(messages, locale, "common.userNumber", { id: values[name] })
            : code
              ? recordCode(CODE_KINDS[code], values[name])
              : String(values[name]),
      )
    : text;
}
