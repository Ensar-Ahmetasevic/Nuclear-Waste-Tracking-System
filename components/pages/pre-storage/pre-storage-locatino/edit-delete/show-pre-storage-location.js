import { useState } from "react";
import { useRouter } from "next/navigation";

import useDeletePreStorageLocationMutation from "../../../../../requests/request-pre-storage/request-pre-storage-location/use-delete-pre-storage-location-mutation";

import ModalShowDetailsPreStorageLocation from "../modal/modal-show-details-pre-storage-location";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { MdOutlineExpandMore } from "react-icons/md";
import ModalUpdatePreStorageLocation from "../modal/modal-update-pre-storage-location";
import ConfirmDelete from "../../../../shared/confirmDelete";

export default function ShowPreStorageLocation({ preStorageData }) {
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();

  const { mutateAsync: deleteMutateAsync } =
    useDeletePreStorageLocationMutation();

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    try {
      await deleteMutateAsync(preStorageData.id);
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
        <td>{preStorageData?.name}</td>
        <td>
          {/* Details */}
          <div className="tooltip" data-tip="Details">
            <label
              htmlFor="modal_details_pre_storage_location"
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
        <td>
          {/* Delete */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDelete
          setShowDeleteConfirm={setShowDeleteConfirm}
          confirmDelete={confirmDelete}
        />
      )}

      {/* Show Details */}
      {openModalDetails ? (
        <ModalShowDetailsPreStorageLocation
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={preStorageData}
        />
      ) : null}

      {/* Update */}
      {openModalUpdate ? (
        <ModalUpdatePreStorageLocation
          closeModal={() => setOpenModalUpdate(false)}
          modalDataPreStorageLocation={preStorageData}
        />
      ) : null}
    </>
  );
}
