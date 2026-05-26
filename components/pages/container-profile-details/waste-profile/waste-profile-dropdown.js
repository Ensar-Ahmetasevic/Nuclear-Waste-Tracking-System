import { useState } from "react";

import { PiCursorClickBold } from "react-icons/pi";
import { IoMdAddCircleOutline } from "react-icons/io";
import { CiEdit } from "react-icons/ci";

export default function WasteProfileDropdown({ OnActiveButton, activeButton }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="dropdown dropdown-content">
        <div
          tabIndex={0}
          role="button"
          className={`btn m-1 ${["Waste profile Form", "Waste profile Table"].includes(activeButton) ? "border-2 border-solid border-red-600" : ""}`}
          onClick={() => setIsOpen(true)}
        >
          Waste profile <PiCursorClickBold />
        </div>

        {isOpen ? (
          <ul
            tabIndex={0}
            className="menu dropdown-content z-[1] w-52 rounded-box bg-base-100 p-2 shadow"
          >
            <li>
              <button
                onClick={() => {
                  OnActiveButton("Waste profile Form");
                  setIsOpen(false);
                }}
              >
                Add <IoMdAddCircleOutline />
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  OnActiveButton("Waste profile Table");
                  setIsOpen(false);
                }}
              >
                Edit/Delete <CiEdit />
              </button>
            </li>
          </ul>
        ) : null}
      </div>
      <div></div>
    </>
  );
}
