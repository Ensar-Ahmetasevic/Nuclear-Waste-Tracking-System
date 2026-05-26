export default function ModalShowContainerTypeDetails({
  modalContenData,
  title,
  closeModal,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_container_type_details"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-3xl">
          <div className="mb-6 flex flex-row space-x-4">
            <h3 className="text-lg font-bold">Details for:</h3>
            <p className="text-lg">{title} </p>
          </div>

          <ul>
            {/* Carrying Capacity */}
            <li className="py-2">
              <p className="font-bold">Carrying Capacity:</p>
              <p>{`${modalContenData.carryingCapacity} tons`}</p>
            </li>
            {/* Description */}
            <li className="py-2">
              <p className="font-bold">Description:</p>
              <p>{modalContenData.description}</p>
            </li>
            {/* Footprint */}
            <li className="py-2">
              <p className="font-bold">Footprint:</p>
              <p>{`${modalContenData.footprint} m²`}</p>
            </li>
            {/* Material */}
            <li className="py-2">
              <p className="font-bold">Material:</p>
              <p>{modalContenData.material}</p>
            </li>
            {/* Physical properties */}
            <li className="py-2">
              <p className="font-bold">Physical properties:</p>
              <p>{modalContenData.physicalProperties}</p>
            </li>
            {/* Radioactivity Level */}
            <li className="py-2">
              <p className="font-bold">Radioactivity Level:</p>
              <p>{modalContenData.radioactivityLevel}</p>
            </li>
            {/* Volume */}
            <li className="py-2">
              <p className="font-bold">Volume:</p>
              <p>{`${modalContenData.volume} m³`}</p>
            </li>
          </ul>

          <div className="modal-action">
            <label
              htmlFor="modal_container_details"
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
