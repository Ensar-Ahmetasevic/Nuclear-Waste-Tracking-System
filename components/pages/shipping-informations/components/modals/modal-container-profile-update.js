"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useWasteProfileQuery from "@/requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useLocationOriginQuery from "@/requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { InlineLoader } from "../../../../loading/loaders";
import { AiTextarea } from "../../../../ui/proofread";
import ReturnReport from "../../container-data/return-report";

export default function ModalContainerProfilUpdate({
  modalContainerProfilData: original,
  closeModal,
}) {
  const t = useT();
  const format = useFormat();
  const origins = useLocationOriginQuery(),
    wastes = useWasteProfileQuery(),
    client = useQueryClient();
  const [form, setForm] = useState({
    quantity: String(original.quantity),
    locationOrigin: String(original.locationOriginId),
    wasteProfile: String(original.wasteProfileId),
    reason: "",
  });
  const [phase, setPhase] = useState("edit"),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    first = useRef(null),
    payload = useRef(null),
    busy = useRef(false);
  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    heading.current?.focus();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, []);
  useEffect(() => {
    if (phase === "edit") first.current?.focus();
    else heading.current?.focus();
  }, [phase]);
  const update = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const changed =
    Number(form.quantity) !== original.quantity ||
    Number(form.locationOrigin) !== original.locationOriginId ||
    Number(form.wasteProfile) !== original.wasteProfileId;
  const ready =
    origins.isSuccess &&
    wastes.isSuccess &&
    !origins.isError &&
    !wastes.isError;
  // The current definition may be archived and can be kept; other archived ones are not offered.
  const originOptions =
    origins.data?.filter(
      (row) => !row.archivedAt || row.id === original.locationOriginId,
    ) || [];
  const wasteOptions =
    wastes.data?.filter(
      (row) => !row.archivedAt || row.id === original.wasteProfileId,
    ) || [];
  const origin = originOptions.find(
    (row) => row.id === Number(form.locationOrigin),
  );
  const waste = wasteOptions.find(
    (row) => row.id === Number(form.wasteProfile),
  );
  function finish() {
    if (busy.current) return;
    if (result || ["unknown", "conflict"].includes(phase))
      client.invalidateQueries();
    closeModal();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      preparedData: {
        id: original.id,
        quantity: Number(form.quantity),
        locationOrigin: Number(form.locationOrigin),
        wasteProfile: Number(form.wasteProfile),
        reason: form.reason.trim(),
        actionKey: crypto.randomUUID(),
        expected: {
          quantity: original.quantity,
          locationOriginId: original.locationOriginId,
          wasteProfileId: original.wasteProfileId,
          containerStatus: original.containerStatus,
          truckStatus: original.truckStatus,
        },
      },
    };
    try {
      const response = await fetch("/api/container-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("corr.failed"));
        return;
      }
      if (!data.correction?.id) throw Error();
      setResult(data.correction);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("corr.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  const rows = [
    [t("field.quantity"), original.quantity, Number(form.quantity)],
    [
      t("field.locationOrigin"),
      `${original.locationOrigin.name} (#${original.locationOriginId})`,
      `${origin?.name || t("ship.notRecorded")} (#${form.locationOrigin})`,
    ],
    [
      t("field.wasteProfile"),
      `${original.wasteProfile.name} (#${original.wasteProfileId})`,
      `${waste?.name || t("ship.notRecorded")} (#${form.wasteProfile})`,
    ],
    [
      t("field.containerStatus"),
      t(`profile.${original.containerStatus}`),
      t("profile.pending"),
    ],
  ];
  return (
    <dialog
      ref={dialog}
      aria-labelledby="container-correction-title"
      aria-busy={phase === "saving"}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="container-correction-title"
        className="text-2xl font-semibold"
      >
        {result
          ? t("corr.done")
          : phase === "edit"
            ? t("corr.title")
            : t("corr.review")}
      </h2>
      <p className="my-3">
        {t("ship.profile", { id: original.id })} ·{" "}
        {t("ship.number", { id: original.shippingInformationId })} ·{" "}
        {original.truckStatus}
      </p>
      {original.truckStatus === "OUT" && (
        <p className="my-3 rounded-xl border border-warning p-3">
          {t("corr.outNote")}
        </p>
      )}
      {/* The Pre-storage report explains what to check and correct. */}
      {phase === "edit" && original.containerStatus === "rejected" && original.lastReturn && (
        <div className="my-3">
          <ReturnReport report={original.lastReturn} profileId={original.id} />
        </div>
      )}
      {phase === "edit" ? (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              ready &&
              origin &&
              waste &&
              changed &&
              form.reason.trim().length >= 3
            ) {
              const reason = form.reason.trim();
              setForm((current) => ({ ...current, reason }));
              payload.current = null;
              setMessage("");
              setPhase("review");
            }
          }}
        >
          <label className="block text-sm">
            {t("field.quantity")}
            <input
              ref={first}
              required
              type="number"
              min="1"
              max="2147483647"
              step="1"
              className="input mt-1 w-full"
              value={form.quantity}
              onChange={update("quantity")}
            />
          </label>
          <label className="block text-sm">
            {t("field.locationOrigin")}
            <select
              required
              className="select mt-1 w-full"
              value={form.locationOrigin}
              onChange={update("locationOrigin")}
            >
              <option value="">{t("prep.chooseOrigin")}</option>
              {originOptions.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.name}
                  {row.archivedAt ? ` (${t("def.archivedTag")})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("field.wasteProfile")}
            <select
              required
              className="select mt-1 w-full"
              value={form.wasteProfile}
              onChange={update("wasteProfile")}
            >
              <option value="">{t("prep.chooseWaste")}</option>
              {wasteOptions.map((row) => (
                <option value={row.id} key={row.id}>
                  {row.name}
                  {row.archivedAt ? ` (${t("def.archivedTag")})` : ""}
                </option>
              ))}
            </select>
          </label>
          {(origins.isPending || wastes.isPending) && (
            <InlineLoader />
          )}
          {(origins.isError || wastes.isError) && (
            <p role="alert">
              {t("prep.optionsError")}{" "}
              <button
                type="button"
                className="btn min-h-11"
                onClick={() => {
                  origins.refetch();
                  wastes.refetch();
                }}
              >
                {t("alert.retry")}
              </button>
            </p>
          )}
          <label className="block text-sm">
            {t("corr.reason")}
            <AiTextarea
              required
              minLength={3}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={form.reason}
              onChange={update("reason")}
            />
          </label>
          <p className="text-sm text-base-content/70">{t("corr.note")}</p>
          {!changed && <p className="text-sm">{t("def.error.unchanged")}</p>}
          <button
            className="btn min-h-11 btn-primary"
            disabled={
              !ready ||
              !origin ||
              !waste ||
              !changed ||
              form.reason.trim().length < 3
            }
          >
            {t("recon.correct.reviewButton")}
          </button>
        </form>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map(([label, before, after]) => (
              <div
                key={label}
                className="rounded-xl bg-base-200/70 p-3 break-words"
              >
                <p className="font-semibold">{label}</p>
                <p>{t("ship.before", { value: before })}</p>
                <p>{t("ship.after", { value: after })}</p>
              </div>
            ))}
          </div>
          <p className="my-4 break-words">
            {t("ship.reason", { reason: form.reason.trim() })}
          </p>
          {phase === "review" && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              {t("corr.confirm")}
            </button>
          )}
          {phase === "saving" && <InlineLoader save />}
          {result && (
            <p role="status" className="operational-confirm my-4 text-success">
              {t("corr.result", {
                id: result.id,
                time: format.dateTime(result.createdAt),
                actor: result.actorId,
              })}
            </p>
          )}
          {message && (
            <p role="alert" className="my-4">
              {message}
            </p>
          )}
          {phase === "unknown" && (
            <button className="btn min-h-11 btn-primary" onClick={save}>
              {t("users.change.check")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {["review", "error"].includes(phase) && (
          <button
            className="btn min-h-11 btn-outline"
            onClick={() => setPhase("edit")}
          >
            {t("users.review.back")}
          </button>
        )}
        <button
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("prep.closeReload")
              : phase === "unknown"
                ? t("users.change.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
