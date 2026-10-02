"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LuFileText } from "react-icons/lu";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_KINDS,
  MAX_DOCUMENT_BYTES,
} from "../../../lib/profile-documents.cjs";
import { useT } from "../../shell/preferences";
import { ButtonSpinner } from "../../loading/spinner";
import { Card, CardHeader } from "../../ui/card";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import { TextIn } from "../../ui/message-text";
import { AiTextarea } from "../../ui/proofread";

// base64 content of a file, without the "data:…;base64," prefix.
const read = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function send(path, method, body) {
  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, message: data.message };
  } catch {
    return { ok: false };
  }
}

// Documents kept with Container Profiles: everyone who opens the record reads
// and adds them. Supervision and administrators remove one with a written
// reason; it stays in the list, crossed out. `profiles` are the profile ids the
// card covers: one on the profile page, all of a shipment on its page, where
// each document names its profile.
export default function ProfileDocuments({ profiles, documents, canRemove }) {
  const t = useT();
  const format = useFormat();
  const client = useQueryClient();
  const path = (id) => `/api/profiles/${id}/documents`;
  const several = profiles.length > 1;
  const [profile, setProfile] = useState(several ? "" : profiles[0]);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("");
  const [file, setFile] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // A retry after an unknown outcome repeats the same request.
  const attempt = useRef(null);
  const reload = () =>
    Promise.all(
      ["profileCustody", "shippingInformationIDQueryKey"].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  function reset() {
    attempt.current = null;
    setAdding(false);
    setKind("");
    setProfile(several ? "" : profiles[0]);
    setFile(null);
    setRemoving(null);
    setReason("");
    setMessage("");
  }
  async function add(event) {
    event.preventDefault();
    if (busy || !file || !kind || !profile) return;
    if (file.size > MAX_DOCUMENT_BYTES) return setMessage(t("doc.tooLarge"));
    setBusy(true);
    setMessage("");
    try {
      attempt.current ||= {
        actionKey: crypto.randomUUID(),
        kind,
        fileName: file.name,
        data: await read(file),
      };
      const result = await send(path(profile), "POST", attempt.current);
      if (result.ok) {
        reset();
        await reload();
      } else setMessage(result.message || t("doc.failed"));
    } catch {
      setMessage(t("doc.failed"));
    } finally {
      setBusy(false);
    }
  }
  async function remove(event) {
    event.preventDefault();
    if (busy || reason.trim().length < 3) return;
    setBusy(true);
    setMessage("");
    const result = await send(
      `${path(removing.containerProfileId)}/${removing.id}`,
      "DELETE",
      {
        reason: reason.trim(),
      },
    );
    setBusy(false);
    if (!result.ok) return setMessage(result.message || t("doc.remove.failed"));
    reset();
    await reload();
  }
  const alert = message && (
    <p role="alert" className="text-sm text-error">
      {message}
    </p>
  );
  return (
    <Card
      as="section"
      aria-labelledby="profile-documents-title"
      className="space-y-3"
    >
      <CardHeader
        id="profile-documents-title"
        title={t("doc.title")}
        action={
          !adding && (
            <button
              type="button"
              className="btn min-h-11 border-base-content/20 btn-ghost"
              onClick={() => {
                reset();
                setAdding(true);
              }}
            >
              {t("doc.add")}
            </button>
          )
        }
      />
      {adding && (
        <form
          className="space-y-3 rounded-box bg-base-200/60 p-4"
          onSubmit={add}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {several && (
              <label className="block text-sm font-medium sm:col-span-2">
                {t("label.kind.profile")}
                <select
                  required
                  className="select mt-1 w-full"
                  value={profile}
                  onChange={(event) => setProfile(Number(event.target.value))}
                >
                  <option value="">—</option>
                  {profiles.map((id) => (
                    <option key={id} value={id}>
                      {t("ship.profile", { id })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium">
              {t("doc.kind")}
              <select
                required
                className="select mt-1 w-full"
                value={kind}
                onChange={(event) => {
                  attempt.current = null;
                  setKind(event.target.value);
                }}
              >
                <option value="">—</option>
                {DOCUMENT_KINDS.map((key) => (
                  <option key={key} value={key}>
                    {t(`doc.kind.${key}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              {t("doc.file")}
              <input
                required
                type="file"
                accept={DOCUMENT_ACCEPT}
                className="file-input mt-1 w-full"
                onChange={(event) => {
                  attempt.current = null;
                  setMessage("");
                  setFile(event.target.files[0] || null);
                }}
              />
            </label>
          </div>
          {alert}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn min-h-11 btn-primary"
              disabled={busy}
            >
              {busy && <ButtonSpinner />}
              {t("doc.save")}
            </button>
            <button
              type="button"
              className="btn min-h-11 btn-ghost"
              disabled={busy}
              onClick={reset}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}
      {!documents.length && !adding && (
        <EmptyState>{t("doc.empty")}</EmptyState>
      )}
      <ul className="divide-y divide-base-content/10">
        {documents.map((row) => (
          <li key={row.id} className="space-y-2 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LuFileText
                className="size-5 shrink-0 text-base-content/60"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium [overflow-wrap:anywhere] ${row.removedAt ? "line-through opacity-70" : ""}`}
                >
                  {t(`doc.kind.${row.kind}`)} ·{" "}
                  {row.removedAt && !canRemove ? (
                    row.fileName
                  ) : (
                    <a
                      className="link"
                      href={`${path(row.containerProfileId)}/${row.id}`}
                      download
                    >
                      {row.fileName}
                    </a>
                  )}
                </p>
                <p className="text-xs text-base-content/70">
                  {several && (
                    <>
                      <Link
                        className="link"
                        href={`/profiles/${row.containerProfileId}`}
                      >
                        {t("ship.profile", { id: row.containerProfileId })}
                      </Link>{" "}
                      ·{" "}
                    </>
                  )}
                  {format.number(Math.max(1, Math.round(row.size / 1024)))} KB ·{" "}
                  {format.dateTime(row.createdAt)} ·{" "}
                  {t("custody.user", { id: row.actorId })}
                </p>
                {row.removedAt && (
                  <p className="text-xs text-base-content/70">
                    {t("doc.removed", { time: format.dateTime(row.removedAt) })}{" "}
                    · {t("custody.user", { id: row.removedById })} ·{" "}
                    <TextIn messageKey="ship.reason" text={row.removeReason} />
                  </p>
                )}
              </div>
              {canRemove && !row.removedAt && removing?.id !== row.id && (
                <button
                  type="button"
                  className="btn min-h-11 btn-soft btn-error btn-sm"
                  onClick={() => {
                    reset();
                    setRemoving(row);
                  }}
                >
                  {t("doc.remove")}
                </button>
              )}
            </div>
            {removing?.id === row.id && (
              <form
                className="space-y-3 rounded-box bg-base-200/60 p-4"
                onSubmit={remove}
              >
                <label className="block text-sm font-medium">
                  {t("doc.remove.reason")}
                  <AiTextarea
                    required
                    minLength={3}
                    maxLength={1000}
                    className="textarea mt-1 w-full"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                {alert}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="btn min-h-11 btn-error"
                    disabled={busy || reason.trim().length < 3}
                  >
                    {busy && <ButtonSpinner />}
                    {t("doc.remove.confirm")}
                  </button>
                  <button
                    type="button"
                    className="btn min-h-11 btn-ghost"
                    disabled={busy}
                    onClick={reset}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
