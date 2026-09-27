"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { LuCheck, LuLayers, LuTruck, LuWarehouse } from "react-icons/lu";
import { canAccess } from "../../../lib/workspaces.cjs";
import { useT } from "../../shell/preferences";
import DataFreshness, {
  manualRefreshOptions,
} from "../../shared/data-freshness";
import { Card, CardHeader } from "../../ui/card";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import PageHeader from "../../ui/page-header";
import { SceneStat, SceneStats } from "../../ui/scene";
import Skeleton from "../../ui/skeleton";
import StatusChip from "../../ui/status-chip";
import ModalAcceptRequestFromFinalStorageForm from "../pre-storage/capacity-and-conditions/capacity/modal/modal-accept-request-from-final-storage-form";
import TransferConfirmation from "../final-storage/setup/capacity-and-conditions/capacity/components/transfer-confirmation";
import { LoadingWatch } from "../../loading/loaders";

const NODE = {
  done: "bg-step-3 text-white",
  current: "border-3 border-warning bg-base-100 text-warning",
  blocked: "bg-error text-error-content",
  upcoming: "border-2 border-base-content/25 text-base-content/60",
};
const LINE = { done: "bg-step-3", current: "bg-warning", blocked: "bg-error" };
const SOURCE_TONE = {
  reserved: "warning",
  completed: "success",
  released: "neutral",
};

