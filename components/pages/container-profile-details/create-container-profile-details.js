"use client";

import { useState } from "react";

import ContainerTypeDropdown from "./container-type/container-type-dropdown";
import DynamicFormDisplay from "./dynamic-form-display";
import WasteProfileDropdown from "./waste-profile/waste-profile-dropdown";
import LocationOriginDropdown from "./location-origin/location-origin-dropdown";

export default function CreateContainerProfileDetails() {
  const [activeButton, setActiveButton] = useState(null);

  const handleButtonClick = (buttonsData) => {
    setActiveButton(buttonsData);
  };

  return (
    <section id="containerProfileSetup">
      <div className="container mx-auto flex flex-col items-center px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Info Card */}
        <div className="mb-6 w-full max-w-3xl rounded-lg bg-gradient-to-r from-base-300 to-base-200 p-4 shadow-lg sm:mb-8 sm:p-8">
          <h2 className="mb-4 text-center text-xl font-bold text-primary sm:text-2xl">
            Container Profile Setup Guide
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
                Each Container Profile requires three key components:
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex flex-col items-start space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    1
                  </span>
                  <p className="font-semibold">Location Origin</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    2
                  </span>
                  <p className="font-semibold">Waste Profile</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm text-white">
                    3
                  </span>
                  <p className="font-semibold">Container Type</p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-base-content/80">
              Create data for all components to enable Container Profile
              creation
            </p>
          </div>
        </div>

        {/* Dropdown Buttons */}
        <div className="m-4 flex w-full max-w-3xl flex-col justify-center gap-3 px-4 sm:m-6 sm:flex-row sm:gap-0 sm:space-x-3 sm:px-0">
          <LocationOriginDropdown
            activeButton={activeButton}
            OnActiveButton={handleButtonClick}
          />
          <WasteProfileDropdown
            activeButton={activeButton}
            OnActiveButton={handleButtonClick}
          />
          <ContainerTypeDropdown
            activeButton={activeButton}
            OnActiveButton={handleButtonClick}
          />
        </div>

        <div>
          <DynamicFormDisplay
            activeButton={activeButton}
            setActiveButton={setActiveButton}
          />
        </div>
      </div>
    </section>
  );
}
