import { useState, useMemo } from "react";

import ModalFinalStorageConditionsForm from "./conditions/modal/modal-final-storage-conditions-form";

import WarningMessage from "../../../../shared/warningMessage";

import CapacityDetails from "./capacity/capacity-details";
import ConditionsDetails from "./conditions/conditions-details";
import BackButton from "../../../../shared/back-button";

export default function FinalCapacityAndConditionsDetails({
  finalStorageData,
}) {
  const [isModalConditionsOpen, setIsModalConditionsOpen] = useState(false);

  // Function to toggle the visibility of a modal
  const toggelConditionsModal = () => setIsModalConditionsOpen((prev) => !prev);

  const lastCondition = finalStorageData.finalStorageConditions?.at(-1);

  const roomConditions = finalStorageData.finalStorageConditions;
  const roomSurface = finalStorageData.surfaceArea;
  const containerFootprint = finalStorageData.containerFootprint;

  // Check if finalStorageEntry exists and has items
  const hasContainers = finalStorageData.storageTransferRequests.length > 0;

  // Total sum of containers in room (only calculate if there are containers)
  const totalContainers = hasContainers ? finalStorageData.quantity : 0;

  // Calculate maximum number of containers which can fit in the hall
  const maxContainer = Math.round(roomSurface / containerFootprint);

  // Calculate of how many more containers can fit in the hall
  const freeContainers = maxContainer - totalContainers;

  // Used space in m2
  const usedSpace = totalContainers * containerFootprint;
  // Feespace in m2
  const freeSpace = roomSurface - usedSpace;

  // Used Space Percentage
  const usedSpacePercentage = Math.round((usedSpace / roomSurface) * 100);
  // Free Space finalcentage
  const freeSpacePercentage = Math.round((freeSpace / roomSurface) * 100);

  // Determining the warning message and color based on the number of free containers
  const { warningMessage, warningColor } = useMemo(() => {
    let warningMessage = "";
    let warningColor = "";

    if (freeContainers <= 5) {
      warningMessage = `Warning: Only ${freeContainers} free spots left in the hall !`;
      warningColor = "bg-red-600";
    } else if (freeContainers <= 10) {
      warningMessage = `Notice: ${freeContainers} free spots remaining in the hall.`;
      warningColor = "bg-orange-500";
    }

    return { warningMessage, warningColor };
  }, [freeContainers]);

  const dataForPieChart = [
    { name: "Free Space", value: freeSpace },
    { name: "Used Space", value: usedSpace },
  ];

  return (
    <>
      <div className="container mx-auto mt-20 flex max-w-4xl flex-col place-items-center rounded-box border-2 border-yellow-600 bg-base-300 p-6">
        {/* Back button */}
        <BackButton route={"final-storage"} />

        {/* Display the name of the final-storage location */}
        <div className="mb-10 mt-5">
          <h1 className="stat-value">{finalStorageData.name}</h1>
        </div>

        {/* Display warning message if applicable */}
        {warningMessage && (
          <WarningMessage
            warningColor={warningColor}
            warningMessage={warningMessage}
          />
        )}

       

        {/* Capacity Details */}

        <CapacityDetails
          finalStorageData={finalStorageData}
          dataForPieChart={dataForPieChart}
          freeSpacePercentage={freeSpacePercentage}
          freeSpace={freeSpace}
          freeContainers={freeContainers}
          usedSpacePercentage={usedSpacePercentage}
          usedSpace={usedSpace}
          totalContainers={totalContainers}
          roomData={finalStorageData}
        />

        {/* Divider */}
        <div className="divider divider-warning my-10">Conditions</div>

        {/* Conditions Details */}

        <ConditionsDetails
          haleConditions={lastCondition}
          toggelModal={toggelConditionsModal}
        />

        {/* Conditions modal component */}
        <ModalFinalStorageConditionsForm
          isOpen={isModalConditionsOpen}
          closeModal={() => toggelConditionsModal()}
          hallData={finalStorageData}
        />
      </div>
    </>
  );
}
