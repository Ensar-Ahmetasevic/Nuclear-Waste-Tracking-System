import { useForm } from "react-hook-form";
import { useEffect } from "react";

import useUpdateFinalStorageLocationMutation from "./../../../../../../requests/request-final-storage/request-final-storage-location/use-update-final-storage-location-mutation";

export default function ModalUpdateFinalStorageLocation({
  modalDataFinalStorageLocation,
  closeModal,
}) {
  const updateFinalStorageLocationMutation =
    useUpdateFinalStorageLocationMutation();

  useEffect(() => {
    document.getElementById("modal_update_final_storage_location").showModal();
  }, [modalDataFinalStorageLocation]);

  const { id, name, surfaceArea, containerFootprint, depth, containerType } =
    modalDataFinalStorageLocation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      surfaceArea: parseInt(surfaceArea),
      containerType: containerType,
      depth: parseInt(depth),
      containerFootprint: parseInt(containerFootprint),
    },
  });

  const isFormSubmit = async (formData) => {
    try {
      const dataForUpdate = {
        ...formData,
        id,
      };

      await updateFinalStorageLocationMutation.mutateAsync(dataForUpdate);

      closeModal();
    } catch (error) {
      console.error("Error updating Final-Storage Location:", error);
    }
  };

  const handleCancel = () => {
    closeModal();
    reset();
  };

  return (
    <>
      <dialog id="modal_update_final_storage_location" className="modal">
        <div className="modal-box w-11/12 max-w-3xl">
          <h3 className="text-lg font-bold">Edit Container Details</h3>

          <div className="modal-action flex flex-col">
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
                    defaultValue={name}
                    {...register("name", {
                      required: "Final-Storage Location name is required",
                    })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
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
                    step="1"
                    min="1"
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

                {/* Container Footprint */}
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">
                    {"Container Footprint (m²)"}:
                  </label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Type here ..."
                    {...register("containerFootprint", {
                      required: "Please enter a valid positive number",
                    })}
                  />
                  {errors.containerFootprint && (
                    <p className="text-sm text-red-500">
                      {errors.containerFootprint.message}
                    </p>
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
                      {errors.containerType.message}
                    </p>
                  )}
                </div>

                {/* depth */}
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">{"Depth (m)"}:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Type here ..."
                    {...register("depth", {
                      required: "Please enter a valid positive number",
                    })}
                  />
                  {errors.depth && (
                    <p className="text-sm text-red-500">
                      {errors.depth.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-x-2">
                <button className="btnSave" type="submit">
                  Save
                </button>
                <button className="btnCancel" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
