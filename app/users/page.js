"use client";
import AccountCreateReview from "@/components/pages/users/account-create-review";
import AccountChangeReview from "@/components/pages/users/account-change-review";
import { areas } from "../../lib/workspaces.cjs";
import { useEffect, useRef, useState } from "react";
const labels = {
  ADMINISTRATOR: "Administrator",
  SUPERVISION: "Supervision",
  EMPLOYEE: "Employee",
};
const empty = {
  displayName: "",
  username: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
  enabled: true,
  workArea: "",
};
export default function UsersPage() {
  const reviewTrigger = useRef(null);
  const [review, setReview] = useState(null);
  const [creation, setCreation] = useState(null);
  const [creations, setCreations] = useState([]);
  const [changes, setChanges] = useState([]);
  const [original, setOriginal] = useState(null);
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setUsers(data.users);
    setChanges(data.changes || []);
    setCreations(data.creations || []);
    setRole(data.role);
  }
  useEffect(() => {
    refresh()
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);
  function submit(event) {
    event.preventDefault();
    if (creation) return;
    setMessage("");
    if (editing) { setReview({ original, proposed: { displayName: form.displayName, username: form.username, email: form.email, role: form.role, workArea: form.workArea, enabled: form.enabled } }); return; }
    if (new TextEncoder().encode(form.password).length > 72) {
      setMessage("Password must be at most 72 UTF-8 bytes. Shorten it before reviewing.");
      event.currentTarget.elements.namedItem("password")?.focus();
      return;
    }
    setCreation({ displayName: form.displayName.trim(), username: form.username.trim().toLowerCase(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role, workArea: form.role === "EMPLOYEE" ? form.workArea : null, actionKey: crypto.randomUUID() });
  }
  const field = (key, label, type = "text") => (
    <label className="flex flex-col gap-2" key={key}>
      {label}
      <input
        className="input w-full"
        type={type}
        name={key}
        maxLength={key === "displayName" ? 100 : key === "username" ? 50 : key === "email" ? 254 : undefined}
        pattern={key === "username" ? "[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,49}" : undefined}
        required
        value={form[key]}
        autoComplete={key === "password" ? "new-password" : "off"}
        minLength={key === "password" ? 12 : undefined}
        onChange={(event) => setForm(current => ({ ...current, [key]: event.target.value }))}
      />
    </label>
  );
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {review && <AccountChangeReview {...review} close={() => setReview(null)} saved={() => { setReview(null); setEditing(null); setForm(empty); refresh().catch(error => setMessage(error.message)); }} />}
      {creation && <AccountCreateReview proposed={creation} close={() => { setCreation(null); requestAnimationFrame(() => reviewTrigger.current?.focus()); }} saved={() => {
        setCreation(null); requestAnimationFrame(() => reviewTrigger.current?.focus()); setForm(empty); setMessage("Account creation confirmed. The user can sign in with the assigned credentials.");
        refresh().catch(() => setMessage("Account creation confirmed, but the account list could not be refreshed. Reload the page to update it."));
      }} />}
      <div>
        <h1 className="text-3xl font-bold">User management</h1>
        <p className="mt-2 text-base-content/70">
          Accounts and access within your organization.
        </p>
      </div>
      {message && (
        <p role="status" className="rounded-lg bg-base-200 p-4">
          {message}
        </p>
      )}
      {loading ? (
        <p>Loading accounts…</p>
      ) : (
        role && (
          <>
            <section className="rounded-xl border border-base-300 p-5">
              <h2 className="mb-4 text-xl font-semibold">
                {editing ? "Edit account" : "Create account"}
              </h2>
              <form onSubmit={submit}><fieldset disabled={Boolean(creation)} className="grid min-w-0 gap-4 sm:grid-cols-2">
                {field("displayName", "Full name")}
                {field("username", "Username")}
                {field("email", "Email", "email")}
                {!editing &&
                  field(
                    "password",
                    "Password (at least 12 characters)",
                    "password",
                  )}
                <label className="flex flex-col gap-2">
                  Access level
                  <select
                    className="select w-full"
                    value={form.role}
                    onChange={(event) =>
                      setForm(current => ({ ...current, role: event.target.value }))
                    }
                  >
                    {(role === "ADMINISTRATOR"
                      ? Object.keys(labels)
                      : ["EMPLOYEE"]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {labels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                {form.role === "EMPLOYEE" && <label className="flex flex-col gap-2">Work area<select required className="select w-full" value={form.workArea || ""} onChange={event => setForm(current => ({ ...current, workArea: event.target.value }))}><option value="">Choose a Step</option>{Object.entries(areas).map(([key, area]) => <option key={key} value={key}>Step {area.step} · {area.title}</option>)}</select></label>}
                {editing && (
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={form.enabled}
                      onChange={(event) =>
                        setForm(current => ({ ...current, enabled: event.target.checked }))
                      }
                    />
                    Account active
                  </label>
                )}
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button ref={reviewTrigger} className="btn btn-primary min-h-11">
                    {editing ? "Review changes" : "Review new account"}
                  </button>
                  {editing && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setForm(empty);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </fieldset></form>
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">
                {role === "SUPERVISION" ? "Employees" : "Organization accounts"}
              </h2>
              {users.map((user) => (
                <article
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-base-300 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {user.displayName || user.username || user.email}
                    </p>
                    <p className="text-sm break-all text-base-content/70">
                      {user.username || "Email sign-in"} · {user.email}
                    </p>
                    <p className="mt-1 text-sm">
                      {labels[user.role]} · {user.role === "EMPLOYEE" ? (areas[user.workArea]?.title || "Work area not assigned") : "All work areas"} ·{" "}
                      {user.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  {role === "ADMINISTRATOR" && (
                    <button
                      className="btn btn-sm"
                      disabled={Boolean(creation)}
                      onClick={() => {
                        setOriginal({ ...user });
                        setEditing(user.id);
                        setForm({ ...empty, ...user, username: user.username || "", displayName: user.displayName || "", enabled: user.active });
                        setMessage("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit account
                    </button>
                  )}
                </article>
              ))}
            </section>
          </>
        )
      )}
      {role === "ADMINISTRATOR" && <section className="space-y-3 rounded-xl border border-base-300 p-5">
        <h2 className="text-xl font-semibold">Recent account changes</h2>
        <p className="text-sm">Latest 20 recorded changes. Earlier account changes without an audit record are not reconstructed.</p>
        {!changes.length && <p>No account changes recorded yet.</p>}
        {changes.map(change => <details key={change.id} className="rounded border border-base-content/20 p-3">
          <summary className="min-h-11 cursor-pointer">Change #{change.id} · Account #{change.targetUserId} · {new Date(change.createdAt).toLocaleString()}</summary>
          <p className="my-2">Recorded by User #{change.actorId}</p><p className="break-words">Reason: {change.reason}</p>
          <p className="my-2">Fields changed: {change.changedFields.join(", ")}</p>
          {["role", "workArea", "active"].filter(key=>change.before[key] !== change.after[key]).map(key=><div key={key} className="mt-2"><p className="font-semibold">{{role:"Access level",workArea:"Work area",active:"Account active"}[key]}</p><p>Before: {String(change.before[key] ?? "Not assigned")}</p><p>After: {String(change.after[key] ?? "Not assigned")}</p></div>)}
        </details>)}
      </section>}
      {role && <section className="space-y-3 rounded-xl border border-base-300 p-5">
        <h2 className="text-xl font-semibold">Recent account creations</h2>
        <p className="text-sm">Latest 20 recorded creations{role === "SUPERVISION" ? " by you" : " in this organization"}. Earlier accounts without a creation receipt are not reconstructed.</p>
        {!creations.length && <p>No account creations recorded yet.</p>}
        {creations.map(item => <article key={item.id} className="rounded border border-base-content/20 p-3">
          <p className="font-semibold">Account #{item.targetUserId} · {labels[item.role]} · {areas[item.workArea]?.title || "All work areas"}</p>
          <p className="mt-2 text-sm">Creation #{item.id} · {new Date(item.createdAt).toLocaleString()} · User #{item.actorId}</p>
        </article>)}
      </section>}
    </main>
  );
}
