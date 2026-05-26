"use client";

import { useForm } from "react-hook-form";

import useCreateFinalStorageConditionsMutation from "./../../../../../../../requests/request-final-storage/request-final-storage-conditions/use-create-final-storage-conditions-mutation";

import useFinalStorageEmployeeQuery from "./../../../../../../../requests/request-final-storage/request-final-storage-employee/use-fetch-final-storage-employee-query";

import LoadingSpinnerButton from "./../../../../../../shared/loading-spiner-button";

export default function ModalFinalStorageConditionsForm({
  isOpen,
  closeModal,
  hallData,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Create data
  const {
    mutateAsync: createFinalStorageConditionsMutation,
    isPending,
    isError,
    isSuccess,
  } = useCreateFinalStorageConditionsMutation();

  // Fetching data

  const { data: finalStorageEmployeeData } = useFinalStorageEmployeeQuery();

  // Form Submiting
  const isFormSubmit = async ({
    temperature,
    radiationLevel,
    humidity,
    pressure,
    responsibleEmployee,
  }) => {
    // Ensure values are numbers
    const formData = {
      finalStorageTemperature: parseFloat(temperature),
      finalStorageRadiationLevel: parseFloat(radiationLevel),
      finalStorageHumidity: parseInt(humidity),
      finalStoragePressure: parseInt(pressure),
      finalStorageLocationId: parseInt(hallData.id),
      finalStorageResponsibleEmployeeId: parseInt(responsibleEmployee),
    };

    try {
      await createFinalStorageConditionsMutation(formData);
      reset();
      closeModal();
    } catch (error) {
      console.error("Error creating Final-Storage Conditions:", error);
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
              {/* Temperature */}
              <div className="flex flex-col space-y-2">
                <label className="text-left text-sm">Temperature (°C)</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step="0.1"
                  placeholder="Type here ..."
                  {...register("temperature", {
                    required: "Temperature is required",
                  })}
                />
                {errors.temperature && (
                  <p className="text-sm text-red-500">
                    {errors.temperature.message}
                  </p>
                )}
              </div>

              {/* Radiation Level */}
              <div className="flex flex-col space-y-2">
                <label className="text-left text-sm">
                  Radiation Level (µSv/h)
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step="0.01" // Restrict to whole numbers
                  min="0" // Prevent negative values
                  placeholder="Type here ..."
                  {...register("radiationLevel", {
                    required: "Radiation level is required",
                  })}
                />
                {errors.radiationLevel && (
                  <p className="text-sm text-red-500">
                    {errors.radiationLevel.message}
                  </p>
                )}
              </div>

              {/* Humidity */}
              <div className="flex flex-col space-y-2">
                <label className="text-left text-sm">Humidity (%)</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Type here ..."
                  {...register("humidity", {
                    required: "Humidity is required",
                  })}
                />
                {errors.humidity && (
                  <p className="text-sm text-red-500">
                    {errors.humidity.message}
                  </p>
                )}
              </div>

              {/* Pressure */}
              <div className="flex flex-col space-y-2">
                <label className="text-left text-sm">Pressure (hPa)</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Type here ..."
                  {...register("pressure", {
                    required: "Pressure is required",
                  })}
                />
                {errors.pressure && (
                  <p className="text-sm text-red-500">
                    {errors.pressure.message}
                  </p>
                )}
              </div>

              {/* Responsible Employee */}
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label
                  className="text-left text-sm"
                  htmlFor="responsible-employee"
                >
                  Please select Responsible employee
                </label>
                <select
                  className="select select-bordered select-md px-2"
                  id="responsible-employee"
                  {...register("responsibleEmployee", {
                    required: "Please choose the responsible employee",
                  })}
                >
                  <option value="">---</option>
                  {finalStorageEmployeeData?.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} {employee.surname}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="space-x-2">
                <button className="btnSave" type="submit" disabled={isPending}>
                  {isPending ? <LoadingSpinnerButton /> : "Save"}
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
