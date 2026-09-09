"use client";

import { useForm } from "react-hook-form";

import useCreatePreStorageConditionsMutation from "../../../../../../requests/request-pre-storage/request-pre-storage-conditions/use-create-pre-storage-conditions-mutation";
import usePreStorageEmployeeQuery from "../../../../../../requests/request-pre-storage/request-pre-storage-employee/use-fetch-pre-storage-employee-query";

import LoadingSpinnerButton from "./../../../../../shared/loading-spiner-button";

export default function ModalPreStorageConditionsForm({
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
    mutateAsync: createPreStorageConditionsMutation,
    isPending,
    isError,
    isSuccess,
  } = useCreatePreStorageConditionsMutation();

  // Fetching data

  const { data: preStorageEmployeeData } = usePreStorageEmployeeQuery();

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
      preStorageTemperature: parseFloat(temperature),
      preStorageRadiationLevel: parseFloat(radiationLevel),
      preStorageHumidity: parseInt(humidity),
      preStoragePressure: parseInt(pressure),
      preStorageLocationId: parseInt(hallData.id),
      preStorageResponsibleEmployeeId: parseInt(responsibleEmployee),
    };

    try {
      await createPreStorageConditionsMutation(formData);
      reset();
      closeModal();
    } catch (error) {
      console.error("Error creating Pre-Storage Conditions:", error);
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
                  className="input input-md  px-2"
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
                  className="input input-md  px-2"
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
                  className="input input-md  px-2"
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
                  className="input input-md  px-2"
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
                  className="select  select-md px-2"
                  id="responsible-employee"
                  {...register("responsibleEmployee", {
                    required: "Please choose the responsible employee",
                  })}
                >
                  <option value="">---</option>
                  {preStorageEmployeeData?.map((employee) => (
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
