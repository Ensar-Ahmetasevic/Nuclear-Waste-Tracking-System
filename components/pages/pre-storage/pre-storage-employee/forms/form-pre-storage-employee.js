import { useForm } from "react-hook-form";

import dayjs from "dayjs";

import useCreatePreStorageEmployeeMutation from "../../../../../requests/request-pre-storage/request-pre-storage-employee/use-create-pre-storage-employee-mutation";

export default function FormPreStorageEmployee({ OnCancel }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const createPreStorageEmployeeMutation =
    useCreatePreStorageEmployeeMutation();

  function isFormSubmit({
    name,
    surname,
    dateOfBirth,
    address,
    qualifications,
    safetyTraining,
  }) {
    // Trim the values before sending them
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    const trimmedAddress = address.trim();
    const trimmedQualifications = qualifications.trim();
    const formattedDateOfBirth = dayjs(dateOfBirth).toDate();
    const formattedSafetyTraining = safetyTraining === "true" ? true : false;

    // Create the formData object with trimmed values
    const formData = {
      name: trimmedName,
      surname: trimmedSurname,
      address: trimmedAddress,
      dateOfBirth: formattedDateOfBirth,
      qualifications: trimmedQualifications,
      safetyTraining: formattedSafetyTraining,
    };
    createPreStorageEmployeeMutation.mutateAsync({ formData });

    OnCancel(null);
    reset();
  }

  return (
    <>
      <div className="mt-10 flex flex-col items-center space-y-12 rounded-md border-2 border-red-500 bg-gray-900 p-4 sm:p-5 sm:px-12">
        <h1 className="text-xl font-bold">Add new "Pre-Storage Employee"</h1>

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
                  required: "Pre storage employee name is required",
                })}
              />

              {errors.name && (
                <p className="text-sm text-red-500"> {errors.name.message} </p>
              )}
            </div>

            {/* Surname  */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Surname:</label>
              <input
                className="input input-md input-bordered px-2"
                type="text"
                placeholder="Type here ..."
                {...register("surname", {
                  required: "Pre storage employee surname is required",
                })}
              />
              {errors.surname && (
                <p className="text-sm text-red-500">{errors.surname.message}</p>
              )}
            </div>
            {/* Adress */}
            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Address:</label>
              <input
                className="input input-md input-bordered px-2"
                type="text"
                placeholder="Type here ..."
                {...register("address", {
                  required: "Address is required",
                })}
              />

              {errors.address && (
                <p className="text-sm text-red-500">
                  {" "}
                  {errors.address.message}{" "}
                </p>
              )}
            </div>

            {/* Qualifications */}

            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Qualifications:</label>
              <input
                className="input input-md input-bordered px-2"
                type="text"
                placeholder="Type here ..."
                {...register("qualifications", {
                  required: "Qualifications is required",
                })}
              />
              {errors.qualifications && (
                <p className="text-sm text-red-500">
                  {" "}
                  {errors.qualifications.message}{" "}
                </p>
              )}
            </div>

            {/* Date Of Birth */}
            <div className="flex flex-col space-y-2">
              <label className="text-left text-sm">Date Of Birth:</label>
              <input
                className="input input-md input-bordered px-2"
                type="date"
                placeholder="Select date"
                {...register("dateOfBirth", {
                  required: "Date of birth is required",
                })}
              />

              {errors.dateOfBirth && (
                <p className="text-sm text-red-500">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>

            {/* Safety Training */}

            <div className="flex w-full sm:w-64 flex-col space-y-2">
              <label className="text-left text-sm">Safety Training:</label>

              <div className="form-control items-start">
                <label className="label cursor-pointer space-x-6">
                  <span className="label-text">Yes</span>
                  <input
                    type="radio"
                    name="safetyTraining"
                    className="radio checked:bg-blue-500"
                    defaultChecked
                    value={true}
                    {...register("safetyTraining")}
                  />
                </label>
              </div>
              <div className="form-control items-start">
                <label className="label cursor-pointer space-x-6">
                  <span className="label-text">No</span>
                  <input
                    type="radio"
                    name="safetyTraining"
                    className="radio checked:bg-red-500"
                    value={false}
                    {...register("safetyTraining")}
                  />
                </label>
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
