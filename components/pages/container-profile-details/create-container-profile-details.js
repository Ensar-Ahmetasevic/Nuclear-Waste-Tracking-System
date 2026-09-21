"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useLocationOriginQuery from "../../../requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import useWasteProfileQuery from "../../../requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useContainerTypeQuery from "../../../requests/request-container-profile/request-container-type/use-fetch-container-type-query";

import DynamicFormDisplay from "./dynamic-form-display";

export default function CreateContainerProfileDetails() {
  const [activeButton, setActiveButton] = useState(null);
  const { data: session } = useSession();
  const canManage = session?.user?.role === "ADMINISTRATOR";
  const origins = useLocationOriginQuery();
  const waste = useWasteProfileQuery();
  const types = useContainerTypeQuery();
  const loading = origins.isLoading || waste.isLoading || types.isLoading;
  const failed = origins.isError || waste.isError || types.isError;
  const ready = origins.data?.length > 0 && waste.data?.some(profile => types.data?.some(type => type.id === profile.containerTypeId));

  const sections = [
    { label: "Location Origin", key: "Location origin" },
    { label: "Waste Profile", key: "Waste profile" },
    { label: "Container Type", key: "Container type" },
  ];
  const selected = sections.find(section => activeButton?.startsWith(section.key));

  return (
    <section id="containerProfileSetup">
      <div className="container mx-auto flex flex-col items-center px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Info Card */}
        <div className="mb-6 w-full max-w-3xl rounded-lg bg-gradient-to-r from-base-300 to-base-200 p-4 shadow-lg sm:mb-8 sm:p-8">
          <h2 className="mb-4 text-center text-xl font-bold text-primary sm:text-2xl">
            Container Profile Setup Guide
          </h2>

          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg">
                Each Container Profile requires three key components:
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    1
                  </span>
                  <p className="font-semibold">Location Origin</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    2
                  </span>
                  <p className="font-semibold">Waste Profile</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    3
                  </span>
                  <p className="font-semibold">Container Type</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-base-content/80">
              {loading ? "Checking available components…" : failed ? "Unable to check components. Please refresh and retry." : ready
                ? "Components are ready. Open an IN shipment and choose Add Containers to create a Container Profile."
                : canManage ? "Add a location origin and a waste profile linked to a container type to create a Container Profile."
                : "Ask an administrator to configure the missing components before adding containers."}
            </p>
            {!loading && !failed && ready && (
              <Link className="btn btn-primary" href="/shipping-informations">Open shipments</Link>
            )}
          </div>
        </div>

        {canManage ? (
          <section className="w-full min-w-0 space-y-5" aria-label="Component management">
            <div className="flex flex-wrap justify-center gap-3" aria-label="Component selection">
              {sections.map(section => (
                <button key={section.key} type="button" aria-pressed={selected?.key === section.key}
                  className={`btn ${selected?.key === section.key ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setActiveButton(`${section.key} Table`)}>
                  {section.label}
                </button>
              ))}
            </div>
            {selected && (
              <div className="space-y-4" aria-live="polite">
                <h2 className="text-center text-xl font-semibold">{selected.label}</h2>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" className="btn btn-sm" aria-pressed={activeButton.endsWith("Table")} onClick={() => setActiveButton(`${selected.key} Table`)}>View / Edit</button>
                  <button type="button" className="btn btn-sm" aria-pressed={activeButton.endsWith("Form")} onClick={() => setActiveButton(`${selected.key} Form`)}>Add new</button>
                </div>
                <DynamicFormDisplay activeButton={activeButton} setActiveButton={setActiveButton} />
              </div>
            )}
          </section>
        ) : (
          <p className="text-center text-sm text-base-content/70">
            Component definitions are managed by administrators. You can use existing components when adding containers to an IN shipment.
          </p>
        )}
      </div>
    </section>
  );
}
