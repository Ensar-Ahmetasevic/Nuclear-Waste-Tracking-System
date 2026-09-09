"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";

import useCreatePreStorageCapacityMutation from "./../../../../../../requests/request-pre-storage/use-create-pre-storage-capacity-mutation";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";
import useUpdateShippingStatusMutation from "../../../../../../requests/request-shipping-information/use-update-shipping-status-mutation";
import useUpdateContainerProfileStatusMutation from "./../../../../../../requests/request-container-profile/use-update-container-profile-status-mutation";

import LoadingSpinnerButton from "../../../../../shared/loading-spiner-button";
import LoadingSpinnerPage from "../../../../../shared/loading-spiner-page";
import AlertWarning from "../../../../../shared/alert-warning";

export default function ModalPreStorageCapacityForm({
  isOpen,
  closeModal,
  hallData,
  entryData,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { quantity: entryData.totalQuantity } });

  // Reset the form every time the `entryData` changes or the modal becomes visible
  useEffect(() => {
    if (isOpen) {
      reset({ quantity: entryData.totalQuantity });
    }
  }, [entryData, isOpen, reset]);

  // Update Container status
  const {
    mutateAsync: updateContainerProfileStatusMutation,
    isPending: updateContainerProfileStatusPending,
    isSuccess: updateContainerProfileStatusSuccess,
  } = useUpdateContainerProfileStatusMutation();

  // Update Entry staus
  const {
    mutateAsync: updateShippingStatusMutations,
    isPending: UpdateShippingStatusPending,
    isSuccess: UpdateShippingStatusSuccess,
  } = useUpdateShippingStatusMutation();

  // Create data
  const {
    mutateAsync: createPreStorageCapacityMutation,
    isPending: PreStorageCapacityPending,
    isSuccess: PreStorageCapacitySuccess,
  } = useCreatePreStorageCapacityMutation();

  // Fetching Pre Storage Employee data
  const {
    data: preStorageEmployeeData,
    isLoading,
    isError,
  } = usePreStorageEmployeeQuery();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  }

  if (isError || !preStorageEmployeeData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <AlertWarning text={"Error loading Pre Storage Employee request"} />
      </div>
    );
  }

  const isFormSubmit = async ({ quantity, responsibleEmployee }) => {
    // Ensure values are numbers
    const formData = {
      quantity: parseInt(quantity),
      preStorageLocationId: parseInt(hallData.id),
      responsiblePreStorageEmployeeId: parseInt(responsibleEmployee),
    };

    const containerStatusUpdateData = {
      containerStatus: "accepted",
      containerProfileId: entryData.containerProfileIds[0],
    };

    try {
      // Step 1: Create the PreStorage capacity entry
      await createPreStorageCapacityMutation(formData);

      // Step 2: Update the Shipping Information status after successful capacity creation
      await updateContainerProfileStatusMutation(containerStatusUpdateData);

      // Step 3: Check the statuses of all containers
      const allContainersAccepted = entryData.containerStatus.every(
        (status) => status === "accepted",
      );

      // If all containers are accepted, update the truck status
      if (allContainersAccepted) {
        await updateShippingStatusMutations({
          status: "accepted",
          id: entryData.id,
        });
      }

      // Step 4: // Resetting the form after successful submission and close modal
      reset();
      closeModal();
    } catch (error) {
      console.error("Error handling the form submission:", error);
    }
  };

  return (
    <>
      {isOpen ? (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            {/* Form */}
            <form
              className="flex flex-col items-start space-y-4"
              onSubmit={handleSubmit(isFormSubmit)}
            >
              <div className="flex flex-col space-y-2">
                {/* Quantity */}
                <label className="text-left text-sm">Quantity:</label>
                <input
                  className="input input-md  px-2"
                  type="number"
                  step="1" // Restrict to whole numbers
                  min="1" // Prevent 0 or negative values
                  placeholder="Type here ..."
                  {...register("quantity", {
                    required: "Quantity must be greater than or equal to 1",
                  })}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              {/*Responsible employee */}
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label
                  className="text-left text-sm"
                  htmlFor="responsible-employee"
                >
                  Please select Responsible employee
                </label>

                <select
                  className="select  select-md px-2"
                  id="responsible-employee"
                  {...register("responsibleEmployee", {
                    required: "Please select responsible employee",
                  })}
                >
                  <option value="">---</option>

                  {preStorageEmployeeData.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} {employee.surname}
                    </option>
                  ))}
                </select>
                {errors.responsibleEmployee && (
                  <p className="text-sm text-red-500">
                    {errors.responsibleEmployee.message}
                  </p>
                )}
              </div>
              <div className=" space-x-2">
                <button
                  className="btnSave"
                  type="submit"
                  disabled={UpdateShippingStatusPending}
                >
                  {UpdateShippingStatusPending ? (
                    <LoadingSpinnerButton />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>

            <div className="modal-action">
              <button
                className="btnCancel"
                onClick={() => {
                  closeModal(), reset();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
