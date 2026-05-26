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
        className={`flex flex-col gap-4 rounded-lg border-2 p-3 sm:p-4 md:flex-row md:items-start md:justify-between ${truckStatus === "IN" ? "border-green-600" : "border-red-600"}`}
      >
        <div className="min-w-0 flex-1 space-y-3 text-sm sm:text-base md:text-lg">
          {/* Company Name */}
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-2">
            <p className="shrink-0 text-base-content/70">Transport data for:</p>
            <p className="break-words font-bold">{companyName}</p>
          </div>

          <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
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
        <div className="flex w-full shrink-0 flex-col gap-3 border-t border-base-300 pt-3 md:w-auto md:border-t-0 md:pt-0">
          <div className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm sm:text-base md:justify-start">
            <span className="font-medium">Activ status:</span>
            <span className="font-bold">{truckStatus}</span>
          </div>
          <div className="flex flex-row items-center gap-3">
            {/* IN */}
            <button
              type="button"
              className={`pointer-events-none h-9 w-14 shrink-0 rounded border-2 text-sm font-semibold ${
                truckStatus === "IN"
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-slate-700 text-slate-700"
              }`}
              disabled={truckStatus === "IN" || isLoading}
            >
              {updateLoading ? <LoadingSpinnerButton /> : "IN"}
            </button>

            {/* OUT */}
            <button
              type="button"
              className={`h-9 w-14 shrink-0 rounded border-2 text-sm font-semibold ${
                truckStatus === "OUT"
                  ? "pointer-events-none border-red-600 bg-red-600 text-white"
                  : "cursor-pointer border-red-600 text-slate-700 hover:bg-red-50 sm:hover:scale-105"
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
