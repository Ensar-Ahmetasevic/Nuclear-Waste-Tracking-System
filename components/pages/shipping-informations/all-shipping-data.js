"use client";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { GROUP_TONE, shipmentGroup } from "../../../lib/shipping-overview.cjs";
import { shipmentJourney } from "../../../lib/shipment-journey";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import IconTile from "../../ui/icon-tile";
import StatusChip from "../../ui/status-chip";
import { CompactStepper } from "../../ui/stepper";
import { journeyView } from "./journey-view";

// Full class names so Tailwind generates them.
const STRIPE = {
  "step-1": "border-l-step-1",
  success: "border-l-success",
  error: "border-l-error",
};
const OPEN = {
  "step-1": "btn-primary",
  success: "btn-success",
  error: "btn-error",
};

// One shipment in the list: truck, content and a five-dot progress line. The
// stripe, the chip and Open share the colour of the truck's state.
export default function AllShippingData({ truck }) {
  const t = useT();
  const format = useFormat();
  const profiles = truck.containerProfiles || [];
  const group = shipmentGroup(truck);
  const tone = GROUP_TONE[group];
  const rejected = profiles.some(
    (profile) => profile.containerStatus === "rejected",
  );
  const returnState = truck.returnState;
  const journey = journeyView(t, format, shipmentJourney(truck), {
    returnState: truck.returnState,
  });
  return (
    <article
      className={`@container rounded-box border border-l-[6px] border-base-content/10 bg-base-100 p-4 sm:p-5 ${STRIPE[tone]}`}
    >
      {/* Wide: who · when · where in the journey · Open, in one line. */}
      <div className="grid gap-x-6 gap-y-4 text-sm @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @lg:items-end @2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] @2xl:items-center">
        <div className="flex min-w-0 items-start gap-4 @lg:col-span-3 @2xl:col-span-1">
          <IconTile icon="truck" tone={tone} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-base-content/65">
                {t("ship.number", { id: truck.id })}
              </span>
              <StatusChip tone={tone === "step-1" ? "info" : tone}>
                {t(`ship.status.${truck.truckStatus}`)}
              </StatusChip>
              {returnState && (
                <StatusChip
                  tone={returnState === "escalated" ? "warning" : "error"}
                >
                  {t(`ship.returnState.${returnState}`)}
                </StatusChip>
              )}
            </p>
            <h2 className="mt-1 text-lg font-semibold break-words">
              {truck.companyName}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-base-content/75">
              <span className="rounded bg-base-content px-1.5 font-mono text-xs font-semibold text-base-100">
                {truck.registrationPlates}
              </span>
              <span>{truck.driverName}</span>
            </p>
          </div>
        </div>
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
        <div className="space-y-1.5">
          <CompactStepper steps={journey.steps} summary={journey.summary} />
          <p
            className={`text-xs ${journey.current?.state === "blocked" ? "text-error" : "text-base-content/70"}`}
          >
            {journey.heading}
          </p>
          {!profiles.length && (
            <p
              className={
                group === "missing"
                  ? "font-semibold text-step-1"
                  : "font-semibold"
              }
            >
              {t("ship.noContent")}
            </p>
          )}
          {rejected && !returnState && (
            <p className="font-medium text-error">{t("ship.rejected")}</p>
          )}
        </div>
        <Link
          className={`btn min-h-11 justify-self-end btn-outline btn-sm ${OPEN[tone]}`}
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
