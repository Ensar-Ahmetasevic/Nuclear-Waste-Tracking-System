"use client";
import { useEffect, useRef, useState } from "react";
import { areas } from "@/lib/workspaces.cjs";
const roles = { ADMINISTRATOR: "Administrator", SUPERVISION: "Supervision", EMPLOYEE: "Employee" };

export default function AccountCreateReview({ proposed, close, saved }) {
  const [phase, setPhase] = useState("review");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(true);
  const dialog = useRef(null), heading = useRef(null), resume = useRef(null), busy = useRef(false);
  const unconfirmed = phase === "unknown";
  useEffect(() => {
    if (!visible) { resume.current?.focus(); return; }
    const node = dialog.current, trigger = document.activeElement;
    node.showModal(); heading.current?.focus();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, [visible]);
  useEffect(() => { if (visible && phase !== "review") heading.current?.focus(); }, [phase, visible]);
  function finish() {
    if (busy.current) return;
    if (result) saved();
    else if (unconfirmed) setVisible(false);
    else close();
  }
  async function confirm() {
    if (busy.current) return;
    busy.current = true; setPhase("saving"); setMessage("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proposed), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) {
        // A concurrent transaction may have committed this same confirmation.
        if (response.status >= 500 || response.status === 409) throw new Error();
        setPhase("error"); setMessage(data.message || "Account was not created. Review the entered details."); return;
      }
      if (!data.creation?.id) throw new Error();
      setResult(data.creation); setPhase("success"); heading.current?.focus();
    } catch {
      setPhase("unknown"); setMessage("Creation could not be confirmed. Check this same attempt before creating another account. Checking will not change the account's password.");
    } finally { busy.current = false; }
  }
  if (!visible) return <section className="rounded-xl border border-warning p-4" aria-label="Unconfirmed account creation">
    <p role="status">Account creation remains unconfirmed for {proposed.username}. Your review is kept while this page stays open.</p>
    <button ref={resume} className="btn btn-outline mt-3 min-h-11" onClick={() => setVisible(true)}>Resume creation review</button>
  </section>;
  const workArea = areas[proposed.workArea];
  return <dialog ref={dialog} aria-busy={phase === "saving"} aria-labelledby="account-create-title" className="receipt-dialog operational-panel rounded-xl border border-base-content/20 bg-base-100 p-6 text-base-content" onCancel={event => { event.preventDefault(); finish(); }}>
    <h2 ref={heading} id="account-create-title" tabIndex={-1} className="text-2xl font-bold">{result ? "Account created" : "Review new account"}</h2>
    <dl className="my-4 space-y-3 break-words">
      {[["Full name", proposed.displayName], ["Username", proposed.username], ["Email", proposed.email], ["Access level", roles[proposed.role]], ["Work area", proposed.role === "EMPLOYEE" ? `Step ${workArea?.step} · ${workArea?.title}` : "All work areas"]].map(([label, value]) => <div key={label}><dt className="text-sm text-base-content/70">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
    </dl>
    <p className="rounded-lg bg-base-200 p-3">{proposed.role === "EMPLOYEE" ? "This employee can work only in the selected Step. Existing restrictions on completed records still apply." : proposed.role === "SUPERVISION" ? "This account can oversee all work areas and create Employee accounts." : "This account can manage users, access all work areas and make permitted administrative corrections."}</p>
    <p className="my-4 text-sm">The account will be active immediately. Share the assigned username and password directly with the user. No invitation is sent. The password is hidden from this review.</p>
    {phase === "saving" && <p role="status">Creating account…</p>}
    {message && <p className="my-4" role="alert">{message}</p>}
    {result && <p role="status" className="operational-confirm my-4 text-success">Account #{result.targetUserId} · Creation #{result.id} confirmed · {new Date(result.createdAt).toLocaleString()} · User #{result.actorId}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button className="btn btn-outline min-h-11" disabled={phase === "saving"} onClick={finish}>{result ? "Done" : unconfirmed ? "Close review — keep attempt" : "Back to edit"}</button>
      {(phase === "review" || unconfirmed) && <button className="btn btn-primary min-h-11" onClick={confirm}>{unconfirmed ? "Check creation result" : "Confirm account creation"}</button>}
    </div>
  </dialog>;
}
