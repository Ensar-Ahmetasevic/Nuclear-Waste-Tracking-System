"use client";

import { useState } from "react";
import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import DataFreshness, {
  manualRefreshOptions,
} from "@/components/shared/data-freshness";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import { TextIn } from "../../ui/message-text";
import EmptyState from "../../ui/empty-state";
import IconTile from "../../ui/icon-tile";
import PageHeader from "../../ui/page-header";
import VerificationDialog, { differenceText } from "./verification-dialog";
import LegacyLinkDialog from "./legacy-link-dialog";
import CorrectionDialog from "./correction-dialog";
import CorrectionReport from "./correction-report";
import { InlineLoader } from "../../loading/loaders";

function VerificationHistory({ area, locationId }) {
  const t = useT();
  const format = useFormat();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["stockReconciliation", "verifications", area, locationId, page],
    queryFn: async () =>
      (
        await axios.get(
          `/api/storage-reconciliation/verifications?area=${area}&locationId=${locationId}&page=${page}`,
          { timeout: 20000 },
        )
      ).data,
    placeholderData: keepPreviousData,
    ...manualRefreshOptions,
  });
  if (query.isPending) return <InlineLoader />;
  if (query.isError && !query.data)
    return (
      <p role="alert">
        {t("recon.history.error")}{" "}
        <button
          type="button"
          className="btn min-h-11"
          onClick={() => query.refetch()}
        >
          {t("alert.retry")}
        </button>
      </p>
    );
  const data = query.data;
  if (!data.verifications.length)
    return <EmptyState>{t("recon.history.none")}</EmptyState>;
  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {data.verifications.map((row) => (
          <li
            key={row.id}
            className="rounded-xl bg-base-200/70 p-3 text-sm [overflow-wrap:anywhere]"
          >
            <p className="font-semibold">
              {t("recon.verification", {
                id: row.id,
                time: format.dateTime(row.createdAt),
                actor: row.actorId,
              })}
            </p>
            <p>
              {t("recon.countedRecorded", {
                counted: row.countedQuantity,
                recorded: row.recordedQuantity,
              })}{" "}
              · {differenceText(t, row.countedQuantity, row.recordedQuantity)}
            </p>
            <p className="text-base-content/75">
              <TextIn messageKey="recon.basisValue" name="basis" text={row.reason} />
            </p>
            {row.correction && (
              <details className="mt-1">
                <summary className="min-h-11 cursor-pointer py-2">
                  {t("recon.appliedAs", {
                    id: row.correction.id,
                    delta: `${row.correction.delta > 0 ? "+" : ""}${row.correction.delta}`,
                    time: format.dateTime(row.correction.createdAt),
                    actor: row.correction.actorId,
                  })}
                </summary>
                <CorrectionReport report={row.correction.report} />
              </details>
            )}
          </li>
        ))}
      </ol>
      {data.pages > 1 && (
        <nav
          aria-label={t("recon.history.pages")}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage(data.page - 1)}
          >
            {t("ship.previous")}
          </button>
          <span>{t("ship.page", { page: data.page, total: data.pages })}</span>
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            disabled={page >= data.pages || query.isFetching}
            onClick={() => setPage(data.page + 1)}
          >
            {t("ship.next")}
          </button>
        </nav>
      )}
    </div>
  );
}

