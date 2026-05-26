import { useForm } from "react-hook-form";
import useCreateWasteProfileMutation from "../../../../../requests/request-container-profile/request-waste-profile/use-create-waste-profile-mutation";
import LoadingSpinnerPage from "./../../../../shared/loading-spiner-page";
import useContainerTypeQuery from "../../../../../requests/request-container-profile/request-container-type/use-fetch-container-type-query";
import AlertWarning from "./../../../../shared/alert-warning";
import LoadingSpinnerButton from "./../../../../shared/loading-spiner-button";

function FormWasteProfile({ OnCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { mutateAsync: createWasteProfileMutation, isPending } =
    useCreateWasteProfileMutation();

  const {
    data: containerTypeData,
    isLoading: isContainerTypeLoading,
    isError: isContainerTypeError,
  } = useContainerTypeQuery();

  if (isContainerTypeLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinnerPage />
      </div>
    );
  }

  if (!containerTypeData || isContainerTypeError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <AlertWarning text={"Error loading data"} />
      </div>
    );
  }

  const isFormSubmit = async ({
    name,
    typeOfWaste,
    wasteDescription,
    risksAndHazards,
    processingMethods,
    physicalProperties,
    chemicalProperties,
    biologicalProperties,
    collectionProcedures,
    recommendationsForTransport,
  }) => {
    // Trim the values before sending them
    const trimmedName = name.trim();
    const trimmedTypeOfWaste = typeOfWaste.trim();
    const trimmedWasteDescription = wasteDescription.trim();
    const trimmedRisksAndHazards = risksAndHazards.trim();
    const trimmedProcessingMethods = processingMethods.trim();
    const trimmedPhysicalProperties = physicalProperties.trim();
    const trimmedChemicalProperties = chemicalProperties.trim();
    const trimmedBiologicalProperties = biologicalProperties.trim();
    const trimmedCollectionProcedures = collectionProcedures.trim();
    const numberRecommendationsForTransport = parseInt(
      recommendationsForTransport,
    );

    // Create the formData object with trimmed values
    const formData = {
      name: trimmedName,
      typeOfWaste: trimmedTypeOfWaste,
      wasteDescription: trimmedWasteDescription,
      risksAndHazards: trimmedRisksAndHazards,
      processingMethods: trimmedProcessingMethods,
      physicalProperties: trimmedPhysicalProperties,
      chemicalProperties: trimmedChemicalProperties,
      biologicalProperties: trimmedBiologicalProperties,
      collectionProcedures: trimmedCollectionProcedures,
      recommendationsForTransport: numberRecommendationsForTransport,
    };

    await createWasteProfileMutation({ formData });

    OnCancel(null);
    reset();
  };

  return (
    <>
      <div className="mt-10 flex flex-col items-center space-y-12 rounded-md border-2 border-red-500 bg-gray-900 p-5">
        <h1 className="text-xl font-bold">Add new "Waste profile"</h1>
        <form
          className="flex flex-col items-center space-y-8 px-4 pb-4 sm:items-end sm:px-12"
          onSubmit={handleSubmit(isFormSubmit)}
        >
          <div className="flex flex-col gap-8 md:flex-row md:gap-0 md:space-x-20">
            {/* Name  */}
            <div className="flex flex-col space-y-6">
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Name:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("name", {
                    required: "Waste profile name is required",
                  })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* waste type  */}

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Type Of Waste:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("typeOfWaste", {
                    required: "Type of waste is required",
                  })}
                />
                {errors.typeOfWaste && (
                  <p className="text-sm text-red-500">
                    {errors.typeOfWaste.message}
                  </p>
                )}
              </div>

              {/* waste description */}

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Waste Description:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("wasteDescription", {
                    required: "Waste description is required",
                  })}
                />
                {errors.wasteDescription && (
                  <p className="text-sm text-red-500">
                    {errors.wasteDescription.message}
                  </p>
                )}
              </div>

              {/* Risks and hazards*/}

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Risks And Hazards:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("risksAndHazards", {
                    required: "Risks and hazards are required",
                  })}
                />
                {errors.risksAndHazards && (
                  <p className="text-sm text-red-500">
                    {errors.risksAndHazards.message}
                  </p>
                )}
              </div>

              {/* Processing methods */}

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">Processing Methods:</label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("processingMethods", {
                    required: "Processing methods are required",
                  })}
                />
                {errors.processingMethods && (
                  <p className="text-sm text-red-500">
                    {errors.processingMethods.message}
                  </p>
                )}
              </div>
            </div>

            {/* physical properties  */}
            <div className="flex flex-col space-y-6">
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">
                  Physical Properties:
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
                  Chemical Properties:
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("chemicalProperties", {
                    required: "Chemical properties are required",
                  })}
                />
                {errors.chemicalProperties && (
                  <p className="text-sm text-red-500">
                    {errors.chemicalProperties.message}
                  </p>
                )}
              </div>

              {/* Biological Properties */}
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">
                  Biological Properties:
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("biologicalProperties", {
                    required: "Biological properties are required",
                  })}
                />
                {errors.biologicalProperties && (
                  <p className="text-sm text-red-500">
                    {errors.biologicalProperties.message}
                  </p>
                )}
              </div>

              {/* collection procedures  */}
              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm">
                  Collection Procedures:
                </label>
                <input
                  className="input input-md input-bordered px-2"
                  type="text"
                  placeholder="Type here ..."
                  {...register("collectionProcedures", {
                    required: "Collection procedures are required",
                  })}
                />
                {errors.collectionProcedures && (
                  <p className="text-sm text-red-500">
                    {errors.collectionProcedures.message}
                  </p>
                )}
              </div>

              {/* transport recommendations */}

              <div className="flex w-full sm:w-64 flex-col space-y-2">
                <label className="text-left text-sm" htmlFor="location-origin">
                  Recommendations For Transport:
                </label>

                <select
                  className="select select-bordered select-md px-2"
                  id="location-origin"
                  {...register("recommendationsForTransport", {
                    required: "Transport recommendations are required",
                  })}
                >
                  <option value="">---</option>

                  {containerTypeData.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.recommendationsForTransport && (
                  <p className="text-sm text-red-500">
                    {errors.recommendationsForTransport.message}
                  </p>
                )}
              </div>
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

export default FormWasteProfile;
