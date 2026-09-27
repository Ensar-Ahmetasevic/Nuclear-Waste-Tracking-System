import { useState } from "react";
import { useT } from "../../../../../shell/preferences";

import ModalSendRequestToPreStorageForm from "./modal/modal-send-request-to-preStorage-form";

import RequestDrawer from "./components/request-drawer";

// Transfer requests of one room: the open request or a new one.
export default function CapacityDetails({ roomData }) {
  const t = useT();
  const [isModalRequestOpen, setIsModalRequestOpen] = useState(false);

  // Check if there is any "requestPending" or "transportPending" or "requestRejected"  storage transfer request for this hall
  const hasActiveStorageTransferRequests =
    roomData.storageTransferRequests.some(
      (request) =>
        request.finalStorageStatus === "requestPending" ||
        request.finalStorageStatus === "transportPending" ||
        request.finalStorageStatus === "requestRejected",
    );

  return (
    <>
      <div className="flex flex-col">
        {hasActiveStorageTransferRequests ? (
          <RequestDrawer
            hasActiveStorageTransferRequests={hasActiveStorageTransferRequests}
            roomData={roomData}
          />
        ) : (
          <button
            type="button"
            className="btn min-h-11 w-full btn-primary"
            onClick={() => setIsModalRequestOpen(true)}
          >
            {t("loc.sendRequest")}
          </button>
        )}
      </div>

      <ModalSendRequestToPreStorageForm
        isOpen={isModalRequestOpen}
        closeModal={() => setIsModalRequestOpen(false)}
        roomData={roomData}
      />
    </>
  );
}
