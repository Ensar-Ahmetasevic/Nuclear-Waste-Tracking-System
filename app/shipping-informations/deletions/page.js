"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { LuRefreshCw } from "react-icons/lu";
import ShipmentTimeline from "@/components/pages/shipping-informations/shipment-timeline";
import { useT } from "@/components/shell/preferences";
import { useFormat } from "@/components/ui/format";
import { TextIn } from "@/components/ui/message-text";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import { InlineLoader, PageLoader } from "../../../components/loading/loaders";
import Breadcrumb from "@/components/ui/breadcrumb";

async function read(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Unable to load deletion records.");
  return response.json();
}
export default function ShipmentDeletions() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DeletionList />
    </Suspense>
  );
}
function DeletionList() {
  const t = useT();
  const { data: session, status } = useSession();
  const allowed = ["ADMINISTRATOR", "SUPERVISION"].includes(
    session?.user?.role,
  );
  const params = useSearchParams(),
    router = useRouter();
  const raw = Number(params.get("page") || 1),
    page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  const query = useQuery({
    queryKey: ["shipmentDeletions", page],
    queryFn: () => read(`/api/shipping-informations/deletions?page=${page}`),
    enabled: allowed,
    refetchOnWindowFocus: false,
  });
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { href: "/shipping-informations", label: t("ship.title") },
          { label: t("ship.deletions") },
        ]}
      />
      <PageHeader
        title={t("ship.deletions")}
        description={t("delhist.desc")}
        actions={
          allowed && (
            <button
              className="btn min-h-11 border-base-content/20 btn-ghost"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              <LuRefreshCw
                className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {query.isFetching ? t("fresh.refreshing") : t("fresh.refresh")}
            </button>
          )
        }
      />
      {status === "loading" ? (
        <InlineLoader />
      ) : !allowed ? (
        <p>{t("recon.forbidden")}</p>
      ) : (
        <>
          {query.isError && <p role="alert">{t("delhist.error")}</p>}
          {query.isPending && <InlineLoader />}
          {query.data && (
            <>
              <p role="status" className="text-sm">
                {t("delhist.count", {
                  count: query.data.total,
                  page: query.data.page,
                  pages: query.data.pages,
                })}
              </p>
              {!query.data.removals.length && (
                <EmptyState>{t("delhist.none")}</EmptyState>
              )}
              <ul className="space-y-4">
                {query.data.removals.map((row) => (
                  <li key={row.id}>
                    <RemovalRecord record={row} />
                  </li>
                ))}
              </ul>
              {query.data.pages > 1 && (
                <nav
                  aria-label={t("delhist.pages")}
                  className="flex justify-center gap-3"
                >
                  <button
                    className="btn min-h-11"
                    disabled={query.data.page <= 1}
                    onClick={() =>
                      router.replace(`?page=${query.data.page - 1}`)
                    }
                  >
                    {t("ship.previous")}
                  </button>
                  <button
                    className="btn min-h-11"
                    disabled={query.data.page >= query.data.pages}
                    onClick={() =>
                      router.replace(`?page=${query.data.page + 1}`)
                    }
                  >
                    {t("ship.next")}
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
function RemovalRecord({ record }) {
  const t = useT();
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["shipmentDeletion", record.id],
    queryFn: () => read(`/api/shipping-informations/deletions/${record.id}`),
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const before = record.before;
  const rows = [
    ["field.companyName", before.companyName],
    ["field.driverName", before.driverName],
    ["ship.plates", before.registrationPlates],
    ["field.truckStatus", before.truckStatus],
    ["field.containerStatus", before.status],
    ["ship.arrival", format.dateTime(before.entryDateTime)],
    [
      "journey.step.departure",
      before.exitDateTime
        ? format.dateTime(before.exitDateTime)
        : t("ship.notRecorded"),
    ],
  ];
  return (
    <details
      className="rounded-box border border-base-content/10 bg-base-100 px-4 [overflow-wrap:anywhere]"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">
        {t("delhist.record", {
          id: record.id,
          shipment: record.shipmentId,
          company: before.companyName,
          time: format.dateTime(record.createdAt),
        })}
      </summary>
      <div className="space-y-3 pb-4">
        <p>
          {t("ship.recordedBy", { actor: record.actorId })} ·{" "}
          <TextIn messageKey="ship.reason" text={record.reason} />
        </p>
        <h2 className="font-semibold">{t("delhist.before")}</h2>
        <dl className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-base-200/70 px-3 py-2.5">
              <dt className="text-xs text-base-content/70">{t(label)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3 className="font-semibold">
          {t("delhist.removed", { count: before.containerProfiles.length })}
        </h3>
        <ul className="space-y-2 text-sm">
          {before.containerProfiles.map((profile) => (
            <li key={profile.id}>
              {t("ship.profile", { id: profile.id })} ·{" "}
              {t("ship.containers", { count: profile.quantity })} ·{" "}
              {profile.containerStatus} · {profile.locationOriginName} (#
              {profile.locationOriginId}) · {profile.wasteProfileName} (#
              {profile.wasteProfileId})
            </li>
          ))}
        </ul>
        {open && query.isPending && <InlineLoader />}
        {query.isError && (
          <p role="alert">
            {t("delhist.historyError")}{" "}
            <button className="btn min-h-11" onClick={() => query.refetch()}>
              {t("alert.retry")}
            </button>
          </p>
        )}
        {query.data && (
          <ShipmentTimeline
            timeline={query.data.timeline}
            titleId={`deleted-shipment-timeline-${record.id}`}
          />
        )}
      </div>
    </details>
  );
}
