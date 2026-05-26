import { useState } from "react";

import useDeleteContainerProfileMutations from "./../../../../requests/request-container-profile/use-delete-container-profile-mutation";

import ModalShowContainerDetails from "./../components/modals/modal-show-container-details";
import ModalContainerProfilUpdate from "./../components/modals/modal-container-profile-update";

import { MdOutlineExpandMore } from "react-icons/md";
import { MdDeleteSweep } from "react-icons/md";
import { CiEdit } from "react-icons/ci";
import { TbListDetails } from "react-icons/tb";
import LoadingSpinnerButton from "./../../../shared/loading-spiner-button";
import ConfirmDelete from "./../../../shared/confirmDelete";

export default function ShowContainerDetails({ data }) {
  const [modalContenData, setModalContentData] = useState(null);
  const [openModalDetails, setOpenModalDetails] = useState(false);
  const [openModalUpdate, setOpenModalUpdate] = useState(false);
  const [title, setTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { quantity, locationOrigin, wasteProfile, containerStatus, id } = data;

  //Delete data
  const {
    mutateAsync: deleteContainerProfileMutations,
    isPending: deleteIsLoading,
  } = useDeleteContainerProfileMutations();

  //Open Delete Confirmation Modal
  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  //Confirm Delete
  const confirmDelete = async () => {
    await deleteContainerProfileMutations(id);
    setShowDeleteConfirm(false);
  };

  const containerDetails = [
    {
      title: "Waste Profile",
      name: wasteProfile?.name,
      details: wasteProfile,
    },
    {
      title: "Quantity",
      name: quantity,
      details: { quantity },
    },
    {
      title: "Location Origin",
      name: locationOrigin?.name,
      details: locationOrigin,
    },
  ];

  const handleModalDetails = (detail) => {
    setModalContentData(detail.details);
    setTitle(detail.title);
    setOpenModalDetails(true);
  };

  const handleModalUpdateContainerProfile = () => {
    setOpenModalUpdate(true);
  };

  return (
    <>
      <div>
        <div>
          <ul className="rounded-lg border-2 p-3 font-medium sm:p-4">
            <div className="mb-3 space-y-1 text-base leading-snug md:flex md:flex-row md:flex-wrap md:gap-x-2 md:gap-y-1">
              <p className="break-words">
                <span className="font-bold underline underline-offset-4">
                  {quantity}
                </span>{" "}
                <span className="font-normal">
                  {quantity === 1 ? "container" : "containers"} of type{" "}
                </span>
                <span className="font-bold underline underline-offset-4">
                  {wasteProfile.name}
                </span>
              </p>
              <p className="break-words font-normal">
                from{" "}
                <span className="font-bold underline underline-offset-4">
                  {locationOrigin.name}
                </span>
              </p>
            </div>
            <div>
              <details className="collapse collapse-arrow bg-base-200">
                <summary className="collapse-title !min-h-0 py-2 text-base font-medium leading-snug after:!top-3">
                  <div className="flex flex-row items-center gap-2">
                    <TbListDetails className="h-4 w-4 shrink-0" />
                    <span>Details</span>
                  </div>
                </summary>
                {/* Container Details */}
                <div className="collapse-content text-base">
                  {containerDetails.map((detail, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-base"
                    >
                      <p className="font-normal text-base-content/70">
                        {detail.title}
                      </p>
                      <p className="break-words font-medium">{detail.name}</p>

                      <div className="tooltip" data-tip="Extend">
                        <label
                          htmlFor="modal_container_details"
                          className="btnExtend"
                          onClick={() => handleModalDetails(detail)}
                        >
                          <MdOutlineExpandMore />
                        </label>
                      </div>
                    </li>
                  ))}
                </div>
              </details>
            </div>

            {containerStatus === "pending" || containerStatus === "rejected" ? (
              <div className="mt-4 flex justify-end space-x-2">
                {/* Edit/Update button */}
                <div className="tooltip" data-tip="Edit">
                  <label
                    htmlFor="update_modal_container_profile"
                    className="btnUpdate"
                    onClick={() => handleModalUpdateContainerProfile()}
                  >
                    <CiEdit />
                  </label>
                </div>

                {/* Delete button */}
                <div className="tooltip" data-tip="Delete">
                  <button
                    className="btnDelete flex items-center"
                    onClick={() => handleDelete()}
                    disabled={deleteIsLoading}
                  >
                    {deleteIsLoading ? (
                      <LoadingSpinnerButton />
                    ) : (
                      <MdDeleteSweep />
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </ul>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <ConfirmDelete
            setShowDeleteConfirm={setShowDeleteConfirm}
            confirmDelete={confirmDelete}
          />
        )}

        {openModalDetails ? (
          <ModalShowContainerDetails
            closeModal={() => setOpenModalDetails(false)}
            modalContenData={modalContenData}
            title={title}
          />
        ) : null}

        {openModalUpdate ? (
          <ModalContainerProfilUpdate
            closeModal={() => setOpenModalUpdate(false)}
            modalContainerProfilData={data}
          />
        ) : null}
      </div>
    </>
  );
}
