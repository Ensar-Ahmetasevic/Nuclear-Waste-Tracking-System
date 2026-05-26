"use client";

import DetailsShippingData from "../../../components/pages/shipping-informations/details-shipping-data";
import useShippingInformationByIdQuery from "./../../../requests/request-shipping-information/use-fetch-shipping-information-by-id-query";
import LoadingSpinnerPage from "./../../../components/shared/loading-spiner-page";
import AlertWarning from "./../../../components/shared/alert-warning";

export default function ShippingDetails({ params }) {
  const shippingID = params.shippingID;

  // Fetching ShippingData
  const { data, isLoading, error } =
    useShippingInformationByIdQuery(shippingID);

  if (isLoading) {
    return <LoadingSpinnerPage />;
  }

  if (!data || error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"Error loading data"} />
      </div>
    );
  }

  return (
    <>
      <div className="items-centerpt-20 container mx-auto flex-col">
        <div className="px-20">
          <DetailsShippingData
            data={data}
            isLoading={isLoading}
            error={error}
            shippingID={shippingID}
          />
        </div>
      </div>
    </>
  );
}
