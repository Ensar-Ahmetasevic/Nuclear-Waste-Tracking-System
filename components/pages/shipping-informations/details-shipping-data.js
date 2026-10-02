"use client";
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";
import EmptyState from "../../ui/empty-state";
import ShipmentTimeline from "./shipment-timeline";
import ShowContainerDetails from "./container-data/show-container-details";
import TruckData from "./truck-data/truck-data";
import { journeyView } from "./journey-view";
import JourneySteps from "./journey-steps";
import ReturnCases from "./return-cases";
import Breadcrumb from "../../ui/breadcrumb";
import ProfileDocuments from "../profiles/profile-documents";

// Shipment detail: header with truck data and actions, the five-step journey,
// the Container Profiles and, beside them, every recorded event in one list.
export default function DetailsShippingData({ data }) {
  const t = useT();
  const format = useFormat();
  const shipment = data.shippingData;
  const profiles = shipment.containerProfiles;
  const journey = journeyView(t, format, data.journey, {
    returnState: data.returnState,
    people: data.people,
  });
  const total = profiles.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/shipping-informations", label: t("ship.title") },
          { label: t("ship.number", { id: shipment.id }) },
        ]}
      />

      <TruckData data={data} canEdit={data.permissions?.canEdit === true} />

      <JourneySteps label={t("ship.journey.title")} steps={journey.steps} />

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
                  canDelete={data.permissions?.canDeleteContainers === true}
                />
              ))
          ) : (
            <EmptyState>{t("ship.profiles.empty")}</EmptyState>
          )}
          {profiles.length > 0 && (
            <ProfileDocuments
              profiles={profiles.map((row) => row.id)}
              documents={data.documents || []}
              canRemove={data.permissions?.canRemoveDocuments === true}
            />
          )}
        </section>

        <aside className="space-y-6">
          <ShipmentTimeline timeline={data.timeline} />
        </aside>
      </div>
    </div>
  );
}