// One location per row: recorded stock, the latest count and the actions. The
// calculation and the verification history open on demand; findings and
// differences are shown only when there is something to check.
function HallRow({
  area,
  hall,
  listLimit,
  isAdmin,
  onVerify,
  onLink,
  onCorrect,
}) {
  const t = useT();
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const last = hall.lastVerification;
  const items =
    area === "PRE_STORAGE" ? hall.unlinkedReceipts : hall.unlinkedTransfers;
  const itemCount =
    area === "PRE_STORAGE"
      ? hall.unlinkedReceiptCount
      : hall.unlinkedTransferCount;
  const differs =
    last &&
    !last.correction &&
    last.countedQuantity !== hall.figures.recordedQuantity;
  return (
    <li className="space-y-3 py-4 [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <IconTile
          icon={area === "PRE_STORAGE" ? "warehouse" : "layers"}
          tone={area === "PRE_STORAGE" ? "step-2" : "step-3"}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{hall.name}</h3>
          <p
            className={`text-sm ${differs ? "text-warning" : "text-base-content/70"}`}
          >
            {last
              ? t("recon.verified", {
                  time: format.dateTime(last.createdAt),
                  counted: last.countedQuantity,
                  difference: differenceText(
                    t,
                    last.countedQuantity,
                    last.recordedQuantity,
                  ),
                })
              : t("recon.notVerified")}
          </p>
        </div>
        <p className="text-right">
          <span className="block font-mono text-2xl font-semibold tabular-nums">
            {format.number(hall.figures.recordedQuantity)}
          </span>
          <span className="text-xs text-base-content/65">
            {t("recon.figure.recordedQuantity")}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn min-h-11 btn-outline btn-primary"
            aria-label={t("recon.recordFor", { name: hall.name })}
            onClick={() => onVerify(hall)}
          >
            {t("recon.record")}
          </button>
          {isAdmin && differs && last.correctionVersion && (
            <button
              type="button"
              className="btn min-h-11 btn-warning"
              aria-label={t("recon.reviewCorrectionFor", { name: hall.name })}
              onClick={() => onCorrect(hall)}
            >
              {t("recon.correct.reviewButton")}
            </button>
          )}
          <button
            type="button"
            className="btn min-h-11 border-base-content/20 btn-ghost"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("recon.hideDetails") : t("recon.details")}
          </button>
        </div>
      </div>
      {differs && !isAdmin && (
        <p className="text-sm text-warning">{t("recon.differs.other")}</p>
      )}
      {hall.findings.length > 0 && (
        <div className="rounded-xl border border-warning/60 p-3 text-sm">
          <p className="font-semibold">{t("recon.findings")}</p>
          <ul className="list-disc pl-5">
            {hall.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </div>
      )}
      {itemCount > 0 && (
        <details className="rounded-xl border border-warning/60 px-3">
          <summary className="min-h-11 cursor-pointer py-3 text-sm">
            {t(
              area === "PRE_STORAGE"
                ? "recon.unlinkedReceipts"
                : "recon.figure.unlinkedTransfers",
            )}{" "}
            ({itemCount})
          </summary>
          <ul className="space-y-2 pb-3 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {area === "PRE_STORAGE"
                    ? t("recon.receiptItem", {
                        id: item.id,
                        time: format.dateTime(item.createdAt),
                        containers: t("ship.containers", {
                          count: item.quantity,
                        }),
                        employee:
                          item.responsibleEmployeeId ?? t("ship.notRecorded"),
                      })
                    : t("recon.transferItem", {
                        id: item.id,
                        time: format.dateTime(item.createdAt),
                        containers: t("ship.containers", {
                          count: item.requestedQuantity,
                        }),
                        room: item.requestedByRoom,
                      })}
                </span>
                {area === "PRE_STORAGE" && isAdmin && (
                  <button
                    type="button"
                    className="btn min-h-11 btn-outline btn-sm"
                    onClick={() => onLink(hall, item)}
                  >
                    {t("recon.linkReceipt", { id: item.id })}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {itemCount > items.length && (
            <p className="pb-3 text-sm">
              {t("recon.oldestOf", { limit: listLimit, total: itemCount })}
            </p>
          )}
        </details>
      )}
      {open && (
        <div className="space-y-4 rounded-xl bg-base-200/50 p-4">
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(hall.figures)
              .filter(([key]) => key !== "inconsistent")
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 rounded-lg bg-base-100 px-3 py-2 text-sm"
                >
                  <dt className="text-base-content/75">
                    {t(`recon.figure.${key}`)}
                  </dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
          </dl>
          {last?.correction && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm">
                {t("recon.appliedAs", {
                  id: last.correction.id,
                  delta: `${last.correction.delta > 0 ? "+" : ""}${last.correction.delta}`,
                  time: format.dateTime(last.correction.createdAt),
                  actor: last.correction.actorId,
                })}
              </summary>
              <CorrectionReport report={last.correction.report} />
            </details>
          )}
          <VerificationHistory area={area} locationId={hall.id} />
        </div>
      )}
    </li>
  );
}