async function read(id) {
  const response = await fetch(`/api/transfers/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Unable to load transfer");
    error.status = response.status;
    throw error;
  }
  return data;
}

// Detail text of one step: time and person when recorded, else what it waits for.
function stepDetail(t, format, step, data) {
  const by = step.at
    ? t("journey.by", { time: format.dateTime(step.at), actor: step.actorId })
    : null;
  switch (step.key) {
    case "request":
      return by || t("xfer.step.noRecord");
    case "approval":
      if (step.state === "blocked")
        return t("xfer.step.approval.rejected", {
          reason: step.reason || t("ship.notRecorded"),
        });
      if (step.state === "done") return by || t("xfer.step.noRecord");
      return step.returnedReason
        ? t("xfer.step.approval.returned", { reason: step.returnedReason })
        : t("xfer.step.approval.waiting");
    case "transport":
      return t(`xfer.step.transport.${step.state}`);
    default:
      return step.state === "done"
        ? by || t("xfer.step.noRecord")
        : t("xfer.step.receipt.upcoming", {
            room: data.destination?.name || data.transfer.requestedByRoom,
          });
  }
}

function stepPerson(t, step, transfer) {
  const name =
    step.key === "request"
      ? transfer.requestedByEmployee?.name
      : step.key === "approval" && step.state === "done"
        ? transfer.approvedByEmployee?.name
        : step.key === "receipt" && step.state === "done"
          ? transfer.acceptedByEmployee?.name
          : null;
  return name ? t("xfer.detail.responsible", { name }) : null;
}

export default function TransferDetail({ transferId }) {
  const t = useT();
  const format = useFormat();
  const { data: session } = useSession();
  const user = session?.user;
  const [dialog, setDialog] = useState(null);
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["transfer", transferId],
    queryFn: () => read(transferId),
    retry: (count, error) => error.status !== 404 && count < 2,
  });
  const data = query.data;
  const finalUser = canAccess(user, "FINAL_STORAGE");
  const base = finalUser ? "/final-storage" : "/pre-storage";
  const breadcrumb = (
    <nav
      aria-label={t("ship.breadcrumb")}
      className="flex flex-wrap items-center gap-2 text-sm text-base-content/65"
    >
      <Link href={base} className="hover:text-base-content hover:underline">
        {t(`storage.title.${finalUser ? "FINAL_STORAGE" : "PRE_STORAGE"}`)}
      </Link>
      <span aria-hidden="true">›</span>
      <Link
        href={`${base}/history?view=transfers`}
        className="hover:text-base-content hover:underline"
      >
        {t("records.view.transfers")}
      </Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page" className="text-base-content/85">
        {t("xfer.request", { id: transferId })}
      </span>
    </nav>
  );
  if (!data)
    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {breadcrumb}
        {query.isError ? (
          <p
            role="alert"
            className="rounded-box border border-error/40 bg-error/10 p-4"
          >
            {query.error?.status === 404
              ? t("xfer.detail.notFound")
              : t("xfer.detail.loadError")}
          </p>
        ) : (
          <div
            role="status"
            aria-label={t("common.loading")}
            className="space-y-5"
          >
            <LoadingWatch />
            <Skeleton className="h-60" />
            <Skeleton className="h-48" />
          </div>
        )}
      </main>
    );

  const { transfer, destination, steps, sources, events, permissions } = data;
  const done = transfer.finalStorageStatus === "accepted";
  const rejected = transfer.preStorageStatus === "rejected";
  const halls = [
    ...new Set(
      sources.filter((row) => row.state !== "released").map((row) => row.hall),
    ),
  ];
  const from = halls.length ? halls.join(", ") : t("xfer.detail.fromPending");
  const to = destination?.name || transfer.requestedByRoom;
  const statusText = done
    ? t("xfer.detail.status.done")
    : rejected
      ? t("xfer.status.requestRejected")
      : t(`xfer.status.${transfer.finalStorageStatus}`);
  const statusTone = done ? "success" : rejected ? "error" : "warning";
  // Truck position on the route strip.
  const progress = done
    ? 100
    : transfer.finalStorageStatus === "transportPending"
      ? 55
      : 0;
  const requestData = {
    ...transfer,
    requestedByEmployee: transfer.requestedByEmployee
      ? { name: transfer.requestedByEmployee.name, surname: "" }
      : null,
  };
  const reserved = sources.filter((row) => row.state === "reserved");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {breadcrumb}
      <PageHeader
        scene="transfer"
        tone="step-3"
        position="50% 62%"
        eyebrow={t("xfer.detail.eyebrow")}
        title={t("xfer.detail.title", { id: transfer.id })}
        description={t("xfer.detail.route", { from, to })}
        actions={<StatusChip tone={statusTone}>{statusText}</StatusChip>}
      >
        <SceneStats label={t("xfer.detail.figures")}>
          <SceneStat
            label={t("recent.col.containers")}
            value={format.number(transfer.requestedQuantity)}
            tone="step-3"
          />
          <SceneStat
            label={t("xfer.detail.destination")}
            value={to}
            note={
              destination?.used != null && destination.slots
                ? t("xfer.detail.occupancy", {
                    used: format.number(destination.used),
                    slots: format.number(destination.slots),
                  })
                : null
            }
          />
          <SceneStat
            label={t("xfer.detail.requestedAt")}
            value={format.age(transfer.createdAt)}
            note={format.dateTime(transfer.createdAt)}
          />
        </SceneStats>
      </PageHeader>
      <DataFreshness query={query} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card
            as="section"
            aria-labelledby="xfer-steps-title"
            className="space-y-6"
          >
            <CardHeader id="xfer-steps-title" title={t("xfer.detail.steps")} />
            <ol
              aria-label={t("xfer.detail.steps")}
              className="grid gap-5 sm:grid-cols-4 sm:gap-3"
            >
              {steps.map((step, index) => (
                <li
                  key={step.key}
                  aria-current={
                    ["current", "blocked"].includes(step.state)
                      ? "step"
                      : undefined
                  }
                  className="relative flex gap-3 sm:flex-col"
                >
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-10 bottom-[-1.25rem] left-4.5 w-1 rounded-full sm:top-4.5 sm:right-[-0.75rem] sm:bottom-auto sm:left-11 sm:h-1 sm:w-auto ${LINE[step.state] || "bg-base-content/15"}`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full font-mono font-semibold ${NODE[step.state]}`}
                  >
                    {step.state === "done" ? (
                      <LuCheck className="size-5" strokeWidth={3} />
                    ) : step.state === "blocked" ? (
                      "!"
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={`font-semibold ${step.state === "upcoming" ? "text-base-content/70" : step.state === "current" ? "text-warning" : ""}`}
                    >
                      {t(`xfer.step.${step.key}`)}
                      <span className="sr-only">
                        {" "}
                        · {t(`journey.state.${step.state}`)}
                      </span>
                    </span>
                    <span
                      className={`text-sm break-words ${step.state === "blocked" ? "text-error" : "text-base-content/70"}`}
                    >
                      {stepDetail(t, format, step, data)}
                    </span>
                    {stepPerson(t, step, transfer) && (
                      <span className="text-xs text-base-content/65">
                        {stepPerson(t, step, transfer)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div
              aria-label={t("xfer.detail.routeLabel", { from, to })}
              role="img"
              className="flex items-center gap-4 rounded-2xl bg-base-200/70 p-4"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <LuWarehouse
                  className="size-6 shrink-0 text-step-2"
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{from}</span>
                  <span className="text-xs text-base-content/65">
                    {t("area.PRE_STORAGE")}
                  </span>
                </span>
              </span>
              <span className="relative h-1 min-w-16 flex-1 rounded-full bg-base-content/15">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-step-2"
                  style={{ width: `${progress}%` }}
                />
                <span
                  className={`absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-base-100 ${done ? "border-success text-success" : progress ? "border-warning text-warning" : "border-base-content/25 text-base-content/60"}`}
                  style={{ left: `${Math.min(Math.max(progress, 6), 94)}%` }}
                >
                  <LuTruck className="size-4.5" aria-hidden="true" />
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <LuLayers
                  className="size-6 shrink-0 text-step-3"
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{to}</span>
                  <span className="text-xs text-base-content/65">
                    {t("area.FINAL_STORAGE")}
                  </span>
                </span>
              </span>
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="xfer-sources-title"
            className="space-y-3"
          >
            <CardHeader
              id="xfer-sources-title"
              title={t("xfer.detail.sources")}
              description={t("xfer.detail.sources.desc")}
            />
            {!sources.length ? (
              <EmptyState>{t("xfer.detail.sources.none")}</EmptyState>
            ) : (
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[40rem] text-sm [overflow-wrap:normal]">
                  <thead>
                    <tr className="bg-base-200/70 text-left text-xs text-base-content/70">
                      <th
                        scope="col"
                        className="py-2.5 pr-3 pl-5 font-medium sm:pl-6"
                      >
                        {t("recent.col.shipment")}
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        {t("xfer.detail.col.profile")}
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        {t("xfer.detail.col.hall")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right font-medium"
                      >
                        {t("recent.col.containers")}
                      </th>
                      <th
                        scope="col"
                        className="py-2.5 pr-5 pl-3 font-medium sm:pr-6"
                      >
                        {t("recent.col.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-content/10">
                    {sources.map((row) => (
                      <tr key={row.id}>
                        <td className="py-3 pr-3 pl-5 sm:pl-6">
                          <span className="block font-mono font-semibold">
                            {t("ship.number", { id: row.shipmentId })}
                          </span>
                          <span className="block max-w-44 truncate text-xs text-base-content/70">
                            {row.company || t("ship.notRecorded")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/profiles/${row.containerProfileId}`}
                            className="link font-medium"
                          >
                            {t("ship.profile", { id: row.containerProfileId })}
                          </Link>
                          {row.wasteProfile && (
                            <span className="block text-xs text-base-content/70">
                              {row.wasteProfile}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {row.hall}
                          {row.receiptId && (
                            <span className="block text-xs text-base-content/70">
                              {t("xfer.detail.receipt", { id: row.receiptId })}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums">
                          {format.number(row.quantity)}
                        </td>
                        <td className="py-3 pr-5 pl-3 sm:pr-6">
                          <StatusChip
                            tone={SOURCE_TONE[row.state] || "neutral"}
                          >
                            {t(`xfer.source.${row.state}`)}
                          </StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            as="section"
            aria-labelledby="xfer-next-title"
            className="space-y-4"
          >
            <CardHeader id="xfer-next-title" title={t("xfer.detail.next")} />
            <p className="text-sm text-base-content/80">
              {done
                ? t("xfer.detail.next.done", { room: to })
                : rejected
                  ? t("xfer.detail.next.rejected")
                  : permissions.canApprove
                    ? t("xfer.detail.next.approve")
                    : permissions.canReceive
                      ? t("xfer.detail.next.receive")
                      : transfer.finalStorageStatus === "transportPending"
                        ? t("xfer.detail.next.waitFinal")
                        : t("xfer.detail.next.waitPre")}
            </p>
            {permissions.canApprove && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="btn min-h-12 btn-success"
                  onClick={() => setDialog("approve")}
                >
                  {t("xfer.reviewApproval")}
                </button>
                <button
                  type="button"
                  className="btn min-h-11 border-base-content/20 btn-ghost"
                  onClick={() => setDialog("reject")}
                >
                  {t("xfer.reviewRejection")}
                </button>
              </div>
            )}
            {permissions.canReceive && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="btn min-h-12 btn-success"
                  onClick={() => setDialog("receive")}
                >
                  {t("xfer.reviewReceipt")}
                </button>
                <button
                  type="button"
                  className="btn min-h-11 border-base-content/20 btn-ghost"
                  onClick={() => setDialog("return")}
                >
                  {t("xfer.return")}
                </button>
              </div>
            )}
            <p className="text-xs text-base-content/65">
              {t("xfer.detail.recorded")}
            </p>
          </Card>

          <Card
            as="section"
            aria-labelledby="xfer-log-title"
            className="space-y-4"
          >
            <CardHeader id="xfer-log-title" title={t("xfer.detail.log")} />
            {!events.length ? (
              <EmptyState>{t("xfer.detail.log.none")}</EmptyState>
            ) : (
              <ol className="space-y-4">
                {[...events].reverse().map((event) => (
                  <li key={event.id} className="flex gap-3 text-sm">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                        /REJECT/.test(event.action)
                          ? "bg-error"
                          : /ACCEPT/.test(event.action)
                            ? "bg-success"
                            : "bg-step-3"
                      }`}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">
                        {t(`records.status.event.${event.action}`)}
                      </span>
                      <span className="text-xs text-base-content/70">
                        {t("journey.by", {
                          time: format.dateTime(event.at),
                          actor: event.actorId,
                        })}{" "}
                        · {t("ship.containers", { count: event.quantity })}
                      </span>
                      {event.reason && (
                        <span className="text-xs break-words text-base-content/80">
                          {t("ship.reason", { reason: event.reason })}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {["approve", "reject"].includes(dialog) && (
        <ModalAcceptRequestFromFinalStorageForm
          isOpen
          accept={dialog === "approve"}
          requestData={requestData}
          closeModal={() => setDialog(null)}
        />
      )}
      {["receive", "return"].includes(dialog) && (
        <TransferConfirmation
          request={{ ...requestData, sources: reserved }}
          accept={dialog === "receive"}
          room={{
            name: to,
            containerType: destination?.containerType,
          }}
          close={() => setDialog(null)}
        />
      )}
    </main>
  );
}
