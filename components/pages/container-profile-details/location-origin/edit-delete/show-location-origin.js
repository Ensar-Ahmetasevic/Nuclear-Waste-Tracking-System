import { useState } from "react";
import { useRouter } from "next/navigation";

import useDeleteLocationOriginMutation from "./../../../../../requests/request-container-profile/request-location-origin/use-delete-location-origin-mutation";

import ModalLocationOriginDetailsUpdate from "./../modal/modal-location-origin-details-update";
import ModalShowLocationOriginDetails from "./../modal/modal-show-location-origin-details";
import ConfirmDelete from "../../../../shared/confirmDelete";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { MdOutlineExpandMore } from "react-icons/md";

export default function ShowLocationOrigin({ originData }) {
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();

  const { mutateAsync: deleteMutateAsync } = useDeleteLocationOriginMutation();

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    try {
      await deleteMutateAsync(originData.id);
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
        <td>{originData?.name}</td>
        {/* Details */}
        <td>
          <div className="tooltip" data-tip="Details">
            <label
              htmlFor="modal_origin_details"
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
        <ModalShowLocationOriginDetails
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={originData}
        />
      ) : null}

      {/* Update */}
      {openModalUpdate ? (
        <ModalLocationOriginDetailsUpdate
          closeModal={() => setOpenModalUpdate(false)}
          modalContainerTypeData={originData}
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
