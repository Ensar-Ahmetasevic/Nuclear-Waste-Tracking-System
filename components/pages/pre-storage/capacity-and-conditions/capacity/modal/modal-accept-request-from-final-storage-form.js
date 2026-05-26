"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import useUpdateFinalStorageTransferRequestMutation from "../../../../../../requests/request-final-storage/request-final-storage-transver-request/use-update-final-storage-transver-request-mutation";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";

import LoadingSpinnerButton from "../../../../../shared/loading-spiner-button";
import LoadingSpinnerPage from "../../../../../shared/loading-spiner-page";
import AlertWarning from "../../../../../shared/alert-warning";

export default function ModalAcceptRequestFromFinalStorageForm({
  isOpen,
  closeModal,
  requestData,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { quantity: requestData?.requestedQuantity } });

  // Reset the form every time the `entryData` changes or the modal becomes visible
  useEffect(() => {
    if (isOpen) {
      reset({ quantity: requestData?.requestedQuantity });
    }
  }, [requestData, isOpen, reset]);

  // 2. Fetching Pre Storage Employee data
  const {
    data: preStorageEmployeeData,
    isLoading,
    isError,
  } = usePreStorageEmployeeQuery();

  // 3. Update FinalStorage Transfer Request

  const {
    mutateAsync: updateFinalStorageTransferRequestMutation,
    isPending: transferRequestPending,
    isSuccess: transferRequestSuccess,
  } = useUpdateFinalStorageTransferRequestMutation();

  // 4. Event handlers
  const isFormSubmit = async ({ quantity, responsibleEmployee }) => {
    try {
      await updateFinalStorageTransferRequestMutation({
        operationType: "PRE_STORAGE_ACCEPT_REQUEST",
        data: {
          id: requestData.id,
          requestedQuantity: parseInt(quantity),
          approvedByEmployeeId: parseInt(responsibleEmployee),
        },
      });

      // Resetting the form after successful submission and close modal
      reset();
      closeModal();
    } catch (error) {
      console.error("Error handling the form submission:", error);
    }
  };

  // 3. Early returns for loading and error states
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
        <AlertWarning text={"Error loading Final Storage Employee request"} />
      </div>
    );
  }

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
                  className="input input-md input-bordered input-info px-2"
                  type="number"
                  step="1" // Restrict to whole numbers
                  min="1" // Prevent 0 or negative values
                  placeholder="Type here ..."
                  {...register("quantity", {
                    required:
                      "Requested quantity must be greater than or equal to 1",
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
                  className="select select-bordered select-info select-md px-2"
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

              {/* Submit button */}
              <div className="space-x-2">
                <button
                  className="btnSave"
                  type="submit"
                  disabled={transferRequestPending}
                >
                  {transferRequestPending ? <LoadingSpinnerButton /> : "Accept"}
                </button>
              </div>
            </form>

            <div className="modal-action">
              <button
                className="btnCancel"
                onClick={() => {
                  closeModal();
                  reset();
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
