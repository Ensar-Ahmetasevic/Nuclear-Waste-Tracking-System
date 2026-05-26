import FormContainerProfile from "./../forms/form-container-profile";

export default function ModalContainerForm({ closeModal, shippingID }) {
  return (
    <>
      <input
        type="checkbox"
        id="modal_container_form"
        className="modal-toggle"
      />
      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-3xl">
          <FormContainerProfile
            closeModal={closeModal}
            shippingID={shippingID}
          />

          <div className="modal-action">
            <label
              htmlFor="modal_container_form"
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
