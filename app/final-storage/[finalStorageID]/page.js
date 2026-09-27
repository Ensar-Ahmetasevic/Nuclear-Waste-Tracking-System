"use client";
import { useParams } from "next/navigation";

import useFinalStorageByIdQuery from "../../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-by-id-query";

import FinalCapacityAndConditionsDetails from "./../../../components/pages/final-storage/setup/capacity-and-conditions/final-capacity-and-conditions-details";

import { PageLoader } from "./../../../components/loading/loaders";
import AlertWarning from "./../../../components/shared/alert-warning";
import { useT } from "../../../components/shell/preferences";

export default function DisplayFinalStorageData() {
  const t = useT();
  const params = useParams();
  const finalStorageID = params.finalStorageID;

  const { data, isLoading, isError } = useFinalStorageByIdQuery(finalStorageID);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data || !data.finalStorageDataById) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <AlertWarning text={t("loc.loadError")} />
      </div>
    );
  }

  return (
    <FinalCapacityAndConditionsDetails
      finalStorageData={data.finalStorageDataById}
    />
  );
}
