import { useState } from "react";
import { useRouter } from "next/navigation";

import useDeleteWasteProfileMutation from "./../../../../../requests/request-container-profile/request-waste-profile/use-delete-waste-profile-mutation";
import ConfirmDelete from "../../../../shared/confirmDelete";

import ModalShowWasteProfileDetails from "./../modal/modal-show-waste-profile-details";
import ModalWasteProfileDetailsUpdate from "./../modal/modal-waste-profile-details-update";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { MdOutlineExpandMore } from "react-icons/md";

export default function ShowWasteProfile({ wasteData }) {
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();

  const { mutateAsync: deleteMutateAsync } = useDeleteWasteProfileMutation();

  // await deleteMutateAsync.mutateAsync(wasteData.id);

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    try {
      await deleteMutateAsync(wasteData.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      setShowDeleteConfirm(false);
      router.refresh();
    }
  };

  return (
    <>
      {/* row */}
      <tr>
        <th></th>
        <td>{wasteData?.name}</td>
        <td>
          {/* Details */}
          <div className="tooltip" data-tip="Details">
            <label
              htmlFor="modal_waste_details"
              className="btnExtend"
              onClick={() => setOpenModalDetails(true)}
            >
              <MdOutlineExpandMore />
            </label>
          </div>
        </td>
        {/* Edit */}
        <td>
          <div className="tooltip" data-tip="Edit">
            <button
              className="btnUpdate"
              onClick={() => setOpenModalUpdate(true)}
            >
              <CiEdit />
            </button>
          </div>
        </td>
        {/* Delete */}
        <td>
          <div className="tooltip" data-tip="Delete">
            <label
              className="btnDelete flex items-center"
              onClick={() => handleDelete()}
            >
              <MdDeleteSweep />
            </label>
          </div>
        </td>
      </tr>

      {/* Show Details */}
      {openModalDetails ? (
        <ModalShowWasteProfileDetails
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={wasteData}
        />
      ) : null}

      {/* Update */}
      {openModalUpdate ? (
        <ModalWasteProfileDetailsUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalContainerTypeData={wasteData}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDelete
          setShowDeleteConfirm={setShowDeleteConfirm}
          confirmDelete={confirmDelete}
        />
      )}
    </>
  );
}
