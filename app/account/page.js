"use client";
import { MotionPreferenceControl } from "../../components/shared/motion-preferences";
import {
  DisplayPreferenceControl,
  useT,
} from "../../components/shell/preferences";
import PageHeader from "../../components/ui/page-header";
import { roleKey } from "../../lib/navigation";
import { useEffect, useState } from "react";
import { useSessionTransition } from "../../components/loading/session-transition";
import { ButtonSpinner } from "../../components/loading/spinner";
import { InlineLoader } from "../../components/loading/loaders";
export default function AccountPage() {
  const t = useT();
  const { startSignOut } = useSessionTransition();
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
      setMessage(t("account.mismatch"));
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
      startSignOut({ callbackUrl: "/login?passwordChanged=1" });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title={t("nav.account")} description={t("account.desc")} />
      {message && (
        <p
          role="alert"
          className="rounded-box border border-error/40 bg-error/10 p-4 text-sm"
        >
          {message}
        </p>
      )}
      {!user && !message && <InlineLoader context={t("nav.account")} />}
      {user && (
        <section
          aria-label={t("account.profile")}
          className="flex flex-wrap items-center gap-4 rounded-box border border-base-content/10 bg-base-100 p-5"
        >
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-tone-magenta text-lg font-semibold text-white">
            {(user.displayName || user.username || user.email || "?")
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold">
              {user.displayName || user.username || user.email}
            </p>
            <p className="text-sm text-base-content/70">
              {[user.username, user.email].filter(Boolean).join(" · ")}
            </p>
            <p className="text-sm text-base-content/70">
              {t(roleKey(user), { area: t(`area.${user.workArea}`) })}
            </p>
          </div>
        </section>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <DisplayPreferenceControl />
        <MotionPreferenceControl />
      </div>
      {user && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {t("account.password.title")}
            </h2>
            <p className="text-sm text-base-content/70">
              {t("account.password.desc")}
            </p>
          </div>
          {["currentPassword", "newPassword", "confirmation"].map((key) => (
            <label key={key} className="flex flex-col gap-2 text-sm">
              {t(`account.${key}`)}
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
          <button className="btn min-h-11 btn-primary" disabled={busy}>
            {busy ? (
              <>
                <ButtonSpinner />
                {t("common.saving")}
              </>
            ) : (
              t("account.password.submit")
            )}
          </button>
        </form>
      )}
    </main>
  );
}
