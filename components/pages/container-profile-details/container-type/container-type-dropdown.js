import { useState } from "react";

import { PiCursorClickBold } from "react-icons/pi";
import { IoMdAddCircleOutline } from "react-icons/io";
import { CiEdit } from "react-icons/ci";

export default function ContainerTypeDropdown({
  OnActiveButton,
  activeButton,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddClick = () => {
    OnActiveButton("Container type Form"), setIsOpen(false);
  }; /*  */

  const handleEditDeleteClick = () => {
    OnActiveButton("Container type Table"), setIsOpen(false);
  };

  return (
    <>
      <div className="dropdown dropdown-content">
        <div
          tabIndex={0}
          role="button"
          className={`btn m-1 ${["Container type Form", "Container type Table"].includes(activeButton) ? "border-2 border-solid border-red-600" : ""}`}
          onClick={() => setIsOpen(true)}
        >
          Container type <PiCursorClickBold />
        </div>

        {isOpen ? (
          <ul
            tabIndex={0}
            className="menu dropdown-content z-[1] w-52 rounded-box bg-base-100 p-2 shadow"
          >
            <li>
              <button onClick={() => handleAddClick()}>
                Add <IoMdAddCircleOutline />
              </button>
            </li>
            <li>
              <button onClick={() => handleEditDeleteClick()}>
                Edit/Delete <CiEdit />
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </>
  );
}
