import { useForm } from "react-hook-form";
import { useEffect } from "react";

import useUpdateLocationOriginMutation from "./../../../../../requests/request-container-profile/request-location-origin/use-update-location-origin-mutation";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

export default function ModalLocationOriginDetailsUpdate({
  modalContainerTypeData,
  closeModal,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({});

  const { mutateAsync: updateLocationOriginMutation, isPending } =
    useUpdateLocationOriginMutation();

  useEffect(() => {
    document.getElementById("modal_update_location_origin").showModal();
  }, [modalContainerTypeData]);

  const { name, address, origin, id } = modalContainerTypeData;

  const isFormSubmit = async (formData) => {
    try {
      const dataForUpdate = {
        ...formData,
        id,
      };

      await updateLocationOriginMutation(dataForUpdate);

      closeModal();
    } catch (error) {
      console.error("Error updating Location Origin:", error);
    }
  };

  return (
    <>
      <dialog id="modal_update_location_origin" className="modal">
        <div className="modal-box w-11/12 max-w-3xl">
          <h3 className="text-lg font-bold">Edit Location Origin Details</h3>

          <div className="modal-action flex flex-col">
            <form
              method="dialog"
              className="flex flex-col items-start space-y-4 pb-4"
              onSubmit={handleSubmit(isFormSubmit)}
            >
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <div className="flex flex-col space-y-2">
                  <label className="text-left text-sm">Name:</label>
                  <input
                    className="input input-md  px-2"
                    type="text"
                    placeholder="Type here"
                    defaultValue={name}
                    {...register("name", {
                      required: "Location origin name is required",
                    })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">Address:</label>
                  <input
                    className="input input-md  px-2"
                    type="text"
                    placeholder="Type here"
                    defaultValue={address}
                    {...register("address", {
                      required: "Address is required",
                    })}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>
                <div className="flex w-full sm:w-64 flex-col space-y-2">
                  <label className="text-left text-sm">Origin:</label>
                  <input
                    className="input input-md  px-2"
                    type="text"
                    placeholder="Type here"
                    defaultValue={origin}
                    {...register("origin", {
                      required: "Origin is required",
                    })}
                  />
                  {errors.origin && (
                    <p className="text-sm text-red-500">
                      {errors.origin.message}
                    </p>
                  )}
                </div>
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
