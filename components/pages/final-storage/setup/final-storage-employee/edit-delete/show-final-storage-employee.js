import { useState } from "react";
import { useRouter } from "next/navigation";

import useDeleteFinalStorageEmployeeMutation from "./../../../../../../requests/request-final-storage/request-final-storage-employee/use-delete-final-storage-employee-mutation";
import ConfirmDelete from "./../../../../../shared/confirmDelete";

import ModalShowDetailsFinalStorageEmployee from "./../modal/modal-show-details-final-storage-employee";
import ModalUpdateFinalStorageEmployee from "./../modal/modal-update-final-storage-employee";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { MdOutlineExpandMore } from "react-icons/md";

export default function ShowFinalStorageEmployee({ finalStorageData }) {
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();

  const { mutateAsync: deleteMutateAsync } =
    useDeleteFinalStorageEmployeeMutation();

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    try {
      await deleteMutateAsync(finalStorageData.id);
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
        <td>{finalStorageData?.name}</td>

        <td>
          {/* Details */}
          <div className="tooltip" data-tip="Details">
            <label
              htmlFor="modal_details_final_storage_employee"
              className="btnExtend"
              onClick={() => setOpenModalDetails(true)}
            >
              <MdOutlineExpandMore />
            </label>
          </div>
        </td>
        <td>
          {/* Edit */}
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
        <ModalShowDetailsFinalStorageEmployee
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={finalStorageData}
        />
      ) : null}

      {/* Update */}
      {openModalUpdate ? (
        <ModalUpdateFinalStorageEmployee
          closeModal={() => setOpenModalUpdate(false)}
          modalDataFinalStorageEmployee={finalStorageData}
        />
      ) : null}
    </>
  );
}
