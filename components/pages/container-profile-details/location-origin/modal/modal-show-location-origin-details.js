export default function ModalShowLocationOriginDetails({
  modalContenData,
  closeModal,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_origin_details"
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
              <ul>
                {Object.entries(modalContenData).map(([key, value]) => (
                  <li key={key} className="py-2">
                    <p className="font-bold">{formatKey(key)}:</p>
                    <p>{value}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No details available</p>
            )}
          </div>

          <div className="modal-action">
            <label
              htmlFor="modal_origin_details"
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
