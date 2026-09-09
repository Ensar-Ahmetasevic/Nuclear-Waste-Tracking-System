"use client";

import FinalStorageCapacityAndConditions from "./../../components/pages/final-storage/setup/capacity-and-conditions/final-storage-capacity-and-conditions";

import useFinalStorageLocationQuery from "../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-location-query";

import AlertWarning from "./../../components/shared/alert-warning";
import LoadingSpinnerPage from "./../../components/shared/loading-spiner-page";

export default function FinalStorage() {
  const { data, isLoading, isError } = useFinalStorageLocationQuery();

  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"There are no Containers in the Final-Storage!"} />
      </div>
    );
  }

  // Reverse the data array to change the rendering order
  const reversedData = data.slice().reverse();

  // data.slice() creates a new array copy so that we don't mutate the original data array.
  // data.reverse() reverses the order of the elements in the new array.

  return (
    <div className="mt-8 flex flex-col flex-wrap justify-center gap-6 p-4 sm:mt-20 sm:gap-12 sm:p-8 md:flex-row">
      {reversedData.map((finalStorageData) => (
        <div key={finalStorageData.id}>
          <FinalStorageCapacityAndConditions data={finalStorageData} />
        </div>
      ))}
    </div>
  );
}
