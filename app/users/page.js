"use client";
import AccountCreateReview from "@/components/pages/users/account-create-review";
import AccountChangeReview from "@/components/pages/users/account-change-review";
import PermissionMatrix from "@/components/pages/users/permission-matrix";
import { areas } from "../../lib/workspaces.cjs";
import { useEffect, useRef, useState } from "react";
import { LuPencil, LuPlus } from "react-icons/lu";
import { useT } from "../../components/shell/preferences";
import { useFormat } from "../../components/ui/format";
import { TextIn } from "../../components/ui/message-text";
import PageHeader from "../../components/ui/page-header";
import StatusChip from "../../components/ui/status-chip";

const ROLES = ["ADMINISTRATOR", "SUPERVISION", "EMPLOYEE"];
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
  const t = useT();
  const format = useFormat();
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
  // The form opens for a new account or an edit; the list is the page.
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const areaLabel = (key) => (areas[key] ? t(`area.${key}`) : null);
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
    if (editing) {
      setReview({
        original,
        proposed: {
          displayName: form.displayName,
          username: form.username,
          email: form.email,
          role: form.role,
          workArea: form.workArea,
          enabled: form.enabled,
        },
      });
      return;
    }
    if (new TextEncoder().encode(form.password).length > 72) {
      setMessage(t("users.passwordTooLong"));
      event.currentTarget.elements.namedItem("password")?.focus();
      return;
    }
    setCreation({
      displayName: form.displayName.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      workArea: form.role === "EMPLOYEE" ? form.workArea : null,
      actionKey: crypto.randomUUID(),
    });
  }
  const field = (key, type = "text") => (
    <label className="flex flex-col gap-2 text-sm" key={key}>
      {t(`users.field.${key}`)}
      <input
        className="input w-full"
        type={type}
        name={key}
        maxLength={
          key === "displayName"
            ? 100
            : key === "username"
              ? 50
              : key === "email"
                ? 254
                : undefined
        }
        pattern={
          key === "username" ? "[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,49}" : undefined
        }
        required
        value={form[key]}
        autoComplete={key === "password" ? "new-password" : "off"}
        minLength={key === "password" ? 12 : undefined}
        onChange={(event) =>
          setForm((current) => ({ ...current, [key]: event.target.value }))
        }
      />
    </label>
  );
  const card =
    "space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5";
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {review && (
        <AccountChangeReview
          {...review}
          close={() => setReview(null)}
          saved={() => {
            setReview(null);
            setEditing(null);
            setFormOpen(false);
            setForm(empty);
            refresh().catch((error) => setMessage(error.message));
          }}
        />
      )}
      {creation && (
        <AccountCreateReview
          proposed={creation}
          close={() => {
            setCreation(null);
            requestAnimationFrame(() => reviewTrigger.current?.focus());
          }}
          saved={() => {
            setCreation(null);
            setFormOpen(false);
            setForm(empty);
            setMessage(t("users.created"));
            refresh().catch(() => setMessage(t("users.createdNoRefresh")));
          }}
        />
      )}
      <PageHeader
        title={t("users.title")}
        description={t("users.desc")}
        actions={
          role &&
          !formOpen && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={() => {
                setEditing(null);
                setForm(empty);
                setMessage("");
                setFormOpen(true);
              }}
            >
              <LuPlus className="size-5" aria-hidden="true" />
              {t("users.create")}
            </button>
          )
        }
      />
      {message && (
        <p
          role="status"
          className="rounded-box border border-base-content/15 bg-base-200 p-4 text-sm"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">{t("users.loading")}</p>
      ) : (
        role && (
          <div className={`grid gap-6 ${formOpen ? "lg:grid-cols-5" : ""}`}>
            {formOpen && (
              <section
                className={`${card} lg:col-span-2 lg:self-start`}
                aria-labelledby="account-form-title"
              >
                <h2 id="account-form-title" className="text-lg font-semibold">
                  {editing ? t("users.edit") : t("users.create")}
                </h2>
                <form onSubmit={submit}>
                  <fieldset
                    disabled={Boolean(creation)}
                    className="grid min-w-0 gap-4"
                  >
                    {field("displayName")}
                    {field("username")}
                    {field("email", "email")}
                    {!editing && field("password", "password")}
                    <label className="flex flex-col gap-2 text-sm">
                      {t("users.field.role")}
                      <select
                        className="select w-full"
                        value={form.role}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                      >
                        {(role === "ADMINISTRATOR" ? ROLES : ["EMPLOYEE"]).map(
                          (value) => (
                            <option key={value} value={value}>
                              {t(`role.${value}`)}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    {form.role === "EMPLOYEE" && (
                      <label className="flex flex-col gap-2 text-sm">
                        {t("users.field.workArea")}
                        <select
                          required
                          className="select w-full"
                          value={form.workArea || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              workArea: event.target.value,
                            }))
                          }
                        >
                          <option value="">{t("users.chooseStep")}</option>
                          {Object.keys(areas).map((key) => (
                            <option key={key} value={key}>
                              {areaLabel(key)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {editing && (
                      <label className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={form.enabled}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              enabled: event.target.checked,
                            }))
                          }
                        />
                        {t("users.field.active")}
                      </label>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        ref={reviewTrigger}
                        className="btn min-h-11 btn-primary"
                      >
                        {editing
                          ? t("users.reviewChanges")
                          : t("users.reviewNew")}
                      </button>
                      <button
                        className="btn min-h-11 btn-ghost"
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setForm(empty);
                          setFormOpen(false);
                        }}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </fieldset>
                </form>
              </section>
            )}
            <section
              className={`space-y-3 ${formOpen ? "lg:col-span-3" : ""}`}
              aria-labelledby="accounts-title"
            >
              <h2 id="accounts-title" className="text-lg font-semibold">
                {role === "SUPERVISION"
                  ? t("users.employees")
                  : t("users.accounts")}{" "}
                <span className="text-base-content/60">({users.length})</span>
              </h2>
              {users.map((user) => (
                <article
                  key={user.id}
                  className="flex flex-wrap items-center gap-4 rounded-box border border-base-content/10 bg-base-100 p-4"
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-base-content/10 text-sm font-semibold">
                    {(user.displayName || user.username || user.email || "?")
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {user.displayName || user.username || user.email}
                    </p>
                    <p className="text-sm break-all text-base-content/70">
                      {user.username || t("users.emailSignIn")} · {user.email}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      <StatusChip tone="info">
                        {t(`role.${user.role}`)}
                      </StatusChip>
                      <StatusChip tone="neutral">
                        {user.role === "EMPLOYEE"
                          ? areaLabel(user.workArea) || t("role.unassigned")
                          : t("users.allAreas")}
                      </StatusChip>
                      <StatusChip tone={user.active ? "success" : "neutral"}>
                        {user.active ? t("users.active") : t("users.inactive")}
                      </StatusChip>
                    </p>
                  </div>
                  {role === "ADMINISTRATOR" && (
                    <button
                      className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
                      disabled={Boolean(creation)}
                      onClick={() => {
                        setOriginal({ ...user });
                        setEditing(user.id);
                        setForm({
                          ...empty,
                          ...user,
                          username: user.username || "",
                          displayName: user.displayName || "",
                          enabled: user.active,
                        });
                        setMessage("");
                        setFormOpen(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <LuPencil className="size-4" aria-hidden="true" />
                      {t("users.edit")}
                    </button>
                  )}
                </article>
              ))}
            </section>
          </div>
        )
      )}
      {role && (
        <PermissionMatrix
          highlight={
            form.role === "EMPLOYEE" ? form.workArea || null : form.role
          }
        />
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {role === "ADMINISTRATOR" && changes.length > 0 && (
          <section className={card}>
            <h2 className="text-lg font-semibold">{t("users.changes")}</h2>
            {changes.map((change) => (
              <details
                key={change.id}
                className="rounded-xl border border-base-content/15 px-3"
              >
                <summary className="min-h-11 cursor-pointer py-3 text-sm">
                  {t("users.change", {
                    id: change.id,
                    account: change.targetUserId,
                    time: format.dateTime(change.createdAt),
                  })}
                </summary>
                <div className="space-y-2 pb-3 text-sm">
                  <p>{t("ship.recordedBy", { actor: change.actorId })}</p>
                  <p>
                    <TextIn messageKey="ship.reason" text={change.reason} />
                  </p>
                  <p>
                    {t("users.fieldsChanged", {
                      fields: change.changedFields.join(", "),
                    })}
                  </p>
                  {["role", "workArea", "active"]
                    .filter((key) => change.before[key] !== change.after[key])
                    .map((key) => (
                      <div key={key}>
                        <p className="font-semibold">
                          {t(`users.field.${key}`)}
                        </p>
                        <p>
                          {t("ship.before", {
                            value: String(
                              change.before[key] ?? t("users.notAssigned"),
                            ),
                          })}
                        </p>
                        <p>
                          {t("ship.after", {
                            value: String(
                              change.after[key] ?? t("users.notAssigned"),
                            ),
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </details>
            ))}
          </section>
        )}
        {role && creations.length > 0 && (
          <section className={card}>
            <h2 className="text-lg font-semibold">{t("users.creations")}</h2>
            {creations.map((item) => (
              <article
                key={item.id}
                className="rounded-xl bg-base-200/70 px-3 py-2.5 text-sm"
              >
                <p className="font-semibold">
                  {t("users.accountNumber", { id: item.targetUserId })} ·{" "}
                  {t(`role.${item.role}`)} ·{" "}
                  {areaLabel(item.workArea) || t("users.allAreas")}
                </p>
                <p className="text-base-content/70">
                  {t("users.creation", {
                    id: item.id,
                    time: format.dateTime(item.createdAt),
                    actor: item.actorId,
                  })}
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
