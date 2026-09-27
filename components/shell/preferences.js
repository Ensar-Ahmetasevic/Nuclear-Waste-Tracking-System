"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  pickLocale,
  pickTheme,
  translate,
} from "../../lib/i18n";

// The server reads both cookies for the first render, so the page paints in the
// chosen language and theme without a flash.
const PreferencesContext = createContext(null);

function remember(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function PreferencesProvider({ initialLocale, initialTheme, children }) {
  const [locale, setLocaleState] = useState(() => pickLocale(initialLocale));
  const [theme, setThemeState] = useState(() => pickTheme(initialTheme));
  const setLocale = useCallback((value) => {
    const next = pickLocale(value);
    setLocaleState(next);
    document.documentElement.lang = next;
    remember(LOCALE_COOKIE, next);
  }, []);
  const setTheme = useCallback((value) => {
    const next = pickTheme(value);
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    remember(THEME_COOKIE, next);
  }, []);
  const value = useMemo(
    () => ({
      locale,
      theme,
      setLocale,
      setTheme,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, theme, setLocale, setTheme],
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
    () => ({ ...parent, t: (key, values) => translate(parent.locale, key, values, { people }) }),
    [parent, people],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
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
          <option value="en">English</option>
          <option value="de">Deutsch</option>
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
      <p className="text-sm text-base-content/65">{t("prefs.note")}</p>
    </section>
  );
}
