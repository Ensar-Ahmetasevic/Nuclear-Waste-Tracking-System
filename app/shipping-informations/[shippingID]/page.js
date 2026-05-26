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
      <div className="container mx-auto flex flex-col items-center pt-3 sm:pt-4">
        <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-20">
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
