import { useForm } from "react-hook-form";

import useCreateFinalStorageLocationMutation from "./../../../../../../requests/request-final-storage/request-final-storage-location/use-create-final-storage-location-mutation";

export default function FormFinalStorageLocation({ OnCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const createFinalStorageLocationMutation =
    useCreateFinalStorageLocationMutation();

  function isFormSubmit({
    name,
    surfaceArea,
    containerFootprint,
    depth,
    containerType,
  }) {
    // Trim the values before sending them
    const trimmedName = name.trim();
    const trimmedContainerType = containerType.trim();
    const surfaceAreaNumber = parseInt(surfaceArea);
    const containerFootprintNumber = parseInt(containerFootprint);
    const depthNumber = parseInt(depth);

    // Create the formData object with trimmed values
    const formData = {
      name: trimmedName,
      surfaceArea: surfaceAreaNumber,
      containerType: trimmedContainerType,
      containerFootprint: containerFootprintNumber,
      depth: depthNumber,
    };
    createFinalStorageLocationMutation.mutateAsync({ formData });

    OnCancel(null);
    reset();
  }

  return (
    <>
      <div className="mt-10 flex flex-col items-center space-y-12 rounded-md border-2 border-red-500 bg-gray-900 p-4 sm:p-5 sm:px-12">
        <h1 className="text-xl font-bold">Add new "Final-Storage Location"</h1>

        <form
          className="flex flex-col items-end space-y-8 pb-4"
          onSubmit={handleSubmit(isFormSubmit)}
        >
          <div className="flex flex-col space-y-6">
            {/* Name */}
            <div className="flex flex-col space-y-2">
              <label className="text-left text-sm">Name:</label>
              <input
                className="input input-md input-bordered px-2"
                type="text"
                placeholder="Type here ..."
                {...register("name", {
                  required: "Final-Storage Location name is required",
                })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Surface Area  */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">
                {"Surface Area (m²)"}:
              </label>
              <input
                className="input input-md input-bordered px-2"
                type="number"
                step="1" // Restrict to whole numbers
                min="1" // Prevent 0 or negative values
                placeholder="Type here ..."
                {...register("surfaceArea", {
                  required: "Please enter a valid positive number",
                })}
              />

              {errors.surfaceArea && (
                <p className="text-sm text-red-500">
                  {errors.surfaceArea.message}
                </p>
              )}
            </div>

            {/* Depth  */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">{"Depth (m)"}:</label>
              <input
                className="input input-md input-bordered px-2"
                type="number"
                step="1" // Restrict to whole numbers
                min="1" // Prevent 0 or negative values
                placeholder="Type here ..."
                {...register("depth", {
                  required: "Please enter a valid positive number",
                })}
              />

              {errors.depth && (
                <p className="text-sm text-red-500">{errors.depth.message}</p>
              )}
            </div>

            {/* Container Type */}
            <div className="flex flex-col space-y-2">
              <label className="text-left text-sm">Container Type:</label>
              <input
                className="input input-md input-bordered px-2"
                type="text"
                placeholder="Type here ..."
                {...register("containerType", {
                  required: "Container type is required",
                })}
              />
              {errors.containerType && (
                <p className="text-sm text-red-500">
                  {" "}
                  {errors.containerType.message}{" "}
                </p>
              )}
            </div>

            {/* Container Footprint  */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">
                {"Container Footprint (m²)"}:
              </label>
              <input
                className="input input-md input-bordered px-2"
                type="number"
                step="1" // Restrict to whole numbers
                min="1" // Prevent 0 or negative values
                placeholder="Type here ..."
                {...register("containerFootprint", {
                  required: "Please enter a valid positive number",
                })}
              />

              {errors.surfaceArea && (
                <p className="text-sm text-red-500">
                  {errors.surfaceArea.message}
                </p>
              )}
            </div>
          </div>

          <div className=" space-x-2">
            <button className="btnSave" type="submit">
              Save
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
