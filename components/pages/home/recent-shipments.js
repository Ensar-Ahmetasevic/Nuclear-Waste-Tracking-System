"use client";
import Link from "next/link";
import { useT } from "../../shell/preferences";
import { Card, CardHeader } from "../../ui/card";
import EmptyState from "../../ui/empty-state";
import { useFormat } from "../../ui/format";
import { SceneArrow } from "../../ui/scene";
import StatusChip from "../../ui/status-chip";
import { CompactStepper } from "../../ui/stepper";
import { journeyView } from "../shipping-informations/journey-view";

// Tone of the status chip from the current journey step.
function statusTone(journey) {
  if (!journey.current) return "neutral";
  if (journey.current.state === "blocked") return "error";
  if (journey.current.key === "content") return "warning";
  if (journey.current.key === "receipt") return "success";
  return "info";
}

// Latest shipments with their five-step progress (overview).
export default function RecentShipments({ rows }) {
  const t = useT();
  const format = useFormat();
  return (
    <Card as="section" aria-labelledby="recent-title" className="space-y-3">
      <CardHeader
        id="recent-title"
        title={t("recent.title")}
        action={
          <Link
            href="/shipping-informations"
            className="flex min-h-11 link items-center gap-1.5 text-sm font-medium text-primary no-underline"
          >
            {t("recent.all")}
            <SceneArrow />
          </Link>
        }
      />
      {!rows.length ? (
        <EmptyState>{t("recent.empty")}</EmptyState>
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="bg-base-200/70 text-left text-xs text-base-content/70">
                <th
                  scope="col"
                  className="py-2.5 pr-3 pl-5 font-medium sm:pl-6"
                >
                  {t("recent.col.shipment")}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {t("recent.col.status")}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {t("recent.col.progress")}
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  {t("recent.col.arrival")}
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  {t("recent.col.containers")}
                </th>
                <th scope="col" className="py-2.5 pr-5 pl-3 sm:pr-6">
                  <span className="sr-only">{t("ship.open")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/10">
              {rows.map((row) => {
                const journey = journeyView(t, format, row.journey);
                return (
                  <tr key={row.id}>
                    <td className="py-3 pr-3 pl-5 sm:pl-6">
                      <span className="block font-mono font-semibold">
                        {t("ship.number", { id: row.id })}
                      </span>
                      <span className="block max-w-48 truncate text-xs text-base-content/70">
                        {row.company}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip tone={statusTone(journey)}>
                        {journey.current
                          ? journey.current.label
                          : t("journey.summary.done")}
                      </StatusChip>
                    </td>
                    <td className="px-3 py-3">
                      <CompactStepper
                        steps={journey.steps}
                        summary={journey.summary}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-base-content/80">
                      <time dateTime={row.arrivedAt}>
                        {format.dateTime(row.arrivedAt)}
                      </time>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {format.number(row.containers)}
                    </td>
                    <td className="py-3 pr-5 pl-3 text-right sm:pr-6">
                      <Link
                        href={`/shipping-informations/${row.id}`}
                        aria-label={t("ship.openAria", {
                          id: row.id,
                          company: row.company,
                        })}
                        className="btn btn-square min-h-11 border-base-content/15 btn-ghost btn-sm"
                      >
                        <SceneArrow />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
