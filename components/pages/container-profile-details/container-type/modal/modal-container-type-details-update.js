import { useForm } from "react-hook-form";
import { useEffect } from "react";

import useUpdateContainerTypeMutation from "./../../../../../requests/request-container-profile/request-container-type/use-update-container-type-mutation";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

export default function ModalContainerTypeDetailsUpdate({
  modalContainerTypeData,
  closeModal,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({});

  const { mutateAsync: updateContainerTypeMutation, isPending } =
    useUpdateContainerTypeMutation();

  useEffect(() => {
    document.getElementById("modal_update_container_type").showModal();
  }, [modalContainerTypeData]);

  const {
    name,
    material,
    volume,
    carryingCapacity,
    radioactivityLevel,
    physicalProperties,
    footprint,
    description,
    id,
  } = modalContainerTypeData;

  const isFormSubmit = async (formData) => {
    try {
      const preparedData = {
        ...formData,
        id,
      };

      await updateContainerTypeMutation(preparedData);

      closeModal();
    } catch (error) {
      console.error("Error updating Container Profile:", error);
    }
  };

  return (
    <>
      <dialog id="modal_update_container_type" className="modal">
        <div className="modal-box w-11/12 max-w-3xl">
          <h3 className="text-lg font-bold">Edit Container Type Details</h3>

          <div className="modal-action flex flex-col">
            <form
              method="dialog"
              className="flex flex-col items-start space-y-4 pb-4"
              onSubmit={handleSubmit(isFormSubmit)}
            >
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">Name:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    defaultValue={name}
                    placeholder="Type here"
                    {...register("name", {
                      required: "Container type name is required",
                    })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">Material:</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    defaultValue={material}
                    placeholder="Type here"
                    {...register("material", {
                      required: "Material is required",
                    })}
                  />
                  {errors.material && (
                    <p className="text-sm text-red-500">
                      {errors.material.message}
                    </p>
                  )}
                </div>
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">{"Volume (m³) :"}</label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="number"
                    step=".1"
                    min="1"
                    defaultValue={volume}
                    placeholder="Type here"
                    {...register("volume", {
                      required: "Volume is required",
                      min: {
                        value: 1,
                        message: "Volume must be greater than 0",
                      },
                    })}
                  />
                  {errors.volume && (
                    <p className="text-sm text-red-500">
                      {errors.volume.message}
                    </p>
                  )}
                </div>

                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">
                    {"Carrying capacity (tons) :"}
                  </label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="number"
                    step=".1"
                    min="1"
                    defaultValue={carryingCapacity}
                    placeholder="Type here"
                    {...register("carryingCapacity", {
                      required: "Carrying capacity is required",
                      min: {
                        value: 1,
                        message: "Carrying capacity must be greater than 0",
                      },
                    })}
                  />
                  {errors.carryingCapacity && (
                    <p className="text-sm text-red-500">
                      {errors.carryingCapacity.message}
                    </p>
                  )}
                </div>

                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">
                    Radioactivity Level:
                  </label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    defaultValue={radioactivityLevel}
                    placeholder="Type here"
                    {...register("radioactivityLevel", {
                      required: "Radioactivity level is required",
                    })}
                  />
                  {errors.radioactivityLevel && (
                    <p className="text-sm text-red-500">
                      {errors.radioactivityLevel.message}
                    </p>
                  )}
                </div>

                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">
                    Physical properties:
                  </label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="text"
                    defaultValue={physicalProperties}
                    placeholder="Type here"
                    {...register("physicalProperties", {
                      required: "Physical properties are required",
                    })}
                  />
                  {errors.physicalProperties && (
                    <p className="text-sm text-red-500">
                      {errors.physicalProperties.message}
                    </p>
                  )}
                </div>

                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">
                    {"Footprint (m²) :"}
                  </label>
                  <input
                    className="input input-md input-bordered px-2"
                    type="number"
                    step=".1"
                    min="1"
                    defaultValue={footprint}
                    placeholder="Type here"
                    {...register("footprint", {
                      required: "Footprint is required",
                      min: {
                        value: 1,
                        message: "Footprint must be greater than 0",
                      },
                    })}
                  />
                  {errors.footprint && (
                    <p className="text-sm text-red-500">
                      {errors.footprint.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col space-y-2">
                <label className="text-left text-sm">Description:</label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={8}
                  cols={50}
                  type="text"
                  defaultValue={description}
                  placeholder="Type here"
                  {...register("description", {
                    required: "Description is required",
                  })}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-x-2">
                <button className="btnSave" type="submit" disabled={isPending}>
                  {isPending ? <LoadingSpinnerButton /> : "Save"}
                </button>
              </div>
            </form>

            <div className="modal-action">
              <form method="dialog">
                <button className="btnCancel" onClick={closeModal}>
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
