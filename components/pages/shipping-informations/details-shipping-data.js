"use client";
import Link from "next/link";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import EmptyState from "../../ui/empty-state";
import ShipmentTimeline from "./shipment-timeline";
import ShowContainerDetails from "./container-data/show-container-details";
import TruckData, { ShipmentCorrections } from "./truck-data/truck-data";
import TruckDataDetails from "./truck-data/truck-data-details";
import { journeyView } from "./journey-view";
import SceneJourney from "./scene-journey";
import ReturnCases from "./return-cases";
import { personLabel } from "../../shared/person-label";

// Shipment detail: header with actions, the five-step journey, the Container
// Profiles and, beside them, truck data, corrections and recorded events.
export default function DetailsShippingData({ data }) {
  const t = useT();
  const format = useFormat();
  const shipment = data.shippingData;
  const profiles = shipment.containerProfiles;
  const journey = journeyView(t, format, data.journey, { returnState: data.returnState, people: data.people });
  const total = profiles.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="space-y-6">
      <nav
        aria-label={t("ship.breadcrumb")}
        className="flex items-center gap-2 text-sm text-base-content/65"
      >
        <Link
          href="/shipping-informations"
          className="hover:text-base-content hover:underline"
        >
          {t("ship.title")}
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="text-base-content/85">
          {t("ship.number", { id: shipment.id })}
        </span>
      </nav>

      <TruckData
        data={data}
        canEdit={data.permissions?.canEdit === true}
      />

      <section aria-label={t("ship.journey.title")} className="space-y-4">
        <p className="text-sm text-base-content/70">{journey.heading}</p>
        <SceneJourney label={t("ship.journey.title")} steps={journey.steps} />
      </section>

      <ReturnCases
        returns={data.returns || []}
        profiles={profiles}
        truckStatus={shipment.truckStatus}
        canDecide={data.permissions?.canDecideReturns === true}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="shipment-containers-heading"
          className="space-y-4 lg:col-span-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="shipment-containers-heading"
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              {t("ship.profiles.title")}{" "}
              <span className="text-base-content/60">({profiles.length})</span>
            </h2>
            {profiles.length > 0 && (
              <span className="text-sm text-base-content/70">
                {t("ship.profiles.total", { count: format.number(total) })}
              </span>
            )}
          </div>
          {profiles.length ? (
            profiles
              .slice()
              .reverse()
              .map((profile) => (
                <ShowContainerDetails
                  key={profile.id}
                  data={profile}
                  canEdit={data.permissions?.canEditContainers === true}
                />
              ))
          ) : (
            <EmptyState>{t("ship.profiles.empty")}</EmptyState>
          )}
        </section>

        <aside className="space-y-6">
          <TruckDataDetails data={data} />
          <ShipmentCorrections corrections={data.corrections} people={data.people} />
          {data.containerCorrections?.length > 0 && (
            <section
              aria-labelledby="container-corrections-title"
              className="space-y-3 rounded-box border border-base-content/10 bg-base-100 p-5"
            >
              <div className="space-y-1">
                <h2
                  id="container-corrections-title"
                  className="text-lg font-semibold"
                >
                  {t("ship.containerCorrections.title")}
                </h2>
                <p className="text-sm text-base-content/70">
                  {t("ship.containerCorrections.desc")}
                </p>
              </div>
              {data.containerCorrections.map((item) => (
                <details
                  key={item.id}
                  className="rounded-xl border border-base-content/15 px-3"
                >
                  <summary className="min-h-11 cursor-pointer py-3 text-sm">
                    {t("ship.containerCorrection", {
                      id: item.id,
                      profile: item.containerProfileId,
                      time: format.dateTime(item.createdAt),
                    })}
                  </summary>
                  <div className="space-y-2 pb-3 text-sm">
                    <p>{t("ship.recordedByName", { actor: personLabel(t, data.people?.[item.actorId], item.actorId) })}</p>
                    <p className="break-words">
                      {t("ship.reason", { reason: item.reason })}
                    </p>
                    {[
                      "quantity",
                      "locationOriginId",
                      "wasteProfileId",
                      "containerStatus",
                    ].map((key) => (
                      <div key={key}>
                        <p className="font-semibold">{t(`field.${key}`)}</p>
                        <p>
                          {t("ship.before", { value: item.before[key] })} ·{" "}
                          {t("ship.after", { value: item.after[key] })}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          )}
          <ShipmentTimeline timeline={data.timeline} />
        </aside>
      </div>
    </div>
  );
}
