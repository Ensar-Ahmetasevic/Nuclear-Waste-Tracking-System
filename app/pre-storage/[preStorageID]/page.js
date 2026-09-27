"use client";
import { useParams } from "next/navigation";

import usePreStorageByIdQuery from "../../../requests/request-pre-storage/request-pre-storage-location/use-fetch-pre-storage-by-id-query";

import CapacityAndConditionsDetails from "./../../../components/pages/pre-storage/capacity-and-conditions/capacity-and-conditions-details";

import { PageLoader } from "./../../../components/loading/loaders";
import AlertWarning from "./../../../components/shared/alert-warning";
import { useT } from "../../../components/shell/preferences";

export default function DisplayPreStorageData() {
  const t = useT();
  const params = useParams();
  const preStorageID = params.preStorageID;

  const { data, isLoading, isError } = usePreStorageByIdQuery(preStorageID);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data || !data.preStorageDataById) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <AlertWarning text={t("loc.loadError")} />
      </div>
    );
  }

  return (
    <CapacityAndConditionsDetails preStorageData={data.preStorageDataById} />
  );
}
