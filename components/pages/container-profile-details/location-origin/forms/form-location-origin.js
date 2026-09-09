import { useForm } from "react-hook-form";
import useCreateLocationOriginMutation from "../../../../../requests/request-container-profile/request-location-origin/use-create-location-origin-mutation";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

function FormLocationOrigin({ OnCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { mutateAsync: createLocationOriginMutation, isPending } =
    useCreateLocationOriginMutation();

  const isFormSubmit = async ({ name, address, origin }) => {
    // Trim the values before sending them
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedOrigin = origin.trim();

    // Create the formData object with trimmed values
    const formData = {
      name: trimmedName,
      address: trimmedAddress,
      origin: trimmedOrigin,
    };
    await createLocationOriginMutation({ formData });

    OnCancel(null);
    reset();
  };

  return (
    <>
      <div className="mt-10 flex flex-col items-center space-y-12 rounded-md border-2 border-red-500 bg-gray-900 p-4 sm:p-5 sm:px-12">
        <h1 className="text-xl font-bold">Add new "Location origin"</h1>

        <form
          className="flex flex-col items-end space-y-8 pb-4"
          onSubmit={handleSubmit(isFormSubmit)}
        >
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2">
              <label className="text-left text-sm">Name:</label>
              <input
                className="input input-md  px-2"
                type="text"
                placeholder="Type here ..."
                {...register("name", {
                  required: "Location origin name is required",
                })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Address:</label>
              <input
                className="input input-md  px-2"
                type="text"
                placeholder="Type here ..."
                {...register("address", {
                  required: "Address is required",
                })}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Origin:</label>
              <input
                className="input input-md  px-2"
                type="text"
                placeholder="Type here ..."
                {...register("origin", {
                  required: "Origin is required",
                })}
              />
              {errors.origin && (
                <p className="text-sm text-red-500">{errors.origin.message}</p>
              )}
            </div>
          </div>

          <div className=" space-x-2">
            <button className="btnSave" type="submit" disabled={isPending}>
              {isPending ? <LoadingSpinnerButton /> : "Save"}
            </button>
            <button
              className="btnCancel"
              onClick={() => {
                OnCancel(null);
                reset();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default FormLocationOrigin;
