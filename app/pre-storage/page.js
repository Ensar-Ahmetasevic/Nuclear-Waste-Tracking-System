"use client";

import CapacityAndConditions from "./../../components/pages/pre-storage/capacity-and-conditions/capacity-and-conditions";

import usePreStorageLocationQuery from "../../requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-location-query";

import AlertWarning from "./../../components/shared/alert-warning";
import LoadingSpinnerPage from "./../../components/shared/loading-spiner-page";

export default function PreStorage() {
  const { data, isLoading, isError } = usePreStorageLocationQuery();

  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"There are no Containers in the Pre-Storage!"} />
      </div>
    );
  }

  // Reverse the data array to change the rendering order
  const reversedData = data.slice().reverse();

  // data.slice() creates a new array copy so that we don't mutate the original data array.
  // data.reverse() reverses the order of the elements in the new array.

  return (
    <div className="mt-8 flex flex-col flex-wrap justify-center gap-6 p-4 sm:mt-20 sm:gap-12 sm:p-8 md:flex-row">
      {reversedData.map((preStorageData) => (
        <div key={preStorageData.id}>
          <CapacityAndConditions data={preStorageData} />
        </div>
      ))}
    </div>
  );
}
