import { useForm } from "react-hook-form";

import useCreateContainerTypeMutation from "../../../../../requests/request-container-profile/request-container-type/use-create-container-type-mutation";

function FormContainerType({ OnCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const createContainerTypeMutation = useCreateContainerTypeMutation();

  function isFormSubmit({
    name,
    material,
    volume,
    carryingCapacity,
    radioactivityLevel,
    physicalProperties,
    footprint,
    description,
  }) {
    // Trim the values before sending them
    const trimmedName = name.trim();
    const trimmedMaterial = material.trim();
    const trimmedRadioactivityLevel = radioactivityLevel.trim();
    const trimmedPhysicalProperties = physicalProperties.trim();
    const trimmeddescription = description.trim();

    // Create the formData object with trimmed values
    const formData = {
      name: trimmedName,
      material: trimmedMaterial,
      radioactivityLevel: trimmedRadioactivityLevel,
      physicalProperties: trimmedPhysicalProperties,
      description: trimmeddescription,
      volume,
      carryingCapacity,
      footprint,
    };
    createContainerTypeMutation.mutateAsync({ formData });

    OnCancel(null);
    reset();
  }

  return (
    <>
      <div className="mt-10 flex flex-col items-center space-y-12 rounded-md border-2 border-red-500 bg-gray-900 p-5">
        <h1 className="text-xl font-bold">Add new "Container Type"</h1>
        <form
          className="flex flex-col items-center space-y-8 px-4 pb-4 sm:items-end sm:px-12"
          onSubmit={handleSubmit(isFormSubmit)}
        >
          <div className="flex flex-col gap-8 md:flex-row md:gap-0 md:space-x-20">
            {/* Name, Material, Volume, Carrying capacity */}
            <div className="flex flex-col space-y-6">
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Name:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("name", {
                    required: "Container type name is required",
                  })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Material:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
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
                  min={"1"}
                  placeholder="Type here ..."
                  {...register("volume", {
                    required: "Volume is required",
                    min: { value: 1, message: "Volume must be greater than 0" },
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
                  {" "}
                  {"Carrying capacity (tons) :"}
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step=".1"
                  min={"1"}
                  placeholder="Type here ..."
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
            </div>

            {/* Radioactivity Level, Physical properties, Footprint,  Description */}
            <div className="flex flex-col space-y-6">
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">
                  Radioactivity Level:
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
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
                  placeholder="Type here ..."
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
                  {" "}
                  {"Footprint (m²) :"}
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="number"
                  step=".1"
                  min={"1"}
                  placeholder="Type here ..."
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

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Description:</label>
                <textarea
                  className="textarea textarea-bordered"
                  rows={4}
                  cols={50}
                  type="text"
                  placeholder="Type here ..."
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

export default FormContainerType;