export default function StockReconciliation() {
  const t = useT();
  const format = useFormat();
  const { data: session, status } = useSession();
  const allowed = ["ADMINISTRATOR", "SUPERVISION"].includes(
    session?.user?.role,
  );
  const isAdmin = session?.user?.role === "ADMINISTRATOR";
  const [verifying, setVerifying] = useState(null);
  const [linking, setLinking] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const query = useQuery({
    queryKey: ["stockReconciliation", "overview"],
    queryFn: async () =>
      (await axios.get("/api/storage-reconciliation", { timeout: 20000 })).data,
    enabled: allowed,
    ...manualRefreshOptions,
  });
  const data = query.data;
  const section = (area, halls) => (
    <section aria-labelledby={`${area}-heading`} className="space-y-3">
      <h2 id={`${area}-heading`} className="text-lg font-semibold">
        {t(`storage.title.${area}`)}
      </h2>
      {!halls.length ? (
        <EmptyState>{t(`storage.empty.${area}`)}</EmptyState>
      ) : (
        <ul className="divide-y divide-base-content/10 rounded-box border border-base-content/10 bg-base-100 px-5">
          {halls.map((hall) => (
            <HallRow
              key={hall.id}
              area={area}
              hall={hall}
              listLimit={data.listLimit}
              isAdmin={isAdmin}
              onVerify={(row) => setVerifying({ area, hall: row })}
              onLink={(row, receipt) => setLinking({ hall: row, receipt })}
              onCorrect={(row) => setCorrecting(row)}
            />
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={
          <span id="reconciliation-heading" tabIndex={-1}>
            {t("nav.reconciliation")}
          </span>
        }
        description={t("recon.intro")}
        actions={allowed && <DataFreshness query={query} />}
      />
      {status === "loading" ? (
        <InlineLoader />
      ) : !allowed ? (
        <p>{t("recon.forbidden")}</p>
      ) : (
        <>
          {query.isPending ? (
            <InlineLoader />
          ) : query.isError && !data ? (
            <p role="alert">
              {t("recon.loadError")}{" "}
              <button
                type="button"
                className="btn min-h-11"
                onClick={() => query.refetch()}
              >
                {t("alert.retry")}
              </button>
            </p>
          ) : (
            <>
              {section("PRE_STORAGE", data.pre)}
              {section("FINAL_STORAGE", data.final)}
              {data.unlinkedAcceptedProfileCount > 0 && (
                <section
                  aria-labelledby="profiles-heading"
                  className="space-y-3 rounded-box border border-warning/60 bg-base-100 p-5"
                >
                  <h2 id="profiles-heading" className="text-lg font-semibold">
                    {t("recon.unlinkedProfiles")}
                  </h2>
                  <p className="text-sm text-base-content/75">
                    {t("recon.unlinkedProfiles.desc")}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {data.unlinkedAcceptedProfiles.map((profile) => (
                      <li key={profile.id} className="[overflow-wrap:anywhere]">
                        {t("recon.profileItem", {
                          id: profile.id,
                          shipment: profile.shippingInformationId,
                          containers: t("ship.containers", {
                            count: profile.quantity,
                          }),
                          waste: profile.wasteProfileName,
                          time: format.dateTime(profile.createdAt),
                        })}
                      </li>
                    ))}
                  </ul>
                  {data.unlinkedAcceptedProfileCount >
                    data.unlinkedAcceptedProfiles.length && (
                    <p className="text-sm">
                      {t("recon.oldestOf", {
                        limit: data.listLimit,
                        total: data.unlinkedAcceptedProfileCount,
                      })}
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
      {verifying && (
        <VerificationDialog
          area={verifying.area}
          hall={verifying.hall}
          onClose={() => setVerifying(null)}
        />
      )}
      {linking && (
        <LegacyLinkDialog
          hall={linking.hall}
          receipt={linking.receipt}
          onClose={() => setLinking(null)}
        />
      )}
      {correcting && (
        <CorrectionDialog
          hall={correcting}
          onClose={() => setCorrecting(null)}
        />
      )}
    </main>
  );
}
