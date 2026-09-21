"use client";
import { useEffect, useRef, useState } from "react";
import { areas } from "@/lib/workspaces.cjs";
const labels = { displayName: "Full name", username: "Username", email: "Email", role: "Access level", workArea: "Work area", active: "Account active" };
const display = (key, value) => key === "active" ? value ? "Active" : "Inactive" : key === "workArea" ? areas[value]?.title || "All work areas / not assigned" : value || "Not recorded";
export default function AccountChangeReview({ original, proposed, close, saved }) {
  const [reason, setReason] = useState(""), [phase, setPhase] = useState("review"), [message, setMessage] = useState(""), [result, setResult] = useState(null);
  const dialog = useRef(null), heading = useRef(null), payload = useRef(null), busy = useRef(false);
  const after = { ...proposed, active: proposed.enabled, workArea: proposed.role === "EMPLOYEE" ? proposed.workArea : null };
  const keys = Object.keys(labels).filter(key => original[key] !== after[key]);
  const newSession = !after.active || original.role !== after.role || original.workArea !== after.workArea;
  useEffect(() => { const node=dialog.current, trigger=document.activeElement; node.showModal(); heading.current?.focus(); return () => {node.close(); if(trigger?.isConnected)trigger.focus();}; }, []);
  function finish() { if(!busy.current) { if(result || phase === "unknown" || phase === "conflict") saved(); else close(); } }
  async function save(event) {
    event?.preventDefault(); if(busy.current) return;
    busy.current=true; setPhase("saving"); setMessage("");
    payload.current ||= { ...proposed, id:original.id, expected:Object.fromEntries(Object.keys(labels).map(key=>[key === "active" ? "enabled" : key,original[key]])), reason:reason.trim(), actionKey:crypto.randomUUID() };
    try {
      const response=await fetch("/api/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload.current),signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok) {if(response.status>=500)throw Error(); setPhase(response.status===409?"conflict":"error");setMessage(data.message || "Unable to save changes.");return;}
      if(!data.change?.id)throw Error();
      setResult(data.change);setPhase("success");heading.current?.focus();
    } catch {setPhase("unknown");setMessage("Save could not be confirmed. Check the same attempt before making another change.");}
    finally {busy.current=false;}
  }
  return <dialog ref={dialog} aria-labelledby="account-review-title" className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content" onCancel={event=>{event.preventDefault();finish();}}>
    <h2 ref={heading} tabIndex={-1} id="account-review-title" className="text-2xl font-bold">{result?"Account changes saved":"Review account changes"}</h2>
    <p className="my-3">Account #{original.id} · {original.username || original.email}</p>
    <div className="space-y-3">{keys.map(key=><div key={key} className="rounded-lg bg-base-200 p-3 break-words"><p className="font-semibold">{labels[key]}</p><p>Before: {display(key,original[key])}</p><p>After: {display(key,after[key])}</p></div>)}</div>
    {!keys.length && <p className="my-3">No changes to save.</p>}
    {newSession && <p className="my-4 rounded border border-warning p-3">{after.active ? "The user will need to sign in again to use the changed access." : "The account will be inactive and its existing session will lose access."}</p>}
    {phase === "review" && <form onSubmit={save} className="mt-4 space-y-3"><label className="block">Reason for change<textarea required minLength={3} maxLength={1000} className="textarea mt-1 w-full" value={reason} onChange={event=>setReason(event.target.value)}/></label><p className="text-sm">Describe the access change. Do not include passwords or other secrets.</p><button className="btn btn-primary min-h-11" disabled={!keys.length || reason.trim().length<3}>Confirm account changes</button></form>}
    {phase === "saving" && <p role="status" className="my-4">Saving account changes…</p>}
    {result && <p role="status" className="operational-confirm my-4 text-success">Change #{result.id} saved · {new Date(result.createdAt).toLocaleString()} · User #{result.actorId}</p>}
    <p className="my-4" aria-live="polite">{message}</p>
    {phase === "unknown" && <button className="btn btn-primary min-h-11" onClick={()=>save()}>Check save result</button>}
    <div className="mt-5 flex justify-end"><button className="btn btn-outline min-h-11" disabled={phase==="saving"} onClick={finish}>{result?"Done":phase==="conflict"?"Close and reload accounts":phase==="unknown"?"Close — save remains unconfirmed":"Back to edit"}</button></div>
  </dialog>;
}
