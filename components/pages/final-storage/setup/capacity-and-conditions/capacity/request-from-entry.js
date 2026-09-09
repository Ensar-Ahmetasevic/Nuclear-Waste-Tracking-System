import { useState } from "react";

import ModalFinalStorageCapacityForm from "../../../../pre-storage/capacity-and-conditions/capacity/modal/modal-accept-request-from-final-storage-form";

import useUpdateContainerProfileStatusMutation from "./../../../../../../requests/request-container-profile/use-update-container-profile-status-mutation";

export default function RequestFromEntry({ entryData, roomData }) {
  const [isModalCapacityOpen, setIsModalCapacityOpen] = useState(false);

  // Update Container status
  const {
    mutateAsync: updateContainerProfileStatusMutation,
    isPending: updateContainerProfileStatusPending,
    isSuccess: updateContainerProfileStatusSuccess,
  } = useUpdateContainerProfileStatusMutation();

  // Function to toggle the visibility of a modal
  const toggleCapacityModal = () => setIsModalCapacityOpen((prev) => !prev);

  const isRejected = async () => {
    const containerStatusUpdateData = {
      containerStatus: "rejected",
      containerProfileId: entryData.containerProfileIds[0],
    };

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
              <th>Company name:</th>
              <th>Registration:</th>
              <th>Quantity</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* row 1 */}
            <tr>
              <th></th>
              <td>{entryData.companyName}</td>
              <td>{entryData.registrationPlates}</td>
              <td>{entryData.totalQuantity}</td>
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
      <ModalFinalStorageCapacityForm
        isOpen={isModalCapacityOpen}
        closeModal={() => toggleCapacityModal()}
        roomData={roomData}
        entryData={entryData}
      />
    </>
  );
}
