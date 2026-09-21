"use client";
import { MotionPreferenceControl } from "../../components/shared/motion-preferences";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
  });
  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setUser(data.user);
      })
      .catch((error) => setMessage(error.message));
  }, []);
  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (form.newPassword !== form.confirmation) {
      setMessage("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setForm({ currentPassword: "", newPassword: "", confirmation: "" });
      await signOut({ callbackUrl: "/login?passwordChanged=1" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">My account</h1>
      <MotionPreferenceControl />
      {message && <p role="alert">{message}</p>}
      {user && (
        <>
          <div className="rounded-lg bg-base-200 p-4">
            <p className="font-semibold">
              {user.displayName || user.username || user.email}
            </p>
            <p>{user.username}</p>
            <p>
              {
                {
                  ADMINISTRATOR: "Administrator",
                  SUPERVISION: "Supervision",
                  EMPLOYEE: "Employee",
                }[user.role]
              }
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-xl font-semibold">Change password</h2>
            <p className="text-sm text-base-content/70">
              Use at least 12 characters. After saving, sign in again on your
              devices.
            </p>
            {[
              ["currentPassword", "Current password"],
              ["newPassword", "New password"],
              ["confirmation", "Confirm new password"],
            ].map(([key, label]) => (
              <label key={key} className="flex flex-col gap-2">
                {label}
                <input
                  required
                  type="password"
                  className="input w-full"
                  autoComplete={
                    key === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={key === "currentPassword" ? undefined : 12}
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
