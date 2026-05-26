import ShowContainerDetails from "./container-data/show-container-details";
import TruckData from "./truck-data/truck-data";
import TruckDataDetails from "./truck-data/truck-data-details";

import BackButton from "./../../shared/back-button";
import WarningMessage from "./../../shared/warningMessage";

export default function DetailsShippingData({
  data,
  isLoading,
  error,
  shippingID,
}) {
  // Add validation check for data structure
  if (!data?.shippingData?.containerProfiles) {
    return <div>Invalid data structure</div>;
  }

  const { containerProfiles } = data.shippingData;

  // Step 3: Check the statuses of container
  const hasRejectedContainers = containerProfiles.some(
    (container) => container.containerStatus === "rejected",
  );

  const rejectedContainers = containerProfiles.filter(
    (container) => container.containerStatus === "rejected",
  );

  // Group rejected containers by waste profile name
  const rejectedTypes = [
    ...new Set(
      rejectedContainers.map((container) => container.wasteProfile.name),
    ),
  ];
  // rejectedTypes will be an array containing unique values ​​["M01"] or ["M02"] or ["M01", "M02"]

  let warningMessage = "";

  if (rejectedTypes.length === 1) {
    warningMessage = `Truck license plate: "${data.shippingData.registrationPlates}", company name: "${data.shippingData.companyName}" does not match the number of the container type: "${rejectedTypes[0]}"`;
  } else if (rejectedTypes.length === 2) {
    warningMessage = `Truck license plate: "${data.shippingData.registrationPlates}", company name: "${data.shippingData.companyName}" does not match the number of the container. Both container types (${rejectedTypes.join(" and ")}) have been rejected. Please perform a complete inspection.`;
  }

  return (
    <>
      <div className="m-2 mt-16 flex flex-col gap-6 md:flex-row md:space-x-6">
        <div className="w-full md:w-1/2">
          {/* Truck Details */}
          <TruckData
            data={data}
            isLoading={isLoading}
            error={error}
            shippingID={shippingID}
          />

          {/* Go backe to the shipping informations */}
          <div className="mt-2">
            <BackButton route={"shipping-informations"} />
          </div>

          {/* Container Details */}

          <div className="space-y-2 sm:ml-10 md:ml-20">
            {/* Display container profiles in reverse chronological order, 
                  or show "No containers" message if empty */}
            {containerProfiles && containerProfiles.length > 0 ? (
              containerProfiles
                .slice()
                .reverse()
                .map((profile) => (
                  <ShowContainerDetails key={profile.id} data={profile} />
                ))
            ) : (
              <div className="flex justify-center pt-10">
                <p>No containers in the truck</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side of the page Truck Details and warning message */}
        <div className="flex w-full flex-col space-y-6 md:w-1/2">
          <div>
            <TruckDataDetails data={data} />
          </div>

          {/* Display warning message if there are rejected containers */}
          <div>
            {hasRejectedContainers && (
              <WarningMessage
                warningColor={"bg-red-600"}
                warningMessage={warningMessage}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
