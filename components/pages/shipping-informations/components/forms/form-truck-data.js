import { useForm } from "react-hook-form";

import useCreateShippingInformationsMutation from "../../../../../requests/request-shipping-information/use-create-shipping-informations-mutation";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

export default function FormTruckData({ onSubmitForm }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const {
    mutateAsync: createShippingInformationsMutation,
    isPending,
    isSuccess,
    isError,
  } = useCreateShippingInformationsMutation();

  const isFormSubmit = async ({
    companyName,
    driverName,
    registrationPlates,
  }) => {
    // Trim whitespace from each field
    const trimmedData = {
      companyName: companyName.trim(),
      driverName: driverName.trim(),
      registrationPlates: registrationPlates.trim(),
    };

    await createShippingInformationsMutation({
      formData: trimmedData,
    });

    reset();
    onSubmitForm(isSuccess);
  };

  return (
    <>
      <form
        className="flex flex-col space-y-8 text-center"
        onSubmit={handleSubmit(isFormSubmit)}
      >
        <div>
          <h2>Crate New Shipping Informations</h2>
        </div>

        <div className="flex flex-col items-center justify-center space-y-6 md:flex-row md:space-x-3 md:space-y-0">
          <div className="flex w-full sm:w-64 flex-col space-y-2">
            <label className="text-left text-sm">Company Name:</label>
            <input
              className="input input-md input-bordered px-2"
              type="text"
              placeholder="Type here ..."
              {...register("companyName", {
                required: "Company name is required",
              })}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="flex w-full sm:w-64 flex-col space-y-2">
            <label className="text-left text-sm">Driver Name:</label>
            <input
              className="input input-md input-bordered px-2"
              type="text"
              placeholder="Type here ..."
              {...register("driverName", {
                required: "Driver name is required",
              })}
            />
            {errors.driverName && (
              <p className="text-sm text-red-500">
                {errors.driverName.message}
              </p>
            )}
          </div>

          <div className="flex w-full sm:w-64 flex-col space-y-2">
            <label className="text-left text-sm">Registration Plates:</label>
            <input
              className="input input-md input-bordered px-2"
              type="text"
              placeholder="Type here ..."
              {...register("registrationPlates", {
                required: "Registration plates are required",
              })}
            />
            {errors.registrationPlates && (
              <p className="text-sm text-red-500">
                {errors.registrationPlates.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <button className="btnCreate" type="submit" disabled={isPending}>
            {isPending ? <LoadingSpinnerButton /> : "Next"}
          </button>
        </div>
      </form>
    </>
  );
}
