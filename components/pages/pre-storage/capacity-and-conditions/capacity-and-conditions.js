import { useState } from "react";
import Link from "next/link";

import useShippingInformationQuery from "../../../../requests/request-shipping-information/use-fetch-shipping-informations-query";

import LoadingSpinnerButton from "./../../../shared/loading-spiner-button";
import Indicator from "./../../../shared/indicator";
import LoadingSpinnerPage from "../../../shared/loading-spiner-page";
import AlertWarning from "../../../shared/alert-warning";

// Import dynamic from next/dynamic
import dynamic from "next/dynamic";

// Dynamically import CustomPieChart with ssr: false
const CustomPieChart = dynamic(
  () => import("../../../shared/custom-pie-chart"),
  {
    ssr: false,
  },
);

export default function CapacityAndConditions({ data }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const { data: entryData, isLoading, isError } = useShippingInformationQuery();

  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  }

  if (!entryData || isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <AlertWarning text={"Error loading shipping informations data"} />
      </div>
    );
  }

  /* Helper function for checking if there are pending statuses for a specific hale */
  const hasPendingStatus = (haleName) => {
    if (!entryData.shippingData) return false;

    // We only extract M01 or M02 from "Hall M01" or "Hall M02"
    const shortHaleName = haleName.split(" ")[1];

    return entryData.shippingData.some((shipment) =>
      shipment.containerProfiles.some(
        (profile) =>
          profile.containerStatus === "pending" &&
          profile.wasteProfile.name === shortHaleName,
      ),
    );
  };

  const halesurface = data.surfaceArea;
  const containerFootprint = data.containerFootprint;

  const totalContainers = data.preStorageEntry.reduce(
    (total, waste) => total + waste.quantity,
    0,
  );

  const usedSpace = totalContainers * containerFootprint;

  const freeSpace = halesurface - usedSpace;

  const dataForPieChart = [
    { name: "Free Space", value: freeSpace },
    { name: "Used Space", value: usedSpace },
  ];

  const handleClick = () => {
    setIsNavigating(true);
  };

  return (
    <div className="mx-4 flex flex-col">
      <div className="grid min-h-[400px] w-full flex-grow place-items-center rounded-box border-2 border-yellow-600 bg-base-300 sm:min-w-[400px]">
        <div className="flex w-full max-w-md flex-col items-center px-4 py-2 sm:w-3/4">
          <div className="mb-10 mt-5">
            <h1 className="stat-value">{data.name}</h1>
          </div>

          <div className="mb-6 flex w-full flex-row items-center justify-evenly">
            <div>
              <Link href={`/pre-storage/${data.id}`}>
                <div className="transform transition-transform duration-700 ease-in-out hover:scale-110">
                  <CustomPieChart data={dataForPieChart} />
                </div>
              </Link>
            </div>
            <div className="flex flex-col space-y-3 ">
              <div className="flex flex-row items-center space-x-3">
                <div>
                  <p>Free space</p>
                </div>
                <div className="h-4 w-4 rounded bg-green-500"></div>
              </div>
              <div className="flex flex-row items-center space-x-3">
                <div>
                  <p>Used space</p>
                </div>
                <div className="h-4 w-4 rounded  bg-red-500"></div>
              </div>
            </div>
          </div>
          {/* CTA */}
          <Link
            className="btn btn-outline btn-warning mb-5 w-full transition delay-75 duration-200 ease-in-out hover:-translate-y-1 hover:scale-105"
            href={`/pre-storage/${data.id}`}
            onClick={() => handleClick()}
          >
            {hasPendingStatus(data.name) && <Indicator color="bg-green-400" />}
            {isNavigating ? <LoadingSpinnerButton /> : "DETAILS"}
          </Link>
        </div>
      </div>
    </div>
  );
}
