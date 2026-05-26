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

  const containerList =
    containerProfiles && containerProfiles.length > 0 ? (
      containerProfiles
        .slice()
        .reverse()
        .map((profile) => (
          <ShowContainerDetails key={profile.id} data={profile} />
        ))
    ) : (
      <div className="flex justify-center py-8">
        <p className="text-base-content/70">No containers in the truck</p>
      </div>
    );

  const summaryBlock = (
    <>
      <TruckDataDetails data={data} />
      {hasRejectedContainers && (
        <WarningMessage
          warningColor={"bg-red-600"}
          warningMessage={warningMessage}
        />
      )}
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-6 pb-8 lg:flex-row lg:gap-8">
        <div className="flex w-full min-w-0 flex-col gap-4 lg:w-1/2">
          <BackButton route={"shipping-informations"} />

          <TruckData
            data={data}
            isLoading={isLoading}
            error={error}
            shippingID={shippingID}
          />

          <div className="flex flex-col gap-4 lg:hidden">{summaryBlock}</div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 lg:hidden">
              Containers
            </h2>
            {containerList}
          </section>
        </div>

        <aside className="hidden w-full min-w-0 flex-col gap-6 lg:flex lg:w-1/2">
          {summaryBlock}
        </aside>
      </div>
    </>
  );
}
