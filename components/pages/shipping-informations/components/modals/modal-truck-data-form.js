import FormTruckData from "../forms/form-truck-data";

export default function ModalTruckDataForm({ closeModal, onSubmitForm }) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_truck_data"
        className="modal-toggle"
        checked={true}
        readOnly
      />
      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-5xl">
          <FormTruckData onSubmitForm={onSubmitForm} />
          <div className="modal-action">
            <label
              htmlFor="modal_truck_data"
              className="btnCancel"
              onClick={() => closeModal()}
            >
              Cancel
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
