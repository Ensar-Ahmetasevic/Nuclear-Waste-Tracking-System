import dynamic from "next/dynamic";

import useShippingInformationsStautsQuery from "./../../../../../requests/request-shipping-information/use-fetch-shipping-information-status-query";
import useFinalStorageLocationQuery from "./../../../../../requests/request-final-storage/request-final-storage-location/use-fetch-final-storage-location-query";

import RequestDrawerFromEntry from "./components/request-drawer-from-entry";
import RequestDrawerFromFinalStorage from "./components/request-drawer-from-final-storage";

import LoadingSpinnerPage from "../../../../shared/loading-spiner-page";
import AlertWarning from "../../../../shared/alert-warning";

// Dynamically import the CustomPieChart component without server-side rendering
const CustomPieChart = dynamic(
  () => import("./../../../../shared/custom-pie-chart"),
  {
    ssr: false,
  },
);

export default function CapacityDetails({
  dataForPieChart,
  freeSpacePercentage,
  freeSpace,
  freeContainers,
  usedSpacePercentage,
  usedSpace,
  totalContainers,
  hallData,
}) {
  // Get pending shipping information for this hall
  const {
    data: pendingShippingInformations,
    isLoading,
    isError,
  } = useShippingInformationsStautsQuery();

  const {
    data: finalStorageLocationData,
    isLoading: finalStorageLocationLoading,
    isError: finalStorageLocationError,
  } = useFinalStorageLocationQuery();

  if (isLoading || finalStorageLocationLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  }

  if (
    isError ||
    !pendingShippingInformations ||
    finalStorageLocationError ||
    !finalStorageLocationData
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"Error loading PreStorage request"} />
      </div>
    );
  }

  // Get the waste type or container type for the current hall
  const hallContainerType = hallData.containerType;

  // Filter the transport requests for this hall
  const filteredTransportRequestsFromFinalStorage =
    finalStorageLocationData.filter(
      (request) => request.containerType === hallContainerType,
    );

  // Filter data which have finalStorageStatus === pending
  const pendingDataFromFinalStorage =
    filteredTransportRequestsFromFinalStorage.flatMap((request) =>
      request.storageTransferRequests.filter(
        (transferRequest) => transferRequest.preStorageStatus === "pending",
      ),
    );

  // Check if there is any "pending" containers with status pending from final storage for this hall
  const hasPendingContainersFromFinalStorage =
    filteredTransportRequestsFromFinalStorage.some((request) =>
      request.storageTransferRequests.some(
        (transferRequest) => transferRequest.preStorageStatus === "pending",
      ),
    );

  // Filter the pending shipping informations for this hall
  const filteredPendingShippingInformations =
    pendingShippingInformations.filter((info) =>
      info.containerProfiles.some(
        (profile) => profile.wasteProfile.name === hallContainerType,
      ),
    );

  // Map through filtered shipping informations
  const requestQuantity = filteredPendingShippingInformations.map(
    (shippingInfo) => {
      // Get the total quantity of containers of the relevant wasteProfile type
      const totalQuantity = shippingInfo.containerProfiles.reduce(
        (sum, profile) =>
          profile.wasteProfile.name === hallContainerType
            ? sum + profile.quantity
            : sum,
        0,
      );

      // Status of all continers relevant to the hall
      const containerStatus = shippingInfo.containerProfiles
        .filter((profile) => profile.wasteProfile.name === hallContainerType)
        .map((profile) => profile.containerStatus);

      // IDs of all continers relevant to the hall
      const containerProfileIds = shippingInfo.containerProfiles
        .filter((profile) => profile.wasteProfile.name === hallContainerType)
        .map((profile) => profile.id);

      return {
        totalQuantity,
        containerStatus,
        containerProfileIds,
        companyName: shippingInfo.companyName,
        registrationPlates: shippingInfo.registrationPlates,
        status: shippingInfo.status,
        id: shippingInfo.id,
      };
    },
  );

  // Check if there is any "pending" container status for this hall
  const hasPendingContainersInHall = requestQuantity.some((request) =>
    request.containerStatus.includes("pending"),
  );

  return (
    <div className="flex flex-col">
      {/* Display pie chart and usage information */}
      <div className="mb-6 flex w-full flex-row space-x-12">
        {/* Pie chart with transition effects */}
        <div className="flex flex-row items-center justify-evenly">
          <div className="transform transition-transform duration-700 ease-in-out hover:scale-110">
            <CustomPieChart data={dataForPieChart} />
          </div>
        </div>

        {/* Display free and used space information */}
        <div className="flex flex-col space-y-8">
          <InfoBox
            label="Free space"
            color="green"
            percentage={freeSpacePercentage}
            space={freeSpace}
            containers={freeContainers}
          />
          <InfoBox
            label="Used space"
            color="red"
            percentage={usedSpacePercentage}
            space={usedSpace}
            containers={totalContainers}
          />
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        {/* Alert message for pending containers from final storage */}

        <RequestDrawerFromFinalStorage
          hasPendingContainersFromFinalStorage={
            hasPendingContainersFromFinalStorage
          }
          requestData={pendingDataFromFinalStorage}
        />

        {/* Open Request Drawer from Entry */}
        <RequestDrawerFromEntry
          hasPendingContainersInHall={hasPendingContainersInHall}
          filteredPendingShippingInformations={
            filteredPendingShippingInformations
          }
          requestQuantity={requestQuantity}
          hallData={hallData}
        />
      </div>
    </div>
  );
}

// InfoBox component to display information about free or used space
function InfoBox({ label, color, percentage, space, containers }) {
  return (
    <div
      className={`flex transform flex-col items-center rounded-md border-4 transition-transform duration-500 ease-in-out hover:scale-105 border-${color}-500`}
    >
      <div className="my-4 flex flex-row items-center space-x-3">
        <div>
          <p>{label}</p>
        </div>
        {/* Colored indicator box */}
        <div className={`h-4 w-4 rounded bg-${color}-500`}></div>
      </div>
      {/* Table displaying the percentage, space in m2, and number of containers */}
      <table className="table">
        <tbody>
          <tr className="flex justify-around">
            <td>{percentage} %</td>
            <td>{space} m2</td>
            <td>{containers} Containers</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
