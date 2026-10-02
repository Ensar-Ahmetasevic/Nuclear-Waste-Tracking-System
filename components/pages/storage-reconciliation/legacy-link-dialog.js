"use client";

import { useId, useRef, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { manualRefreshOptions } from "@/components/shared/data-freshness";
import useReviewDialog, {
  sendAttempt,
} from "@/components/shared/use-review-dialog";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { InlineLoader } from "../../loading/loaders";
import { AiTextarea } from "../../ui/proofread";

// Administrator links an earlier receipt to the whole accepted profiles it contained.
export default function LegacyLinkDialog({ hall, receipt, onClose }) {
  const t = useT();
  const format = useFormat();
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("edit");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const payload = useRef(null),
    busy = useRef(false);
  const titleId = useId(),
    client = useQueryClient();
  const { dialog, heading, first, keepFocus } = useReviewDialog(phase);
  const candidates = useQuery({
    queryKey: ["stockReconciliation", "candidates"],
    queryFn: async () =>
      (
        await axios.get("/api/storage-reconciliation/legacy-links", {
          timeout: 20000,
        })
      ).data,
    ...manualRefreshOptions,
  });
  const rows = candidates.data?.candidates || [];
  const chosen = rows.filter((row) => selected.includes(row.id));
  const total = chosen.reduce((sum, row) => sum + row.quantity, 0);
  const visible = rows.filter(
    (row) =>
      !filter.trim() ||
      `profile ${row.id} shipment ${row.shippingInformationId} ${row.wasteProfileName} ${row.locationOriginName}`
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );
  const describe = (row) =>
    t("recon.link.profile", {
      id: row.id,
      shipment: row.shippingInformationId,
      containers: t("ship.containers", { count: row.quantity }),
      waste: row.wasteProfileName,
      origin: row.locationOriginName,
      time: format.dateTime(row.createdAt),
    });

  async function review(event) {
    event.preventDefault();
    if (!chosen.length) {
      setError(t("recon.link.error.select"));
      return;
    }
    if (total !== receipt.quantity) {
      setError(
        t("recon.link.error.total", { total, recorded: receipt.quantity }),
      );
      return;
    }
    if (reason.trim().length < 3 || reason.trim().length > 1000) {
      setError(t("recon.link.error.reference"));
      return;
    }
    setError("");
    setReason(reason.trim());
    payload.current = null;
    setMessage("");
    setPhase("review");
  }
  function finish() {
    if (busy.current) return;
    if (result || ["conflict", "unknown"].includes(phase))
      client.invalidateQueries();
    onClose();
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPhase("saving");
    setMessage("");
    payload.current ||= {
      receiptId: receipt.id,
      containerProfileIds: chosen.map((row) => row.id),
      expectedVersion: receipt.version,
      reason: reason.trim(),
      actionKey: crypto.randomUUID(),
    };
    const outcome = await sendAttempt(
      "/api/storage-reconciliation/legacy-links",
      payload.current,
      "link",
    );
    busy.current = false;
    setPhase(outcome.phase);
    setResult(outcome.result || null);
    setMessage(
      outcome.phase === "unknown"
        ? t("recon.link.unconfirmed")
        : outcome.message || "",
    );
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      onKeyDown={keepFocus}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold"
      >
        {result
          ? t("recon.link.done")
          : phase === "edit"
            ? t("recon.link.title")
            : t("recon.link.review")}
      </h2>
      <p className="my-3 [overflow-wrap:anywhere]">
        {t("recon.link.receipt", {
          id: receipt.id,
          hall: hall.name,
          containers: t("ship.containers", { count: receipt.quantity }),
          time: format.dateTime(receipt.createdAt),
        })}
      </p>
      <p className="my-3">{t("recon.link.intro")}</p>
      {phase === "edit" ? (
        <form noValidate className="space-y-4" onSubmit={review}>
          {error && <p role="alert">{error}</p>}
          <label className="block text-sm">
            {t("recon.link.filter")}
            <input
              ref={first}
              type="search"
              className="input mt-1 w-full"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t("recon.link.filterPlaceholder")}
            />
          </label>
          {candidates.isPending ? (
            <InlineLoader />
          ) : candidates.isError ? (
            <p role="alert">
              {t("recon.link.loadError")}{" "}
              <button
                type="button"
                className="btn min-h-11"
                onClick={() => candidates.refetch()}
              >
                {t("alert.retry")}
              </button>
            </p>
          ) : !rows.length ? (
            <p>{t("recon.link.none")}</p>
          ) : (
            <fieldset className="max-h-72 space-y-1 overflow-y-auto rounded border border-base-content/20 p-2">
              <legend className="px-1">{t("recon.unlinkedProfiles")}</legend>
              {visible.map((row) => (
                <label
                  key={row.id}
                  className="flex min-h-11 items-start gap-3 py-1 [overflow-wrap:anywhere]"
                >
                  <input
                    type="checkbox"
                    className="checkbox mt-1"
                    checked={selected.includes(row.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((id) => id !== row.id),
                      )
                    }
                  />
                  <span>
                    {describe(row)}
                    {hall.matchText && row.wasteProfileName !== hall.matchText
                      ? ` · ${t("recon.link.differs", { name: hall.matchText })}`
                      : ""}
                  </span>
                </label>
              ))}
              {!visible.length && <p>{t("recon.link.noMatch")}</p>}
            </fieldset>
          )}
          {candidates.data?.total > candidates.data?.limit && (
            <p className="text-sm">
              {t("recon.oldestOf", {
                limit: candidates.data.limit,
                total: candidates.data.total,
              })}
            </p>
          )}
          <p aria-live="polite">
            {t("recon.link.selected", {
              profiles: chosen.length,
              total,
              recorded: receipt.quantity,
            })}
          </p>
          <label className="block text-sm">
            {t("recon.link.reference")}
            <AiTextarea
              required
              minLength={3}
              maxLength={1000}
              className="textarea mt-1 w-full"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button type="submit" className="btn min-h-11 btn-primary">
            {t("recon.link.reviewButton")}
          </button>
        </form>
      ) : (
        <>
          <ul className="space-y-2">
            {chosen.map((row) => (
              <li
                key={row.id}
                className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
              >
                {describe(row)}
              </li>
            ))}
          </ul>
          <p className="my-3">
            {t("recon.link.total", { total })}{" "}
            <span className="[overflow-wrap:anywhere]">{reason.trim()}</span>
          </p>
          <p className="my-3 rounded-xl border border-warning p-3">
            {t("recon.link.effect")}
          </p>
          {phase === "review" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.link.confirm", { id: receipt.id })}
            </button>
          )}
          {phase === "saving" && <InlineLoader save />}
          {message && (
            <p role="alert" className="my-3">
              {message}
            </p>
          )}
          {result && (
            <p role="status" className="operational-confirm my-4 text-success">
              {t("recon.link.result", {
                id: result.id,
                time: format.dateTime(result.createdAt),
                actor: result.actorId,
              })}
            </p>
          )}
          {phase === "unknown" && (
            <button
              type="button"
              className="btn min-h-11 btn-primary"
              onClick={save}
            >
              {t("recon.link.check")}
            </button>
          )}
        </>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {["review", "error"].includes(phase) && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("edit");
            }}
          >
            {t("users.review.back")}
          </button>
        )}
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("recon.closeReload")
              : phase === "unknown"
                ? t("recon.link.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
