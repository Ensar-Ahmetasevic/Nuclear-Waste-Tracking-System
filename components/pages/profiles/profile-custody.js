"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LuCheck, LuInfo } from "react-icons/lu";
import { useT } from "../../shell/preferences";
import DataFreshness, {
  manualRefreshOptions,
} from "../../shared/data-freshness";
import { Card, CardHeader } from "../../ui/card";
import { useFormat } from "../../ui/format";
import { TextIn } from "../../ui/message-text";
import LabelButton from "../../shared/record-label";
import { recordCode } from "../../../lib/record-codes.cjs";
import { SceneImage } from "../../ui/scene";
import Skeleton from "../../ui/skeleton";
import StatusChip from "../../ui/status-chip";
import { LoadingWatch } from "../../loading/loaders";
import Breadcrumb from "../../ui/breadcrumb";
import ProfileDocuments from "./profile-documents";

const STAGE_SCENES = {
  arrival: "gate",
  content: "arrival",
  receipt: "preStorage",
  transfer: "transfer",
  final: "finalStorage",
};
const STATUS_TONE = {
  prepared: "info",
  received: "success",
  requested: "neutral",
  reserved: "warning",
  final: "success",
  returned: "error",
  corrected: "warning",
};
const MARK = {
  done: "bg-primary text-primary-content",
  current: "bg-warning text-warning-content",
  blocked: "bg-error text-error-content",
};

