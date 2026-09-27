"use client";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { shipmentGroup } from "../../../lib/shipping-overview.cjs";
import { shipmentJourney } from "../../../lib/shipment-journey";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import IconTile from "../../ui/icon-tile";
import StatusChip from "../../ui/status-chip";
import { CompactStepper } from "../../ui/stepper";
import { journeyView } from "./journey-view";

// One shipment in the list: truck, content and a five-dot progress line.
export default function AllShippingData({ truck }) {
  const t = useT();
  const format = useFormat();
  const profiles = truck.containerProfiles || [];
  const group = shipmentGroup(truck);
  const quantity = profiles.reduce((sum, profile) => sum + profile.quantity, 0);
  const rejected = profiles.some(
    (profile) => profile.containerStatus === "rejected",
  );
  const returnState = truck.returnState;
  const types = [
    ...new Set(
      profiles
        .map((profile) => profile.wasteProfile?.containerType?.name)
        .filter(Boolean),
    ),
  ];
  const journey = journeyView(
    t,
    format,
    shipmentJourney({
      ...truck,
      finalContainers: truck.finalContainers ?? null,
    }),
    { returnState: truck.returnState },
  );
  return (
    <article className="rounded-box border border-base-content/10 bg-base-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <IconTile icon="truck" tone={group === "out" ? "neutral" : "step-1"} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-base-content/65">
            {t("ship.number", { id: truck.id })}
          </p>
          <h2 className="text-lg font-semibold break-words">
            {truck.companyName}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-base-content/75">
            <span className="rounded bg-base-content px-1.5 font-mono text-xs font-semibold text-base-100">
              {truck.registrationPlates}
            </span>
            <span>{truck.driverName}</span>
          </p>
        </div>
        <span className="flex flex-wrap justify-end gap-2">
          {returnState && (
            <StatusChip tone={returnState === "escalated" ? "warning" : "error"}>
              {t(`ship.returnState.${returnState}`)}
            </StatusChip>
          )}
          <StatusChip tone={group === "out" ? "error" : "warning"}>
            {t(`ship.status.${truck.truckStatus}`)}
          </StatusChip>
        </span>
      </div>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-base-content/65">{t("ship.arrival")}</p>
          <time dateTime={truck.entryDateTime}>
            {format.dateTime(truck.entryDateTime)}
          </time>
          {truck.exitDateTime && (
            <p className="text-base-content/70">
              {t("ship.departed", {
                time: format.dateTime(truck.exitDateTime),
              })}
            </p>
          )}
        </div>
        <div>
          <p
            className={`font-semibold ${group === "missing" ? "text-warning" : ""}`}
          >
            {profiles.length
              ? `${t("ship.containers", { count: format.number(quantity) })} · ${t("ship.profileCount", { count: profiles.length })}`
              : t("ship.noContent")}
          </p>
          <p className="text-xs break-words text-base-content/70">
            {types.length
              ? types.join(" · ")
              : group === "missing"
                ? t("ship.noContent.hint")
                : ""}
          </p>
          {rejected && !returnState && (
            <p className="mt-1 font-medium text-error">{t("ship.rejected")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <CompactStepper steps={journey.steps} summary={journey.summary} />
          <p
            className={`text-xs ${journey.current?.state === "blocked" ? "text-error" : "text-base-content/70"}`}
          >
            {journey.heading}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end border-t border-base-content/10 pt-3">
        <Link
          className="btn min-h-11 border-base-content/20 btn-ghost btn-sm"
          href={`/shipping-informations/${truck.id}`}
          aria-label={t("ship.openAria", {
            id: truck.id,
            company: truck.companyName,
          })}
        >
          {t("ship.open")}
          <LuArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
