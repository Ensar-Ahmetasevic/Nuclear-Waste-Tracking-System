"use client";
import { createContext, useContext, useEffect, useState } from "react";
const MotionContext = createContext({ reduced: false, setReduced: () => {} });
export function MotionPreferences({ children }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    try {
      setReduced(localStorage.getItem("nwts-reduce-motion") === "true");
    } catch { /* Storage may be disabled; the in-memory preference still works. */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduced);
  }, [reduced]);
  function change(value) {
    setReduced(value);
    try {
      localStorage.setItem("nwts-reduce-motion", String(value));
    } catch { /* Storage may be disabled; the in-memory preference still works. */ }
  }
  return (
    <MotionContext.Provider value={{ reduced, setReduced: change }}>
      {children}
    </MotionContext.Provider>
  );
}
export function MotionPreferenceControl() {
  const { reduced, setReduced } = useContext(MotionContext);
  return (
    <section className="rounded-lg border border-base-content/15 p-4">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="checkbox"
          checked={reduced}
          onChange={(event) => setReduced(event.target.checked)}
        />
        Reduce interface motion
      </label>
      <p className="mt-2 text-sm text-base-content/65">
        Applies in this browser. Your system’s reduced-motion setting is always
        respected.
      </p>
    </section>
  );
}
