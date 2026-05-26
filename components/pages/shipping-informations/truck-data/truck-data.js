import { useState } from "react";
import { useRouter } from "next/navigation";

import CreateContainerProfile from "./../container-data/create-container-profile";

import ModalTruckUpdate from "./../components/modals/modal-truck-update";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";

import useDeleteShippingInformationsMutations from "./../../../../requests/request-shipping-information/use-delete-shipping-informations-mutation";
import useUpdateShippingStatusMutation from "./../../../../requests/request-shipping-information/use-update-shipping-status-mutation";

import LoadingSpinnerButton from "./../../../shared/loading-spiner-button";
import ConfirmDelete from "./../../../shared/confirmDelete";

export default function TruckData({ data, isLoading, error, shippingID }) {
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();
  // Delete data
  const {
    mutateAsync: deleteMutateAsync,
    isSuccess: successfullyDeleted,
    isPending: deleteLoading,
    isError: deleteError,
  } = useDeleteShippingInformationsMutations();

  // Update Shipping Status
  const {
    mutateAsync: updateMutateAsync,
    isSuccess: successfullyUpdated,
    isPending: updateLoading,
    isError: updateError,
  } = useUpdateShippingStatusMutation();

  if (isLoading) {
    return (
      <div>
        <LoadingSpinnerButton /> Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <LoadingSpinnerButton /> Error loading data
      </div>
    );
  }

  if (!data || !data.shippingData) {
    return <div>{"No data available"}</div>;
  }

  // Destructure the necessary data
  const {
    id,
    companyName,
    truckStatus,
    status: containerStatus,
  } = data.shippingData;

  // Updating Truck Status
  const updateStatus = (shippingStatus) => {
    const shippingStatusData = {
      id,
      truckStatus: shippingStatus,
      exitDateTime: new Date().toISOString(),
    };

    updateMutateAsync(shippingStatusData);
  };

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    await deleteMutateAsync(data.shippingData.id);
    setShowDeleteConfirm(false);

    if (!successfullyDeleted) {
      router.push("/shipping-informations");
    }
  };

  return (
    <>
      {/* Truck Data */}
      <div
        className={`flex flex-row items-center justify-between rounded-lg ${truckStatus === "IN" ? "border-green-600" : "border-red-600"} border-2 p-4`}
      >
        <div className="space-y-3 text-lg">
          {/* Company Name */}
          <div className="flex flex-row">
            <p>Transport data for:</p>
            <p className="ml-4 font-bold">{companyName}</p>
          </div>

          <div className="flex flex-row space-x-4">
            {/* Add Containers */}
            {containerStatus === "accepted" ? null : (
              <CreateContainerProfile shippingID={shippingID} />
            )}

            {/* Edit Truck Data */}
            <div className="tooltip" data-tip="Edit">
              <label
                htmlFor="update_modal_shipping_data"
                className="btnUpdate"
                onClick={() => setOpenModalUpdate(true)}
              >
                <CiEdit />
              </label>
            </div>

            {/* Delete Truck Data */}
            {containerStatus === "accepted" ? null : (
              <div className="tooltip" data-tip="Delete">
                <button
                  className="btnDelete"
                  id="deleteButton"
                  disabled={deleteLoading || successfullyDeleted}
                  onClick={() => handleDelete()}
                >
                  {deleteLoading ? <LoadingSpinnerButton /> : <MdDeleteSweep />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col space-y-3">
          <div className="flex flex-row space-x-2">
            <h2>Activ status:</h2>
            <h2 className="font-bold">{truckStatus}</h2>
          </div>
          <div className="flex flex-row space-x-4">
            {/* IN */}
            <button
              className={`pointer-events-none h-12 w-16 rounded text-center font-bold ${
                truckStatus === "IN"
                  ? " border-green-700 bg-green-700 text-white underline underline-offset-8 outline outline-offset-4 outline-green-700"
                  : "border-2 border-slate-700 text-slate-700 "
              }`}
              disabled={truckStatus === "IN" || isLoading}
            >
              {updateLoading ? <LoadingSpinnerButton /> : "IN"}
            </button>

            {/* OUT */}
            <button
              className={`h-12 w-16 rounded  text-center font-bold ${
                truckStatus === "OUT"
                  ? "pointer-events-none bg-red-600 text-white underline underline-offset-8 outline outline-offset-4 outline-red-600"
                  : "transform cursor-pointer text-slate-700 outline outline-red-600 transition-transform duration-300 ease-in-out hover:scale-110"
              }`}
              onClick={() => updateStatus("OUT")}
              disabled={truckStatus === "OUT" || isLoading}
            >
              {updateLoading ? <LoadingSpinnerButton /> : "OUT"}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDelete
          setShowDeleteConfirm={setShowDeleteConfirm}
          confirmDelete={confirmDelete}
        />
      )}

      {/* Update Truck Data Modal */}
      {openModalUpdate ? (
        <ModalTruckUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalTruckFormData={data.shippingData}
        />
      ) : null}
    </>
  );
}
