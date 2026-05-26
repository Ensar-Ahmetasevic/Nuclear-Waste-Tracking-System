import { useForm } from "react-hook-form";

import useWasteProfileQuery from "../../../../../requests/request-container-profile/request-waste-profile/use-fetch-waste-profile-query";
import useLocationOriginQuery from "../../../../../requests/request-container-profile/request-location-origin/use-fetch-location-origin-query";
import useUpdateContainerProfileMutation from "./../../../../../requests/request-container-profile/use-update-container-profile-mutation";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

export default function ModalContainerProfilUpdate({
  modalContainerProfilData,
  closeModal,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const { quantity, locationOrigin, wasteProfile, id } =
    modalContainerProfilData;

  const { data: locationOriginData } = useLocationOriginQuery();

  const { data: wasteProfileData } = useWasteProfileQuery();

  const {
    mutateAsync: updateMutateAsync,
    isSuccess: successfullyUpdated,
    isPending: updateLoading,
    isError: updateError,
  } = useUpdateContainerProfileMutation();

  const isFormSubmit = async (formData) => {
    try {
      const preparedData = {
        ...formData,
        id,
      };

      await updateMutateAsync(preparedData);

      closeModal();
    } catch (error) {
      console.error("Error updating Container Profile:", error);
    }
  };

  return (
    <>
      <input
        type="checkbox"
        id="update_modal_container_profile"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-3xl">
          <form
            className="flex flex-col items-start space-y-4"
            onSubmit={handleSubmit(isFormSubmit)}
          >
            <div className="flex flex-col space-y-2">
              {/* Quantity */}
              <label className="text-left text-sm">Quantity:</label>
              <input
                className="input input-md input-bordered px-2"
                type="number"
                step="1"
                min="1"
                placeholder="Type here"
                defaultValue={quantity}
                {...register("quantity", {
                  required: "Quantity is required",
                  min: { value: 1, message: "Quantity must be greater than 0" },
                })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Location origin */}

            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm" htmlFor="location-origin">
                Please select location origin
              </label>
              <select
                className="select select-bordered select-md px-2"
                id="location-origin"
                defaultValue={locationOrigin?.id}
                {...register("locationOrigin", {
                  required: "Location origin is required",
                })}
              >
                <option
                  value={locationOrigin?.id}
                  defaultValue={locationOrigin?.id}
                >
                  {locationOrigin?.name}
                </option>

                {locationOriginData?.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                  </option>
                ))}
              </select>
              {errors.locationOrigin && (
                <p className="text-sm text-red-500">
                  {errors.locationOrigin.message}
                </p>
              )}
            </div>

            {/* Waste profile */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm" htmlFor="waste-profile">
                Please select waste profile
              </label>
              <select
                className="select select-bordered select-md px-2"
                id="waste-profile"
                defaultValue={wasteProfile?.id}
                {...register("wasteProfile", {
                  required: "Waste profile is required",
                })}
              >
                <option
                  value={wasteProfile?.id}
                  defaultValue={wasteProfile?.id}
                >
                  {wasteProfile?.name}
                </option>

                {wasteProfileData?.map((waste) => (
                  <option key={waste.id} value={waste.id}>
                    {waste.name}
                  </option>
                ))}
              </select>
              {errors.wasteProfile && (
                <p className="text-sm text-red-500">
                  {errors.wasteProfile.message}
                </p>
              )}
            </div>

            <div className=" space-x-2">
              <button
                className="btnUpdate"
                type="submit"
                disabled={updateLoading}
              >
                {updateLoading ? <LoadingSpinnerButton /> : "Update"}
              </button>
            </div>
          </form>

          <div className="modal-action">
            <label
              htmlFor="update_modal"
              className="btnCancel"
              onClick={closeModal}
            >
              Cancel
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
