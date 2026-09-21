"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

const fields = [["companyName", "Company name"], ["driverName", "Driver name"], ["registrationPlates", "Registration plates"]];
export default function FormTruckData({ onSubmitForm, closeModal }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [phase, setPhase] = useState("edit"), [draft, setDraft] = useState(null), [result, setResult] = useState(null), [message, setMessage] = useState("");
  const dialog = useRef(null), heading = useRef(null), busy = useRef(false);
  const client = useQueryClient();
  useEffect(() => {
    const node = dialog.current, trigger = document.activeElement;
    node.showModal(); heading.current?.focus();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  useEffect(() => { if (phase === "edit") (dialog.current?.querySelector("input") || heading.current)?.focus(); else heading.current?.focus(); }, [phase]);
  function finish() {
    if (busy.current) return;
    if (result || phase === "unknown") client.invalidateQueries();
    if (result) onSubmitForm(); else closeModal();
  }
  function review(values) {
    setDraft({ ...Object.fromEntries(fields.map(([key]) => [key, values[key].trim()])), actionKey: crypto.randomUUID() });
    setMessage(""); setPhase("review");
  }
  async function save() {
    if (busy.current) return;
    busy.current = true; setPhase("saving"); setMessage("");
    try {
      const response = await fetch("/api/shipping-informations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error("Unconfirmed");
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || "Unable to record arrival."); return;
      }
      if (!data.arrival?.shipmentId) throw Error("Missing confirmation");
      setResult(data.arrival); setPhase("success");
    } catch { setPhase("unknown"); setMessage("Arrival could not be confirmed. Check this same attempt before creating another arrival."); }
    finally { busy.current = false; }
  }
  return <dialog ref={dialog} aria-labelledby="arrival-title" className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content" onCancel={event => { event.preventDefault(); finish(); }}>
    <h2 ref={heading} tabIndex={-1} id="arrival-title" className="text-2xl font-bold">{result ? "Arrival recorded" : phase === "edit" ? "Record truck arrival" : "Review truck arrival"}</h2>
    <p className="my-4 text-sm">Step 1 · Shipping information</p>
    <form noValidate onSubmit={handleSubmit(review)} className={phase === "edit" ? "space-y-4" : "hidden"}>
      {fields.map(([key, label]) => <div key={key}>
        <label htmlFor={`arrival-${key}`} className="block text-sm">{label}</label>
        <input id={`arrival-${key}`} className="input mt-1 w-full" aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `arrival-error-${key}` : undefined} {...register(key, { validate: value => Boolean(value?.trim()) || `${label} is required`, maxLength: { value: 200, message: "Use at most 200 characters" } })} />
        {errors[key] && <p id={`arrival-error-${key}`} role="alert" className="mt-1 text-sm text-error">{errors[key].message}</p>}
      </div>)}
      <button type="submit" className="btn btn-primary min-h-11">Review arrival</button>
    </form>
    {phase !== "edit" && <div className="space-y-4">
      <dl className="space-y-3 rounded-lg bg-base-200 p-4">{fields.map(([key, label]) => <div key={key}><dt className="text-sm text-base-content/70">{label}</dt><dd className="break-words font-medium">{(result?.snapshot || draft)?.[key]}</dd></div>)}</dl>
      {result ? <div role="status" className="operational-confirm space-y-2"><p className="font-semibold text-success">Shipment #{result.shipmentId} · Arrival recorded</p><p>Recorded at {new Date(result.createdAt).toLocaleString()} · User #{result.actorId}</p><p>Open the shipment to record its containers. This confirmation records the arrival only.</p></div> : <p>The shipment will be recorded as IN. Arrival time is recorded by the server when you confirm.</p>}
      {phase === "saving" && <p role="status">Recording arrival…</p>}
      {phase === "review" && <div className="flex flex-wrap gap-3"><button className="btn min-h-11" onClick={() => setPhase("edit")}>Back to edit</button><button className="btn btn-primary min-h-11" onClick={save}>Confirm arrival</button></div>}
      {phase === "error" && <button className="btn min-h-11" onClick={() => setPhase("edit")}>Back to edit</button>}
      {phase === "unknown" && <button className="btn btn-primary min-h-11" onClick={save}>Check save result</button>}
    </div>}
    <p className="my-4 text-sm" aria-live="polite">{message}</p>
    <div className="mt-5 flex justify-end border-t border-base-content/20 pt-4"><button className="btn btn-outline min-h-11" disabled={phase === "saving"} onClick={finish}>{result ? "Done — open shipments" : phase === "unknown" ? "Close — arrival remains unconfirmed" : "Cancel"}</button></div>
  </dialog>;
}
