import { useState } from "react";
import { useRouter } from "next/navigation";

import useDeletePreStorageEmployeeMutation from "../../../../../requests/request-pre-storage/request-pre-storage-employee/use-delete-pre-storage-employee-mutation";
import ConfirmDelete from "../../../../shared/confirmDelete";

import ModalShowDetailsPreStorageEmployee from "./../modal/modal-show-details-pre-storage-employee";
import ModalUpdatePreStorageEmployee from "./../modal/modal-update-pre-storage-employee";

import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { MdOutlineExpandMore } from "react-icons/md";

export default function ShowPreStorageEmployee({ preStorageData }) {
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();

  const { mutateAsync: deleteMutateAsync } =
    useDeletePreStorageEmployeeMutation();

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
              htmlFor="modal_details_pre_storage_employee"
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
        <ModalShowDetailsPreStorageEmployee
          closeModal={() => setOpenModalDetails(false)}
          modalContenData={preStorageData}
        />
      ) : null}

      {/* Update */}
      {openModalUpdate ? (
        <ModalUpdatePreStorageEmployee
          closeModal={() => setOpenModalUpdate(false)}
          modalDataPreStorageEmployee={preStorageData}
        />
      ) : null}
    </>
  );
}
