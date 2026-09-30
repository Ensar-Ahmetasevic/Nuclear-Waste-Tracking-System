"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useT } from "../shell/preferences";
const MotionContext = createContext({ reduced: false, setReduced: () => {} });
export function MotionPreferences({ children }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(localStorage.getItem("nwts-reduce-motion") === "true");
    } catch {
      /* Storage may be disabled; the in-memory preference still works. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduced);
  }, [reduced]);
  function change(value) {
    setReduced(value);
    try {
      localStorage.setItem("nwts-reduce-motion", String(value));
    } catch {
      /* Storage may be disabled; the in-memory preference still works. */
    }
  }
  return (
    <MotionContext.Provider value={{ reduced, setReduced: change }}>
      {children}
    </MotionContext.Provider>
  );
}
// True when the user asked this browser or the system for less motion.
export function useReducedMotion() {
  const { reduced } = useContext(MotionContext);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setSystem(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced || system;
}
export function MotionPreferenceControl() {
  const t = useT();
  const { reduced, setReduced } = useContext(MotionContext);
  return (
    <section className="space-y-3 rounded-box border border-base-content/10 bg-base-100 p-4">
      <h2 className="font-semibold">{t("motion.title")}</h2>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="checkbox"
          checked={reduced}
          onChange={(event) => setReduced(event.target.checked)}
        />
        {t("motion.reduce")}
      </label>
    </section>
  );
}
