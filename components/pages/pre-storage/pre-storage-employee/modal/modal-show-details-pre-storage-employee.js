import dayjs from "dayjs";

export default function ModalShowDetailsPreStorageEmployee({
  modalContenData,
  closeModal,
}) {
  const formatDateOfBirth = dayjs(modalContenData.dateOfBirth).format(
    "DD/MM/YYYY",
  );

  return (
    <>
      <input
        type="checkbox"
        id="modal_details_pre_storage_employee"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box ">
          <div className="mb-6 flex flex-row space-x-4">
            <h3 className="text-lg font-bold">Details for:</h3>
            <p className="text-lg">{modalContenData.name} </p>
          </div>

          <div>
            {modalContenData ? (
              <ul className="space-y-2">
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Name:</p>
                  <p>{modalContenData.name}</p>
                </li>
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Surname:</p>
                  <p>{modalContenData.surname}</p>
                </li>
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Date of birth:</p>
                  <p>{formatDateOfBirth}</p>
                </li>
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Address:</p>
                  <p>{modalContenData.address}</p>
                </li>
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Qualifications:</p>
                  <p>{modalContenData.qualifications}</p>
                </li>
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Safety Training:</p>
                  <p>
                    {modalContenData.safetyTraining === true ? "Yes" : "No"}
                  </p>
                </li>
              </ul>
            ) : (
              <p>No details available</p>
            )}
          </div>

          <div className="modal-action">
            <label
              htmlFor="modal_details_pre_storage_employee"
              className="btnCancel"
              onClick={closeModal}
            >
              Close
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
