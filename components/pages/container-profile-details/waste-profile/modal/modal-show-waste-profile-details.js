export default function ModalShowWasteProfileDetails({
  modalContenData,
  closeModal,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_waste_details"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-5xl">
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
                {/* Type Of Waste */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Type Of Waste:</p>
                  <p>{modalContenData.typeOfWaste}</p>
                </li>
                {/* Waste Description */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Waste Description:</p>
                  <p>{modalContenData.wasteDescription}</p>
                </li>
                {/* Risks And Hazards */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Risks And Hazards:</p>
                  <p>{modalContenData.risksAndHazards}</p>
                </li>
                {/* Processing Methods */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Processing Methods:</p>
                  <p>{modalContenData.processingMethods}</p>
                </li>

                {/* Physical Properties */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Physical Properties:</p>
                  <p>{modalContenData.physicalProperties}</p>
                </li>

                {/* Chemical Properties */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Chemical Properties:</p>
                  <p>{modalContenData.chemicalProperties}</p>
                </li>

                {/* Biological Properties */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Biological Properties:</p>
                  <p>{modalContenData.biologicalProperties}</p>
                </li>

                {/* Collection Procedures */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Collection Procedures:</p>
                  <p>{modalContenData.collectionProcedures}</p>
                </li>

                {/* Container Type */}
                <li className="row flex flex-row space-x-2">
                  <p className="font-bold">Container Type:</p>
                  <p>{modalContenData.containerType.name}</p>
                </li>
              </ul>
            ) : (
              <p>No details available</p>
            )}
          </div>

          <div className="modal-action">
            <label
              htmlFor="modal_waste_details"
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

// Helper function to format keys

/* formatKey function: This function formats the key from the object to make it
easier to read. Adds spaces before uppercase letters and converts first letters to
uppercase. */

function formatKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, function (str) {
    return str.toUpperCase();
  });
}
