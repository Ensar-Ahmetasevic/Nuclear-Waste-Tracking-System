"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useLocationOriginQuery from "@/requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import useWasteProfileQuery from "@/requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import { useT } from "../../../../shell/preferences";
import { useFormat } from "../../../../ui/format";
import { InlineLoader } from "../../../../loading/loaders";

export default function FormContainerProfile({
  shipment,
  open,
  closeModal,
  suspend,
  onUnconfirmed,
}) {
  const t = useT();
  const format = useFormat();
  const [original] = useState(shipment);
  const [form, setForm] = useState({
    quantity: "",
    locationOriginId: "",
    wasteProfileId: "",
    reason: "",
  });
  const [phase, setPhase] = useState("edit"),
    [message, setMessage] = useState(""),
    [result, setResult] = useState(null),
    [review, setReview] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    first = useRef(null),
    busy = useRef(false),
    payload = useRef(null);
  const titleId = useId();
  const origins = useLocationOriginQuery(),
    wastes = useWasteProfileQuery(),
    client = useQueryClient();
  // Archived definitions stay on existing profiles but are not offered for new ones.
  const activeOrigins = origins.data?.filter((row) => !row.archivedAt) || [],
    activeWastes = wastes.data?.filter((row) => !row.archivedAt) || [];
  const origin = activeOrigins.find(
    (row) => row.id === Number(form.locationOriginId),
  );
  const waste = activeWastes.find(
    (row) => row.id === Number(form.wasteProfileId),
  );
  const ready =
    origins.isSuccess &&
    wastes.isSuccess &&
    !origins.isError &&
    !wastes.isError;
  useEffect(() => {
    if (!open) return;
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
  }, [open]);
  useEffect(() => {
    if (phase === "edit") first.current?.focus();
    else heading.current?.focus();
  }, [phase]);
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  function finish() {
    if (busy.current) return;
    if (phase === "unknown") {
      suspend();
      return;
    }
    if (result || phase === "conflict") client.invalidateQueries();
    closeModal();
  }
  function prepare(event) {
    event.preventDefault();
    if (!ready || !origin || !waste?.containerType) return;
    if (original.truckStatus === "OUT" && form.reason.trim().length < 3) return;
    payload.current = {
      quantity: Number(form.quantity),
      locationOriginId: origin.id,
      wasteProfileId: waste.id,
      shippingInformationId: original.id,
      actionKey: crypto.randomUUID(),
      reason: form.reason.trim(),
      expected: {
        truckStatus: original.truckStatus,
        status: original.status,
        containerTypeId: waste.containerTypeId,
      },
    };
    setReview({
      quantity: Number(form.quantity),
      origin: `${origin.name} (#${origin.id})`,
      waste: `${waste.name} (#${waste.id})`,
      type: `${waste.containerType.name} (#${waste.containerTypeId})`,
      reason: form.reason.trim(),
    });
    setMessage("");
    setPhase("review");
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    try {
      const response = await fetch("/api/container-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.current),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        onUnconfirmed(false);
        setPhase(response.status === 409 ? "conflict" : "error");
        setMessage(data.message || t("prep.failed"));
        return;
      }
      if (!data.preparation?.id || !data.preparation?.containerProfileId)
        throw Error();
      onUnconfirmed(false);
      setResult(data.preparation);
      setPhase("success");
    } catch {
      onUnconfirmed(true);
      setPhase("unknown");
      setMessage(t("prep.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        id={titleId}
        ref={heading}
        tabIndex={-1}
        className="text-2xl font-semibold"
      >
        {result
          ? t("prep.done")
          : phase === "edit"
            ? t("prep.title")
            : t("prep.review")}
      </h2>
      <p className="my-3 break-words">
        {t("ship.number", { id: original.id })} · {original.companyName} ·{" "}
        {original.registrationPlates} · {original.truckStatus}
      </p>
      {original.truckStatus === "OUT" && (
        <p className="my-3 rounded-xl border border-warning p-3">
          {t("prep.outNote")}
        </p>
      )}
      {phase === "edit" ? (
        <form className="space-y-4" onSubmit={prepare}>
          <label className="block text-sm">
            {t("field.quantity")}
            <input
              ref={first}
              type="number"
              min="1"
              max="2147483647"
              step="1"
              required
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
              value={form.locationOriginId}
              onChange={update("locationOriginId")}
            >
              <option value="">{t("prep.chooseOrigin")}</option>
              {activeOrigins.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("field.wasteProfile")}
            <select
              required
              className="select mt-1 w-full"
              value={form.wasteProfileId}
              onChange={update("wasteProfileId")}
            >
              <option value="">{t("prep.chooseWaste")}</option>
              {activeWastes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          {waste && (
            <p className="text-sm break-words">
              {t("prep.recommendedType", {
                name: waste.containerType?.name || t("ship.notRecorded"),
              })}
            </p>
          )}
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
          {ready && (!activeOrigins.length || !activeWastes.length) && (
            <p role="status">{t("prep.noOptions")}</p>
          )}
          {original.truckStatus === "OUT" && (
            <label className="block text-sm">
              {t("prep.reason")}
              <textarea
                required
                minLength={3}
                maxLength={1000}
                className="textarea mt-1 w-full"
                value={form.reason}
                onChange={update("reason")}
              />
            </label>
          )}
          <p className="text-sm text-base-content/70">{t("prep.note")}</p>
          <button
            className="btn min-h-11 btn-primary"
            disabled={
              !ready ||
              !origin ||
              !waste?.containerType ||
              (original.truckStatus === "OUT" && form.reason.trim().length < 3)
            }
          >
            {t("prep.reviewButton")}
          </button>
        </form>
      ) : (
        <>
          <dl className="space-y-3">
            {[
              [t("field.quantity"), review?.quantity],
              [t("field.locationOrigin"), review?.origin],
              [t("field.wasteProfile"), review?.waste],
              [t("def.field.containerTypeId"), review?.type],
              [t("prep.nextStep"), t("prep.awaiting")],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
              >
                <dt className="font-semibold">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {review?.reason && (
            <p className="my-3 break-words">
              {t("ship.reason", { reason: review.reason })}
            </p>
          )}
          {phase === "review" && (
            <button className="btn mt-4 min-h-11 btn-primary" onClick={save}>
              {t("prep.confirm", { count: review.quantity })}
            </button>
          )}
          {phase === "saving" && (
            <InlineLoader save className="mt-4" />
          )}
          {result && (
            <p role="status" className="operational-confirm mt-4 text-success">
              {t("prep.result", {
                profile: result.containerProfileId,
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
          {["unknown", "conflict"].includes(phase) && (
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
            : phase === "unknown"
              ? t("prep.closeKeep")
              : phase === "conflict"
                ? t("prep.closeReload")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
