"use client";
import "./globals.css";
import { useEffect, useMemo, useState } from "react";
import LoadingProblem from "../components/loading/loading-problem";
import { createProblem } from "../components/loading/problems";
import { PreferencesProvider, useT } from "../components/shell/preferences";
import { LOCALE_COOKIE, THEME_COOKIE, pickLocale, pickTheme } from "../lib/i18n";

function readCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function Problem({ error, retry }) {
  const t = useT();
  const problem = useMemo(
    () => createProblem({ error, context: t("problem.appContext") }),
    [error, t],
  );
  return <LoadingProblem problem={problem} onRetry={retry} />;
}

// Replaces the root layout when it fails, so it brings its own document and
// reads language and theme from the cookies itself.
export default function GlobalError({ error, retry, reset }) {
  const [prefs, setPrefs] = useState({ locale: "en", theme: "nwts-dark" });
  useEffect(() => {
    setPrefs({
      locale: pickLocale(readCookie(LOCALE_COOKIE)),
      theme: pickTheme(readCookie(THEME_COOKIE)),
    });
  }, []);
  return (
    <html lang={prefs.locale} data-theme={prefs.theme}>
      <body className="nwts-blueprint grid min-h-dvh place-items-center bg-base-300 p-4 font-sans">
        <div className="w-full max-w-xl">
          <PreferencesProvider
            key={`${prefs.locale}:${prefs.theme}`}
            initialLocale={prefs.locale}
            initialTheme={prefs.theme}
          >
            <Problem error={error} retry={retry || reset} />
          </PreferencesProvider>
        </div>
      </body>
    </html>
  );
}