async function read(id) {
  const response = await fetch(`/api/profiles/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Unable to load profile");
    error.status = response.status;
    throw error;
  }
  return data;
}

function place(t, row) {
  const value = row.place;
  if (!value) return "—";
  if (value.kind === "site")
    return t("custody.place.site", { plates: value.plates });
  if (value.kind === "route")
    return t("custody.place.route", { from: value.from, to: value.to });
  return value.name;
}

function reference(t, row, permissions) {
  const { kind, id } = row.ref;
  const text = t(`custody.ref.${kind}`, { id });
  if (kind === "transfer" && permissions.canOpenTransfers)
    return (
      <Link href={`/transfers/${id}`} className="link font-mono text-xs">
        {text}
      </Link>
    );
  return <span className="font-mono text-xs text-base-content/75">{text}</span>;
}

export default function ProfileCustody({ profileId }) {
  const t = useT();
  const format = useFormat();
  const query = useQuery({
    ...manualRefreshOptions,
    queryKey: ["profileCustody", profileId],
    queryFn: () => read(profileId),
    retry: (count, error) => error.status !== 404 && count < 2,
  });
  const data = query.data;
  if (!data)
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {query.isError ? (
          <p
            role="alert"
            className="rounded-box border border-error/40 bg-error/10 p-4"
          >
            {query.error?.status === 404
              ? t("custody.notFound")
              : t("custody.loadError")}
          </p>
        ) : (
          <div
            role="status"
            aria-label={t("common.loading")}
            className="space-y-5"
          >
            <LoadingWatch />
            <Skeleton className="h-24" />
            <Skeleton className="h-36" />
            <Skeleton className="h-72" />
          </div>
        )}
      </main>
    );

  const {
    profile,
    shipment,
    stages,
    rows,
    open,
    notes,
    permissions,
    documents,
  } = data;
  const openRows = [open.receipt && "receipt", open.final && "final"].filter(
    Boolean,
  );
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* One toolbar: where this record sits, data freshness and the label. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Breadcrumb
          items={[
            permissions.canOpenShipment && {
              href: "/shipping-informations",
              label: t("ship.title"),
            },
            {
              href: permissions.canOpenShipment
                ? `/shipping-informations/${shipment.id}`
                : undefined,
              label: t("ship.number", { id: shipment.id }),
            },
            { label: t("ship.profile", { id: profile.id }) },
          ]}
        />
        <div className="flex items-center gap-2">
          <h1 className="sr-only">
            {t("custody.title", {
              id: profile.id,
              containers: t("ship.containers", {
                count: format.number(profile.quantity),
              }),
            })}
          </h1>
          <LabelButton
            kind="profile"
            id={profile.id}
            lines={[
              [profile.wasteProfile, profile.containerType]
                .filter(Boolean)
                .join(" · "),
              t("ship.containers", { count: format.number(profile.quantity) }),
              t("label.fromShipment", {
                code: recordCode("shipment", shipment.id),
              }),
            ]}
          />
          <DataFreshness query={query} />
        </div>
      </header>

      <ol
        aria-label={t("custody.stages")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {stages.map((stage) => (
          <li
            key={stage.key}
            aria-current={stage.state === "current" ? "step" : undefined}
            className={`flex flex-col overflow-hidden rounded-box border bg-base-100 ${
              stage.state === "current"
                ? "border-2 border-warning"
                : stage.state === "blocked"
                  ? "border-2 border-error"
                  : "border-base-content/10"
            }`}
          >
            <span
              data-theme="nwts-dark"
              className="relative block h-24 bg-base-300"
            >
              <SceneImage
                scene={STAGE_SCENES[stage.key]}
                sizes="(min-width: 1024px) 240px, 50vw"
                className={
                  stage.state === "upcoming" ? "brightness-50 grayscale" : ""
                }
              />
              {MARK[stage.state] && (
                <span
                  aria-hidden="true"
                  className={`absolute top-2 left-2 inline-flex size-7 items-center justify-center rounded-full text-sm font-bold ${MARK[stage.state]}`}
                >
                  {stage.state === "done" ? (
                    <LuCheck className="size-4" strokeWidth={3} />
                  ) : stage.state === "blocked" ? (
                    "!"
                  ) : (
                    "…"
                  )}
                </span>
              )}
            </span>
            <span className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="font-semibold">
                {t(`custody.stage.${stage.key}`)}
                <span className="sr-only">
                  {" "}
                  · {t(`journey.state.${stage.state}`)}
                </span>
              </span>
              <span className="text-xs text-base-content/70">
                {stage.progress && stage.progress.total > 0
                  ? t("custody.progress", {
                      done: format.number(stage.progress.done),
                      total: format.number(stage.progress.total),
                    })
                  : stage.at
                    ? format.dateTime(stage.at)
                    : t(`journey.state.${stage.state}`)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6">
        <Card
          as="section"
          aria-labelledby="custody-table-title"
          className="min-w-0 space-y-3"
        >
          <CardHeader
            id="custody-table-title"
            title={t("custody.table.title")}
            description={t("custody.table.desc")}
          />
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[60rem] text-sm [overflow-wrap:normal]">
              <thead>
                <tr className="bg-base-200/70 text-left text-xs text-base-content/70">
                  {["time", "step", "by", "responsible", "place"].map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="px-3 py-2.5 font-medium first:pl-5 sm:first:pl-6"
                    >
                      {t(`custody.col.${key}`)}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-medium"
                  >
                    {t("custody.col.quantity")}
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    {t("custody.col.status")}
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 pr-5 pl-3 font-medium sm:pr-6"
                  >
                    {t("custody.col.record")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/10 align-top">
                {[...rows].reverse().map((row) => (
                  <tr key={row.key}>
                    <td className="py-3 pr-3 pl-5 font-mono text-xs whitespace-nowrap sm:pl-6">
                      {format.dateTime(row.at)}
                    </td>
                    <td className="min-w-44 px-3 py-3">
                      <span className="font-medium">
                        {t(`custody.kind.${row.kind}`)}
                      </span>
                      {row.reason && (
                        <span className="block max-w-56 text-xs break-words text-base-content/70">
                          <TextIn messageKey="ship.reason" text={row.reason} />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.actorId
                        ? t("custody.user", { id: row.actorId })
                        : t("ship.notRecorded")}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-base-content/80">
                      {row.responsible || "—"}
                    </td>
                    <td className="min-w-36 px-3 py-3">{place(t, row)}</td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                      {row.previousQuantity != null
                        ? `${format.number(row.previousQuantity)} → ${format.number(row.quantity)}`
                        : row.quantity != null
                          ? format.number(row.quantity)
                          : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip tone={STATUS_TONE[row.status] || "neutral"}>
                        {t(`custody.status.${row.status}`)}
                      </StatusChip>
                    </td>
                    <td className="py-3 pr-5 pl-3 whitespace-nowrap sm:pr-6">
                      {reference(t, row, permissions)}
                    </td>
                  </tr>
                ))}
                {openRows.map((key) => (
                  <tr key={`open-${key}`} className="text-base-content/60">
                    <td className="py-3 pr-3 pl-5 font-mono text-xs sm:pl-6">
                      —
                    </td>
                    <td className="px-3 py-3">{t(`custody.open.${key}`)}</td>
                    <td colSpan={6} className="py-3 pr-5 pl-3 sm:pr-6">
                      {t("custody.open.none")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ProfileDocuments
          profiles={[profile.id]}
          documents={documents}
          canRemove={permissions.canRemoveDocuments}
        />

        <div className="order-first grid items-start gap-6 lg:grid-cols-2">
          {(notes.preparationMissing || notes.legacyReceipts > 0) && (
            <Card
              as="section"
              aria-labelledby="custody-notes-title"
              className="space-y-3"
            >
              <CardHeader id="custody-notes-title" title={t("custody.notes")} />
              <ul className="space-y-2.5 text-sm text-base-content/80">
                {notes.preparationMissing && (
                  <li className="flex gap-2">
                    <LuInfo
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("custody.note.preparation")}
                  </li>
                )}
                {notes.legacyReceipts > 0 && (
                  <li className="flex gap-2">
                    <LuInfo
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {t("custody.note.legacy", { count: notes.legacyReceipts })}
                  </li>
                )}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
