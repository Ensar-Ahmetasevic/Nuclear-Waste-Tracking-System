"use client";

import { useForm } from "react-hook-form";

import useCreateFinalStorageTransverRequestMutation from "../../../../../../../requests/request-final-storage/request-final-storage-transver-request/use-create-final-storage-transver-request-mutation";

import useFinalStorageEmployeeQuery from "../../../../../../../requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";

import LoadingSpinnerButton from "../../../../../../shared/loading-spiner-button";
import LoadingSpinnerPage from "../../../../../../shared/loading-spiner-page";
import AlertWarning from "../../../../../../shared/alert-warning";

export default function ModalSendRequestToPreStorageForm({
  isOpen,
  closeModal,
  roomData,
}) {
  // 1. All React hooks must be at the top
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // 2. Data fetching
  const {
    data: finalStorageEmployeeData,
    isLoading,
    isError,
  } = useFinalStorageEmployeeQuery();

  // 3. Mutation hook

  const {
    mutateAsync: createFinalStorageTransverRequestMutation,
    isPending: transferRequestPending,
    isSuccess: transferRequestSuccess,
  } = useCreateFinalStorageTransverRequestMutation();

  // 4. Event handlers
  const isFormSubmit = async ({ quantity, responsibleEmployee }) => {
    // Ensure values are numbers
    const formData = {
      requestedQuantity: parseInt(quantity),
      requestedByRoom: roomData.name,
      requestedByEmployeeId: parseInt(responsibleEmployee),
      finalStorageLocationId: roomData.id,
    };

    try {
      // Step 1: Create the FinalStorage capacity entry
      await createFinalStorageTransverRequestMutation(formData);

      // Step 2: // Resetting the form after successful submission and close modal
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

  if (isError || !finalStorageEmployeeData) {
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
            <div className="mb-8">
              <h2>Sending request from {roomData.name}</h2>
            </div>

            {/* Form */}
            <form
              className="flex flex-col items-start space-y-4"
              onSubmit={handleSubmit(isFormSubmit)}
            >
              <div className="flex flex-col space-y-2">
                {/* Quantity */}
                <label className="text-left text-sm">Quantity:</label>
                <input
                  className="input input-md  input-info px-2"
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
                  className="select  select-info select-md px-2"
                  id="responsible-employee"
                  {...register("responsibleEmployee", {
                    required: "Please select responsible employee",
                  })}
                >
                  <option value="">---</option>

                  {finalStorageEmployeeData.map((employee) => (
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
              <div className=" space-x-2">
                <button
                  className="btnSave"
                  type="submit"
                  disabled={transferRequestPending}
                >
                  {transferRequestPending ? <LoadingSpinnerButton /> : "Send"}
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
