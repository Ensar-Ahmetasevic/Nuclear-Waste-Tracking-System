"use client";

import usePreStorageByIdQuery from "../../../requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-by-id-query";

import CapacityAndConditionsDetails from "./../../../components/pages/pre-storage/capacity-and-conditions/capacity-and-conditions-details";

import LoadingSpinnerPage from "./../../../components/shared/loading-spiner-page";
import AlertWarning from "./../../../components/shared/alert-warning";

export default function DisplayPreStorageData({ params }) {
  const preStorageID = params.preStorageID;

  const { data, isLoading, isError } = usePreStorageByIdQuery(preStorageID);

  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (isError || !data || !data.preStorageDataById) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"Error loading PreStorage details data"} />
      </div>
    );
  }

  return (
    <CapacityAndConditionsDetails preStorageData={data.preStorageDataById} />
  );
}
