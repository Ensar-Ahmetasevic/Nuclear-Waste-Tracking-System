import { useState } from "react";
import dayjs from "dayjs";

import ModalAcceptRequestFromFinalStorageForm from "../../modal/modal-accept-request-from-final-storage-form";

import useUpdateContainerProfileStatusMutation from "../../../../../../../requests/request-container-profile/use-update-container-profile-status-mutation";
import useUpdateFinalStorageTransferRequestMutation from "./../../../../../../../requests/request-final-storage/request-final-storage-transver-request/use-update-final-storage-transver-request-mutation";

export default function RequestFromFinalStorage({ requestData }) {
  const [isModalCapacityOpen, setIsModalCapacityOpen] = useState(false);

  // Update Container status
  const {
    mutateAsync: updateContainerProfileStatusMutation,
    isPending: updateContainerProfileStatusPending,
    isSuccess: updateContainerProfileStatusSuccess,
  } = useUpdateContainerProfileStatusMutation();

  const {
    mutateAsync: updateFinalStorageTransferRequestMutation,
    isPending: transferRequestPending,
    isSuccess: transferRequestSuccess,
  } = useUpdateFinalStorageTransferRequestMutation();

  // Function to toggle the visibility of a modal
  const toggleCapacityModal = () => setIsModalCapacityOpen((prev) => !prev);

  // Reject request
  const isRejected = async () => {
    try {
      await updateFinalStorageTransferRequestMutation({
        operationType: "PRE_STORAGE_REJECT_REQUEST",
        data: {
          id: requestData.id,
        },
      });
    } catch (error) {
      console.error("Error handling rejection:", error);
    }
  };

  const updateContainerStatus = async (containerStatusUpdateData) => {
    try {
      await updateContainerProfileStatusMutation(containerStatusUpdateData);
    } catch (error) {
      console.error("Failed to update container status:", error);
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="menu table min-h-full w-full md:w-1/2 bg-base-200 p-4 text-base-content">
          {/* head */}
          <thead>
            <tr>
              <th></th>
              <th>Request from:</th>
              <th>Quantity:</th>
              <th>Date:</th>
              <th>Send by Employee:</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* row 1 */}
            <tr>
              <th></th>
              <td>{requestData.requestedByRoom}</td>
              <td>{requestData.requestedQuantity}</td>
              <td>{dayjs(requestData.createdAt).format("DD.MM.YYYY HH:mm")}</td>
              <td>
                {requestData.requestedByEmployee.name +
                  " " +
                  requestData.requestedByEmployee.surname}
              </td>
              <td>
                <button
                  className="btnSave"
                  onClick={() => toggleCapacityModal()}
                >
                  Accept
                </button>
              </td>
              <td>
                <button className="btnCancel" onClick={() => isRejected()}>
                  Reject
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Capacity modal component */}
      <ModalAcceptRequestFromFinalStorageForm
        isOpen={isModalCapacityOpen}
        closeModal={() => toggleCapacityModal()}
        requestData={requestData}
      />
    </>
  );
}
