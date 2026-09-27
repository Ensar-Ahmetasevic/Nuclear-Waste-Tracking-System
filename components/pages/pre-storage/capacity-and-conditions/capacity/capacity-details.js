import useShippingInformationsStautsQuery from "./../../../../../requests/request-shipping-information/use-fetch-shipping-information-status-query";
import useFinalStorageLocationQuery from "./../../../../../requests/use-pre-storage-transfers";

import RequestDrawerFromEntry from "./components/request-drawer-from-entry";
import RequestDrawerFromFinalStorage from "./components/request-drawer-from-final-storage";

import { InlineLoader } from "../../../../loading/loaders";
import { useT } from "../../../../shell/preferences";
import EmptyState from "../../../../ui/empty-state";
import AlertWarning from "../../../../shared/alert-warning";

// Receipts from shipments and requests from final storage for one hall.
export default function CapacityDetails({ hallData }) {
  const t = useT();
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
      <div className="flex min-h-40 items-center justify-center">
        <InlineLoader />
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
      <div className="flex min-h-40 items-center justify-center">
        <AlertWarning text={t("common.loadError")} />
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
        (profile) =>
          profile.wasteProfile.name ===
          (hallData.wasteProfile || hallContainerType),
      ),
    );

  // Map through filtered shipping informations
  const requestQuantity = filteredPendingShippingInformations.map(
    (shippingInfo) => {
      // Get the total quantity of containers of the relevant wasteProfile type
      const totalQuantity = shippingInfo.containerProfiles.reduce(
        (sum, profile) =>
          profile.wasteProfile.name ===
          (hallData.wasteProfile || hallContainerType)
            ? sum + profile.quantity
            : sum,
        0,
      );

      // Status of all continers relevant to the hall
      const containerStatus = shippingInfo.containerProfiles
        .filter(
          (profile) =>
            profile.wasteProfile.name ===
            (hallData.wasteProfile || hallContainerType),
        )
        .map((profile) => profile.containerStatus);

      // IDs of all continers relevant to the hall
      const containerProfileIds = shippingInfo.containerProfiles
        .filter(
          (profile) =>
            profile.wasteProfile.name ===
            (hallData.wasteProfile || hallContainerType),
        )
        .map((profile) => profile.id);

      return {
        totalQuantity,
        containerStatus,
        containerProfileIds,
        profiles: shippingInfo.containerProfiles.filter((profile) =>
          containerProfileIds.includes(profile.id),
        ),
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
      <div className="flex flex-col space-y-4">
        {!hasPendingContainersFromFinalStorage &&
          !hasPendingContainersInHall && (
            <EmptyState>{t("loc.nothingPending.PRE_STORAGE")}</EmptyState>
          )}
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
