"use client";

import useFinalStorageByIdQuery from "../../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-by-id-query";

import FinalCapacityAndConditionsDetails from "./../../../components/pages/final-storage/setup/capacity-and-conditions/final-capacity-and-conditions-details";

import LoadingSpinnerPage from "./../../../components/shared/loading-spiner-page";
import AlertWarning from "./../../../components/shared/alert-warning";

export default function DisplayFinalStorageData({ params }) {
  const finalStorageID = params.finalStorageID;

  const { data, isLoading, isError } = useFinalStorageByIdQuery(finalStorageID);

  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (isError || !data || !data.finalStorageDataById) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"Error loading data"} />
      </div>
    );
  }

  return (
    <FinalCapacityAndConditionsDetails
      finalStorageData={data.finalStorageDataById}
    />
  );
}
