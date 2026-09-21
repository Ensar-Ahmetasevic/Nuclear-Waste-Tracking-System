import { useState } from "react";
import { useRouter } from "next/navigation";

import CreateContainerProfile from "./../container-data/create-container-profile";

import ModalTruckUpdate from "./../components/modals/modal-truck-update";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";

import useDeleteShippingInformationsMutations from "./../../../../requests/request-shipping-information/use-delete-shipping-informations-mutation";
import DepartureReview from "../components/modals/departure-review";

import LoadingSpinnerButton from "./../../../shared/loading-spiner-button";
import ConfirmDelete from "./../../../shared/confirmDelete";

export default function TruckData({
  data,
  isLoading,
  error,
  shippingID,
  canEdit = false,
}) {
  const [statusCorrectionOpen, setStatusCorrectionOpen] = useState(false);
  const [departureOpen, setDepartureOpen] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();
  // Delete data
  const {
    mutateAsync: deleteMutateAsync,
    isSuccess: successfullyDeleted,
    isPending: deleteLoading,
  } = useDeleteShippingInformationsMutations();

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
    companyName,
    truckStatus,
    status: containerStatus,
  } = data.shippingData;

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    if (!canEdit || !data.permissions?.canDelete) return;
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
            <p className="font-bold break-words">{companyName}</p>
          </div>

          {truckStatus === "OUT" && (
            <p className="text-sm text-base-content/70" role="status">
              {canEdit
                ? "Truck has left the unloading zone. Corrections are available to administrators only."
                : "Truck has left the unloading zone. This shipment is read-only. Contact an administrator for corrections."}
            </p>
          )}
          {truckStatus !== "OUT" && !canEdit && (
            <p className="text-sm text-base-content/70">
              You have read-only access.
            </p>
          )}

          {canEdit && (
            <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
              {/* Add Containers */}
              {containerStatus !== "accepted" &&
                data.permissions?.canEditContainers && (
                  <CreateContainerProfile shippingID={shippingID} />
                )}

              {/* Edit Truck Data */}
              <div className="tooltip" data-tip="Edit">
                <button
                  type="button"
                  aria-label="Edit shipment details"
                  className="btnUpdate"
                  onClick={() => setOpenModalUpdate(true)}
                >
                  <CiEdit />
                </button>
              </div>

              {/* Delete Truck Data */}
              {!data.permissions?.canDelete ? null : (
                <div className="tooltip" data-tip="Delete">
                  <button
                    className="btnDelete"
                    id="deleteButton"
                    disabled={deleteLoading || successfullyDeleted}
                    onClick={() => handleDelete()}
                  >
                    {deleteLoading ? (
                      <LoadingSpinnerButton />
                    ) : (
                      <MdDeleteSweep />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
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
              disabled
            >
              IN
            </button>

            {/* OUT */}
            <button
              type="button"
              className={`h-9 w-14 shrink-0 rounded border-2 text-sm font-semibold ${
                truckStatus === "OUT"
                  ? "pointer-events-none border-red-600 bg-red-600 text-white"
                  : "cursor-pointer border-red-600 text-slate-700 hover:bg-red-50"
              }`}
              onClick={() => setDepartureOpen(true)}
              disabled={!canEdit || truckStatus === "OUT" || isLoading}
            >
              OUT
            </button>
          </div>
        </div>
      </div>

      {data.permissions?.canCorrectStatus && <button className="btn btn-outline my-3 min-h-11" onClick={() => setStatusCorrectionOpen(true)}>Correct status or dates</button>}
      {data.permissions?.canCorrectStatus && statusCorrectionOpen && <ModalTruckUpdate lifecycle modalTruckFormData={data.shippingData} closeModal={() => setStatusCorrectionOpen(false)} />}
      {canEdit && departureOpen && (
        <DepartureReview
          shipment={data.shippingData}
          close={() => setDepartureOpen(false)}
        />
      )}
      {data.departure && (
        <p className="my-3 text-sm">
          Last recorded departure #{data.departure.id} ·{" "}
          {new Date(data.departure.createdAt).toLocaleString()} · User #
          {data.departure.actorId}
        </p>
      )}
      {data.corrections?.length > 0 && (
        <section className="my-4 rounded-lg border border-base-content/20 p-4">
          <h2 className="text-lg font-semibold">
            Recent administrative corrections
          </h2>
          <p className="text-sm text-base-content/65">
            Latest 10 recorded corrections to shipment details, status or dates.
          </p>
          {data.corrections.map((record) => (
            <details
              key={record.id}
              className="mt-3 rounded border border-base-content/15 p-3"
            >
              <summary className="min-h-11 cursor-pointer">
                Correction #{record.id} ·{" "}
                {new Date(record.createdAt).toLocaleString()} · User #
                {record.actorId}
              </summary>
              <p className="my-2 break-words">Reason: {record.reason}</p>
              {[
                ["companyName", "Company"],
                ["driverName", "Driver"],
                ["registrationPlates", "Plates"],
                ["truckStatus", "Status"],
                ["entryDateTime", "Arrival time"],
                ["exitDateTime", "Departure time"],
              ]
                .filter(([key]) => record.before[key] !== record.after[key])
                .map(([key, label]) => (
                  <div key={key} className="my-2 break-words">
                    <p className="font-semibold">{label}</p>
                    <p>Before: {record.before[key] ?? "Not recorded"}</p>
                    <p>After: {record.after[key] ?? "Not recorded"}</p>
                  </div>
                ))}
            </details>
          ))}
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {canEdit && data.permissions?.canDelete && showDeleteConfirm && (
        <ConfirmDelete
          setShowDeleteConfirm={setShowDeleteConfirm}
          confirmDelete={confirmDelete}
        />
      )}

      {/* Update Truck Data Modal */}
      {canEdit && openModalUpdate ? (
        <ModalTruckUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalTruckFormData={data.shippingData}
        />
      ) : null}
    </>
  );
}
