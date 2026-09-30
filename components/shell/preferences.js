"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LANGUAGE_NAMES,
  LOCALES,
  LOCALE_COOKIE,
  THEME_COOKIE,
  formatMessage,
  pickLocale,
  pickTheme,
} from "../../lib/i18n";
import { loadMessages } from "../../lib/locales/load";

// The server reads both cookies for the first render and sends that language's
// text, so the page paints in the chosen language and theme without a flash.
// Another language is loaded only when someone switches to it.
const PreferencesContext = createContext(null);

function remember(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function PreferencesProvider({ initialLocale, initialMessages, initialTheme, children }) {
  const [language, setLanguage] = useState(() => ({
    locale: pickLocale(initialLocale),
    messages: initialMessages || {},
  }));
  const [theme, setThemeState] = useState(() => pickTheme(initialTheme));
  const wanted = useRef(language.locale);
  const setLocale = useCallback(async (value) => {
    const next = pickLocale(value);
    wanted.current = next;
    remember(LOCALE_COOKIE, next);
    const messages = await loadMessages(next);
    // A quicker second switch wins over a slower first one.
    if (wanted.current !== next) return;
    document.documentElement.lang = next;
    setLanguage({ locale: next, messages });
  }, []);
  // Without text from the server (the error page), load it here.
  const missing = !initialMessages;
  useEffect(() => {
    if (missing) setLocale(initialLocale);
  }, [missing, initialLocale, setLocale]);
  const setTheme = useCallback((value) => {
    const next = pickTheme(value);
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    remember(THEME_COOKIE, next);
  }, []);
  const { locale, messages } = language;
  const value = useMemo(
    () => ({
      locale,
      messages,
      theme,
      setLocale,
      setTheme,
      t: (key, values) => formatMessage(messages, locale, key, values),
    }),
    [locale, messages, theme, setLocale, setTheme],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function useT() {
  return useContext(PreferencesContext).t;
}

// Inside the signed-in app: translations also print people's names ({actor:U}).
export function PeopleNames({ people, children }) {
  const parent = useContext(PreferencesContext);
  const value = useMemo(
    () => ({ ...parent, t: (key, values) => formatMessage(parent.messages, parent.locale, key, values, { people }) }),
    [parent, people],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Short language codes (EN, DE, …); Ukrainian shows UA so it is not read as "United Kingdom".
export const languageShort = (code) => (code === "uk" ? "UA" : String(code).toUpperCase());

// `short` shows codes for the compact menus in the top bar and on sign-in.
export function LanguageOptions({ short = false }) {
  return LOCALES.map((code) => (
    <option key={code} value={code} title={LANGUAGE_NAMES[code]}>
      {short ? languageShort(code) : LANGUAGE_NAMES[code]}
    </option>
  ));
}

export function DisplayPreferenceControl() {
  const { t, locale, theme, setLocale, setTheme } = usePreferences();
  return (
    <section className="space-y-4 rounded-box border border-base-content/15 bg-base-100 p-4">
      <h2 className="font-semibold">{t("prefs.title")}</h2>
      <label className="form-control">
        <span className="label-text">{t("prefs.language")}</span>
        <select
          className="select"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
        >
          <LanguageOptions />
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="label-text">{t("prefs.theme")}</legend>
        <div className="flex gap-2">
          {["nwts-dark", "nwts-light"].map((option) => (
            <label
              key={option}
              className={`btn min-h-11 flex-1 ${theme === option ? "btn-primary" : "border-base-content/20 btn-ghost"}`}
            >
              <input
                type="radio"
                name="theme"
                className="sr-only"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              {t(`prefs.theme.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
