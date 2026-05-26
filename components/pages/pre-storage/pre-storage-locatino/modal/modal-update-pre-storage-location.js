import { useForm } from "react-hook-form";
import { useEffect } from "react";

import useUpdatePreStorageLocationMutation from "../../../../../requests/request-pre-storage/request-pre-storage-location/use-update-pre-storage-location-mutation";

export default function ModalUpdatePreStorageLocation({
  modalDataPreStorageLocation,
  closeModal,
}) {
  const updatePreStorageLocationMutation =
    useUpdatePreStorageLocationMutation();

  useEffect(() => {
    document.getElementById("modal_update_pre_storage_location").showModal();
  }, [modalDataPreStorageLocation]);

  const {
    name,
    surfaceArea,
    containerFootprint,
    preStorageFor,
    containerType,
    wasteProfile,
    id,
  } = modalDataPreStorageLocation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      surfaceArea: surfaceArea,
      containerType: containerType,
      wasteProfile: wasteProfile,
      containerFootprint: parseInt(containerFootprint),
    },
  });

  const isFormSubmit = async (formData) => {
    try {
      const dataForUpdate = {
        ...formData,
        id,
      };

      await updatePreStorageLocationMutation.mutateAsync(dataForUpdate);

      closeModal();
    } catch (error) {
      console.error("Error updating Pre-Storage Location:", error);
    }
  };

  const handleCancel = () => {
    closeModal();
    reset();
  };

  return (
    <>
      <dialog id="modal_update_pre_storage_location" className="modal">
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
                      required: "Pre-Storage Location name is required",
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

                {/* Waste Profile */}
                <div className="flex flex-col space-y-2">
                  <label className="text-left text-sm">Waste Profile:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    placeholder="Type here ..."
                    {...register("wasteProfile", {
                      required: "Waste profile is required",
                    })}
                  />
                  {errors.wasteProfile && (
                    <p className="text-sm text-red-500">
                      {errors.wasteProfile.message}
                    </p>
                  )}
                </div>

                {/* Pre-Storage For */}
                <div className="flex flex-col space-y-2">
                  <label className="text-left text-sm">Pre-Storage For:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    placeholder="Type here ..."
                    defaultValue={preStorageFor}
                    {...register("preStorageFor", {
                      required: "Pre-storage for is required",
                    })}
                  />
                  {errors.preStorageFor && (
                    <p className="text-sm text-red-500">
                      {errors.preStorageFor.message}
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

  return (
    <>
      <dialog id="modal_update_pre_storage_location" className="modal">
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
                      required: true,
                    })}
                  />
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
                      required: true,
                      min: {
                        value: 1,
                        message: "Please enter a valid positive number",
                      },
                    })}
                  />
                  {errors.surfaceArea && (
                    <p className="text-sm text-red-500">
                      {errors.surfaceArea.message}
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
                      required: true,
                      min: {
                        value: 1,
                        message: "Please enter a valid positive number",
                      },
                    })}
                  />

                  {errors.surfaceArea && (
                    <p className="text-sm text-red-500">
                      {errors.surfaceArea.message}
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
                      required: true,
                    })}
                  />
                </div>

                {/*   Waste Profile
                 */}
                <div className="flex flex-col space-y-2">
                  <label className="text-left text-sm">Waste Profile:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    placeholder="Type here ..."
                    {...register("wasteProfile", {
                      required: true,
                    })}
                  />
                </div>

                {/* Pre-Storage For */}

                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">Pre-Storage For:</label>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={4}
                    cols={50}
                    type="text"
                    placeholder="Radioactive waste from nuclear facilities ..."
                    defaultValue={preStorageFor}
                    {...register("preStorageFor", {
                      required: true,
                    })}
                  />
                </div>
              </div>

              <div className=" space-x-2">
                <button className="btnSave" type="submit">
                  Save
                </button>
              </div>
            </form>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn" onClick={closeModal}>
                  Close
                </button>
              </form>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
