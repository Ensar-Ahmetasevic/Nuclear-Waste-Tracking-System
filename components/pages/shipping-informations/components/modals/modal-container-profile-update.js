"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useWasteProfileQuery from "@/requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useLocationOriginQuery from "@/requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";

export default function ModalContainerProfilUpdate({ modalContainerProfilData: original, closeModal }) {
  const origins = useLocationOriginQuery(), wastes = useWasteProfileQuery(), client = useQueryClient();
  const [form, setForm] = useState({ quantity: String(original.quantity), locationOrigin: String(original.locationOriginId), wasteProfile: String(original.wasteProfileId), reason: "" });
  const [phase, setPhase] = useState("edit"), [message, setMessage] = useState(""), [result, setResult] = useState(null);
  const dialog = useRef(null), heading = useRef(null), first = useRef(null), payload = useRef(null), busy = useRef(false);
  useEffect(() => {
    const node = dialog.current, trigger = document.activeElement;
    node.showModal(); heading.current?.focus();
    return () => { node.close(); requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); }); };
  }, []);
  useEffect(() => { if (phase === "edit") first.current?.focus(); else heading.current?.focus(); }, [phase]);
  const update = key => event => { const value = event.target.value; setForm(current => ({ ...current, [key]: value })); };
  const changed = Number(form.quantity) !== original.quantity || Number(form.locationOrigin) !== original.locationOriginId || Number(form.wasteProfile) !== original.wasteProfileId;
  const ready = origins.isSuccess && wastes.isSuccess && !origins.isError && !wastes.isError;
  const origin = origins.data?.find(row => row.id === Number(form.locationOrigin));
  const waste = wastes.data?.find(row => row.id === Number(form.wasteProfile));
  function finish() {
    if (busy.current) return;
    if (result || ["unknown", "conflict"].includes(phase)) client.invalidateQueries();
    closeModal();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true; setPhase("saving"); setMessage("");
    payload.current ||= { preparedData: {
      id: original.id, quantity: Number(form.quantity), locationOrigin: Number(form.locationOrigin), wasteProfile: Number(form.wasteProfile),
      reason: form.reason.trim(), actionKey: crypto.randomUUID(),
      expected: { quantity: original.quantity, locationOriginId: original.locationOriginId, wasteProfileId: original.wasteProfileId, containerStatus: original.containerStatus, truckStatus: original.truckStatus },
    } };
    try {
      const response = await fetch("/api/container-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload.current), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        setPhase(response.status === 409 ? "conflict" : "error"); setMessage(data.message || "Correction could not be saved."); return;
      }
      if (!data.correction?.id) throw Error();
      setResult(data.correction); setPhase("success");
    } catch { setPhase("unknown"); setMessage("Save could not be confirmed. Check the same correction before making another change."); }
    finally { busy.current = false; }
  }
  const rows = [
    ["Quantity", original.quantity, Number(form.quantity)],
    ["Location origin", `${original.locationOrigin.name} (#${original.locationOriginId})`, `${origin?.name || "Unavailable"} (#${form.locationOrigin})`],
    ["Waste profile", `${original.wasteProfile.name} (#${original.wasteProfileId})`, `${waste?.name || "Unavailable"} (#${form.wasteProfile})`],
    ["Review status", original.containerStatus, "pending"],
  ];
  return <dialog ref={dialog} aria-labelledby="container-correction-title" aria-busy={phase === "saving"} className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6" onCancel={event => { event.preventDefault(); finish(); }}>
    <h2 ref={heading} tabIndex={-1} id="container-correction-title" className="text-2xl font-bold">{result ? "Container Profile correction saved" : phase === "edit" ? "Edit Container Profile" : "Review Container Profile correction"}</h2>
    <p className="my-3">Profile #{original.id} · Shipment #{original.shippingInformationId} · {original.truckStatus}</p>
    {original.truckStatus === "OUT" && <p className="my-3 rounded border border-warning p-3">Administrative correction of a departed shipment. This does not record a new arrival or a storage receipt.</p>}
    {phase === "edit" ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (ready && origin && waste && changed && form.reason.trim().length >= 3) { payload.current = null; setMessage(""); setPhase("review"); } }}>
      <label className="block">Quantity<input ref={first} required type="number" min="1" max="2147483647" step="1" className="input mt-1 w-full" value={form.quantity} onChange={update("quantity")} /></label>
      <label className="block">Location origin<select required className="select mt-1 w-full" value={form.locationOrigin} onChange={update("locationOrigin")}><option value="">Choose an origin</option>{origins.data?.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
      <label className="block">Waste profile<select required className="select mt-1 w-full" value={form.wasteProfile} onChange={update("wasteProfile")}><option value="">Choose a waste profile</option>{wastes.data?.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
      {(origins.isPending || wastes.isPending) && <p role="status">Loading profile options…</p>}
      {(origins.isError || wastes.isError) && <p role="alert">Unable to load profile options. <button type="button" className="btn" onClick={() => { origins.refetch(); wastes.refetch(); }}>Retry options</button></p>}
      <label className="block">Reason for correction<textarea required minLength={3} maxLength={1000} className="textarea mt-1 w-full" value={form.reason} onChange={update("reason")} /></label>
      <p className="text-sm">The corrected profile will await pre-storage review. Recorded receipts and transfers cannot be rewritten through this form.</p>
      {!changed && <p className="text-sm">Change a value to review a correction.</p>}
      <button className="btn btn-primary min-h-11" disabled={!ready || !origin || !waste || !changed || form.reason.trim().length < 3}>Review correction</button>
    </form> : <>
      <div className="space-y-3">{rows.map(([label, before, after]) => <div key={label} className="rounded-lg bg-base-200 p-3 break-words"><p className="font-semibold">{label}</p><p>Before: {before}</p><p>After: {after}</p></div>)}</div>
      <p className="my-4 break-words">Reason: {form.reason.trim()}</p>
      {phase === "review" && <button className="btn btn-primary min-h-11" onClick={save}>Confirm correction</button>}
      {phase === "saving" && <p role="status">Saving correction…</p>}
      {result && <p role="status" className="operational-confirm my-4 text-success">Correction #{result.id} · {new Date(result.createdAt).toLocaleString()} · User #{result.actorId}</p>}
      {message && <p role="alert" className="my-4">{message}</p>}
      {phase === "unknown" && <button className="btn btn-primary min-h-11" onClick={save}>Check save result</button>}
    </>}
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      {["review", "error"].includes(phase) && <button className="btn btn-outline min-h-11" onClick={() => setPhase("edit")}>Back to edit</button>}
      <button className="btn btn-outline min-h-11" disabled={phase === "saving"} onClick={finish}>{result ? "Done" : phase === "conflict" ? "Close and reload profile" : phase === "unknown" ? "Close — save remains unconfirmed" : "Cancel"}</button>
    </div>
  </dialog>;
}
