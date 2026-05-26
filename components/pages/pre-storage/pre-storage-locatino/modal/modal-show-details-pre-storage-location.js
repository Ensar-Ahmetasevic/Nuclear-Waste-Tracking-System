export default function ModalShowDetailsPreStorageLocation({
  modalContenData,
  closeModal,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_details_pre_storage_location"
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
                {/* Name */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Name:</p>
                  <p>{modalContenData.name}</p>
                </li>
                {/* Surface Area */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Surface Area:</p>
                  <p>{`${modalContenData.surfaceArea} m²`}</p>
                </li>
                {/* Container Footprint */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold"> Container Footprint:</p>
                  <p>{`${modalContenData.containerFootprint} m²`}</p>
                </li>
                {/* Container Type */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Container Type:</p>
                  <p>{modalContenData.containerType}</p>
                </li>
                {/* Waste profile */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Waste profile:</p>
                  <p>{modalContenData.wasteProfile}</p>
                </li>
                {/* Pre-Storage For */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Pre-Storage For:</p>
                  <p>{`${modalContenData.preStorageFor}`}</p>
                </li>
              </ul>
            ) : (
              <p>No details available</p>
            )}
          </div>

          <div className="modal-action">
            <label
              htmlFor="modal_details_pre_storage_location"
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
