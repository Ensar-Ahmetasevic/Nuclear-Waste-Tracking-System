"use client";

import { useState } from "react";
import PreStorageSetupDynamicFormDisplay from "./pre-storage-setup-dynamic-form-display";
import PreStorageEmployeeDropdown from "./pre-storage-employee/pre-storage-employee-dropdown";
import PreStorageLocationDropdown from "./pre-storage-locatino/pre-storage-location-dropdown";

export default function CreatePreStorageSetup() {
  const [activeButton, setActiveButton] = useState(null);

  const handleButtonClick = (buttonsData) => {
    setActiveButton(buttonsData);
  };

  return (
    <section id="preStorageSetup">
      <div className="container mx-auto flex flex-col items-center px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Info Card */}
        <div className="mb-6 w-full max-w-3xl rounded-lg bg-gradient-to-r from-base-300 to-base-200 p-4 shadow-lg sm:mb-8 sm:p-8">
          <h2 className="mb-4 text-center text-xl font-bold text-primary sm:text-2xl">
            Pre-Storage Setup Guide
          </h2>

          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-info"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg">
                Each Pre-Storage requires two key components:
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    1
                  </span>
                  <p className="font-semibold">Pre-Storage Location</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    2
                  </span>
                  <p className="font-semibold">Responsible Employee</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-base-content/80">
              Create data for both components to enable Pre-Storage Profile
              creation
            </p>
          </div>
        </div>

        {/* Dropdown Buttons */}
        <div className="m-4 flex w-full max-w-3xl flex-col justify-center gap-3 px-4 sm:m-6 sm:flex-row sm:gap-0 sm:space-x-3 sm:px-0">
          <PreStorageLocationDropdown
            activeButton={activeButton}
            OnActiveButton={handleButtonClick}
          />
          <PreStorageEmployeeDropdown
            activeButton={activeButton}
            OnActiveButton={handleButtonClick}
          />
        </div>

        <div>
          <PreStorageSetupDynamicFormDisplay
            activeButton={activeButton}
            setActiveButton={setActiveButton}
          />
        </div>
      </div>
    </section>
  );
}
